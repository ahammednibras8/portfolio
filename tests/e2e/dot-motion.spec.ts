import { expect, type Locator, type Page, test } from "@playwright/test";

const offset = (surface: Locator) =>
  surface.evaluate((element) => ({
    x: (element as HTMLElement).style.getPropertyValue("--dots-x"),
    y: (element as HTMLElement).style.getPropertyValue("--dots-y"),
  }));

const move = (surface: Locator, pointerType = "mouse") =>
  surface.dispatchEvent("pointermove", {
    pointerType,
    clientX: 1000,
    clientY: 300,
    buttons: 0,
  });

// Media-query change events arrive after the emulation command resolves.
const settleMedia = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );

test.use({
  viewport: { width: 1280, height: 900 },
  reducedMotion: "no-preference",
});

test("mouse movement gently shifts only the existing dot texture", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await document.fonts.ready;
    document.documentElement.style.scrollBehavior = "auto";
    // Isolate pointer feedback from arrival-induced scroll anchoring in Firefox.
    for (const piece of document.querySelectorAll(".zoom-ready"))
      piece.classList.remove("zoom-ready");
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const id of ["intro", "cascade", "architecture"]) {
    const surface = page.locator(`#${id}`);
    await surface.scrollIntoViewIfNeeded();
    await settleMedia(page);
    const heading = surface.locator("h1, h2");
    await expect(heading).toHaveCSS("scale", "none");
    const before = await heading.boundingBox();
    const bounds = await surface.boundingBox();
    if (!bounds) throw new Error("Expected the dotted section.");
    const original = await surface.evaluate((element) => {
      const style = getComputedStyle(element);
      return { image: style.backgroundImage, size: style.backgroundSize };
    });
    for (const fraction of [0.8, 0.2]) {
      await surface.hover({
        position: { x: bounds.width * fraction, y: bounds.height * 0.45 },
      });
      await expect
        .poll(async () => parseFloat((await offset(surface)).x))
        .toBeCloseTo((fraction - 0.5) * 12, 1);
      const target = await offset(surface);
      expect(Math.abs(parseFloat(target.x))).toBeLessThanOrEqual(6);
      expect(Math.abs(parseFloat(target.y))).toBeLessThanOrEqual(6);
      await expect(surface).toHaveCSS(
        "background-position",
        `${parseFloat(target.x)}px ${parseFloat(target.y)}px`,
      );
      await expect(surface).toHaveCSS("background-image", original.image);
      await expect(surface).toHaveCSS("background-size", original.size);
      await expect(surface).toHaveCSS("transition-duration", "0.24s");
      await expect(surface).toHaveCSS("animation-name", "none");
      expect(original.image.split("radial-gradient")).toHaveLength(2);
      expect(await heading.boundingBox()).toEqual(before);
    }
    if (id === "intro")
      await page.screenshot({ path: testInfo.outputPath("mouse-dots.png") });
    await page.mouse.move(0, 0);
    await expect.poll(() => offset(surface)).toEqual({ x: "", y: "" });
    await expect(surface).toHaveCSS("background-position", "0px 0px");
    expect(
      await surface.evaluate((element) => element.getAnimations().length),
    ).toBe(0);
  }
  expect(errors).toEqual([]);
  await expect(page.locator(".part-orb, canvas, .part-rail")).toHaveCount(0);
});

test("pointer work is batched, idle-free, and canceled before queued frames run", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.locator("#intro").evaluate(async (element) => {
    await document.fonts.ready;
    const surface = element as HTMLElement;
    const original = surface.getBoundingClientRect.bind(surface);
    let reads = 0;
    surface.getBoundingClientRect = () => {
      reads++;
      return original();
    };
    const frame = () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const fire = () =>
      surface.dispatchEvent(
        new PointerEvent("pointermove", {
          pointerType: "mouse",
          clientX: 1000,
          clientY: 300,
          buttons: 0,
        }),
      );
    for (let index = 0; index < 100; index++) fire();
    await frame();
    const batchReads = reads;
    const active = surface.style.getPropertyValue("--dots-x");
    await frame();
    await frame();
    const idleReads = reads - batchReads;
    const cancellations = [];
    for (const type of [
      "pointerleave",
      "pointercancel",
      "pointerdown",
      "scroll",
      "resize",
      "blur",
      "focusin",
      "visibilitychange",
    ]) {
      reads = 0;
      fire();
      const target = ["scroll", "resize", "blur"].includes(type)
        ? window
        : ["focusin", "visibilitychange"].includes(type)
          ? document
          : surface;
      target.dispatchEvent(new Event(type));
      await frame();
      cancellations.push({
        type,
        reads,
        x: surface.style.getPropertyValue("--dots-x"),
      });
    }
    surface.getBoundingClientRect = original;
    return { batchReads, active, idleReads, cancellations };
  });
  expect(result.batchReads).toBe(1);
  expect(parseFloat(result.active)).toBeGreaterThan(0);
  expect(result.idleReads).toBe(0);
  for (const cancellation of result.cancellations) {
    expect(cancellation.reads, cancellation.type).toBe(0);
    expect(cancellation.x, cancellation.type).toBe("");
  }
});

test("preferences and visibility reset the texture without stale replay", async ({
  page,
  browserName,
}) => {
  await page.goto("/");
  const surface = page.locator("#intro");
  await move(surface);
  await expect.poll(async () => (await offset(surface)).x).not.toBe("");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => offset(surface)).toEqual({ x: "", y: "" });
  await move(surface);
  await expect(surface).toHaveCSS("transition-duration", "0s");
  await expect.poll(() => offset(surface)).toEqual({ x: "", y: "" });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await settleMedia(page);
  expect(await offset(surface)).toEqual({ x: "", y: "" });
  await move(surface);
  await expect.poll(async () => (await offset(surface)).x).not.toBe("");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await move(surface);
  expect(await offset(surface)).toEqual({ x: "", y: "" });
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(await offset(surface)).toEqual({ x: "", y: "" });
  await move(surface);
  await expect.poll(async () => (await offset(surface)).x).not.toBe("");
  await page.emulateMedia({ media: "print" });
  await expect.poll(() => offset(surface)).toEqual({ x: "", y: "" });
  await expect(surface).toHaveCSS("background-image", "none");
  await page.emulateMedia({ media: "screen" });
  await settleMedia(page);
  expect(await offset(surface)).toEqual({ x: "", y: "" });
  if (browserName === "chromium") {
    await move(surface);
    await expect.poll(async () => (await offset(surface)).x).not.toBe("");
    await page.emulateMedia({ forcedColors: "active" });
    await expect.poll(() => offset(surface)).toEqual({ x: "", y: "" });
    await expect(surface).toHaveCSS("transition-duration", "0s");
    await page.emulateMedia({ forcedColors: "none" });
    await settleMedia(page);
    expect(await offset(surface)).toEqual({ x: "", y: "" });
  }
  for (const type of ["touch", "pen"]) {
    await move(surface, type);
    expect(await offset(surface)).toEqual({ x: "", y: "" });
  }
});

test.describe("touch-only dot texture", () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  test("stays static while native navigation and scrolling remain available", async ({
    page,
    browserName,
  }, testInfo) => {
    test.skip(
      browserName !== "chromium",
      "Coarse pointer emulation uses Chromium.",
    );
    await page.goto("/");
    const surface = page.locator("#intro");
    await move(surface);
    await move(surface, "touch");
    await expect(surface).toHaveCSS("transition-duration", "0s");
    expect(await offset(surface)).toEqual({ x: "", y: "" });
    await page.screenshot({ path: testInfo.outputPath("mobile-dots.png") });
    await page.getByRole("link", { name: "See my work", exact: true }).tap();
    await expect(page).toHaveURL(/#work$/);
    expect(await offset(surface)).toEqual({ x: "", y: "" });
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("keeps the original single-layer dots and working links", async ({
    page,
  }) => {
    await page.goto("/");
    const surface = page.locator("#intro");
    await surface.hover({ position: { x: 1000, y: 300 } });
    expect(await offset(surface)).toEqual({ x: "", y: "" });
    await expect(surface).toHaveCSS("background-position", "0px 0px");
    const link = page.getByRole("link", { name: "See my work", exact: true });
    await link.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#work$/);
  });
});
