import { expect, type Locator, type Page, test } from "@playwright/test";

type DotWindow = Window & {
  dotProbe: { frames: number; positions: [number, number][]; ink: string };
};

// Observe the actual paint commands, without replacing the physics or its clock.
const observePaint = (page: Page) =>
  page.addInitScript(() => {
    const probe = { frames: 0, positions: [] as [number, number][], ink: "" };
    (window as unknown as DotWindow).dotProbe = probe;
    const prototype = CanvasRenderingContext2D.prototype;
    const clear = prototype.clearRect;
    const arc = prototype.arc;
    prototype.clearRect = function (...args) {
      if (this.canvas.classList.contains("dot-field")) {
        probe.frames++;
        probe.positions = [];
        probe.ink = String(this.fillStyle);
      }
      clear.apply(this, args);
    };
    prototype.arc = function (...args) {
      if (this.canvas.classList.contains("dot-field"))
        probe.positions.push([args[0], args[1]]);
      arc.apply(this, args);
    };
  });

const settle = (page: Page) =>
  page.evaluate(async () => {
    let previous = -1;
    let still = 0;
    for (let count = 0; count < 180; count++) {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
      const current = (window as unknown as DotWindow).dotProbe.frames;
      still = current === previous ? still + 1 : 0;
      if (still === 5) return;
      previous = current;
    }
    throw new Error("Dot motion never settled.");
  });

const move = (surface: Locator, pointerType = "mouse") =>
  surface.evaluate((element, type) => {
    const box = element.getBoundingClientRect();
    element.dispatchEvent(
      new PointerEvent("pointermove", {
        pointerType: type,
        clientX: box.left + 120,
        clientY: box.top + 120,
        buttons: 0,
      }),
    );
  }, pointerType);

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

test("individual dots flee the mouse locally while text and distant dots stay fixed", async ({
  page,
}, testInfo) => {
  await observePaint(page);
  await page.goto("/");
  await page.evaluate(async () => {
    await document.fonts.ready;
    document.documentElement.style.scrollBehavior = "auto";
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
    const before = await heading.boundingBox();
    const bounds = await surface.boundingBox();
    if (!bounds) throw new Error("Expected a dotted section.");
    const paintBounds = await surface.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const left = parseFloat(style.borderLeftWidth);
      const right = parseFloat(style.borderRightWidth);
      const top = parseFloat(style.borderTopWidth);
      const bottom = parseFloat(style.borderBottomWidth);
      return {
        x: box.left + left,
        y: box.top + top,
        width: box.width - left - right,
        height: box.height - top - bottom,
      };
    });
    const input = await surface.evaluateHandle((element) => {
      const point = { x: 0, y: 0 };
      element.addEventListener(
        "pointermove",
        (event) => {
          const box = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          point.x =
            (event as PointerEvent).clientX -
            box.left -
            parseFloat(style.borderLeftWidth);
          point.y =
            (event as PointerEvent).clientY -
            box.top -
            parseFloat(style.borderTopWidth);
        },
        { once: true },
      );
      return point;
    });
    await surface.hover({ position: { x: 88, y: bounds.height * 0.5 } });
    const cursor = await input.jsonValue();
    await input.dispose();
    await expect(surface.locator("canvas.dot-field")).toHaveCount(1);
    await settle(page);
    const paint = await page.evaluate(
      () => (window as unknown as DotWindow).dotProbe,
    );
    const step = await page.evaluate(() =>
      parseFloat(getComputedStyle(document.documentElement).fontSize),
    );
    const columns = Math.ceil((paintBounds.width - step / 2) / step);
    let moved = 0;
    let fixed = 0;
    let largest = 0;
    paint.positions.forEach(([x, y], index) => {
      const homeX = ((index % columns) + 0.5) * step;
      const homeY = (Math.floor(index / columns) + 0.5) * step;
      const dx = homeX - cursor.x;
      const dy = homeY - cursor.y;
      const distance = Math.hypot(dx, dy);
      const travel = Math.hypot(x - homeX, y - homeY);
      largest = Math.max(largest, travel);
      expect(travel).toBeLessThanOrEqual(step * 3 + 0.01);
      if (distance >= step * 7) {
        expect(travel).toBe(0);
        fixed++;
      } else if (travel > 0.1) {
        expect((x - homeX) * dx + (y - homeY) * dy).toBeGreaterThan(0);
        moved++;
      }
    });
    expect(moved).toBeGreaterThan(60);
    expect(fixed).toBeGreaterThan(moved);
    expect(largest).toBeGreaterThan(35);
    expect(await heading.boundingBox()).toEqual(before);
    const canvasBounds = await surface.locator("canvas").boundingBox();
    if (!canvasBounds) throw new Error("Expected a visible dot field.");
    // Firefox reports fractional element bounds at float32 precision.
    for (const key of ["x", "y", "width", "height"] as const)
      expect(canvasBounds[key]).toBeCloseTo(paintBounds[key], 3);
    await expect(surface).toHaveCSS("background-image", "none");
    await expect(surface.locator("canvas")).toHaveCSS("pointer-events", "none");
    await expect(surface.locator("canvas")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(
      await surface
        .locator("canvas")
        .evaluate((canvas) => canvas.matches(".zoom-ready, .is-zooming")),
    ).toBe(false);
    if (id === "intro")
      await page.screenshot({
        path: testInfo.outputPath("mouse-repulsion.png"),
      });
    await page.mouse.move(0, 0);
    await expect(surface.locator("canvas")).toHaveCount(0);
    await expect(surface).toHaveCSS("background-image", /radial-gradient/);
  }
  expect(errors).toEqual([]);
  await expect(page.locator(".part-orb, .part-rail")).toHaveCount(0);
});

test("movement is batched, returns smoothly, and stops painting at rest", async ({
  page,
}) => {
  await observePaint(page);
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  const result = await page.locator("#intro").evaluate(async (surface) => {
    const original = surface.getBoundingClientRect.bind(surface);
    const box = original();
    let reads = 0;
    surface.getBoundingClientRect = () => {
      reads++;
      return original();
    };
    for (let index = 0; index < 100; index++)
      surface.dispatchEvent(
        new PointerEvent("pointermove", {
          pointerType: "mouse",
          clientX: box.left + 120,
          clientY: box.top + 120,
        }),
      );
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
    const batchReads = reads;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
    const settlingReads = reads - batchReads;
    surface.getBoundingClientRect = original;
    return { batchReads, settlingReads };
  });
  expect(result).toEqual({ batchReads: 1, settlingReads: 0 });
  await settle(page);
  const stable = await page.evaluate(
    () => (window as unknown as DotWindow).dotProbe.frames,
  );
  await settle(page);
  expect(
    await page.evaluate(() => (window as unknown as DotWindow).dotProbe.frames),
  ).toBe(stable);
  const release = await page.locator("#intro").evaluate(async (surface) => {
    const probe = (window as unknown as DotWindow).dotProbe;
    const before = probe.positions.map(([x, y]) => [x, y]);
    surface.dispatchEvent(
      new PointerEvent("pointerleave", { pointerType: "mouse" }),
    );
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
    return {
      before,
      after: probe.positions,
      canvasPresent: !!surface.querySelector("canvas"),
    };
  });
  expect(release.canvasPresent).toBe(true);
  expect(release.after).not.toEqual(release.before);
  // A near dot moves partway home, not straight back in a single frame.
  const columns = 80;
  const index = 7 * columns + 8;
  const home = [136, 120];
  const displacement = (position: number[]) =>
    Math.hypot(
      Number(position[0]) - Number(home[0]),
      Number(position[1]) - Number(home[1]),
    );
  expect(displacement(release.after[index] ?? [])).toBeGreaterThan(0);
  expect(displacement(release.after[index] ?? [])).toBeLessThan(
    displacement(release.before[index] ?? []),
  );
  await expect(page.locator("canvas.dot-field")).toHaveCount(0);
  await settle(page);
  const complete = await page.evaluate(
    () => (window as unknown as DotWindow).dotProbe.frames,
  );
  await settle(page);
  expect(
    await page.evaluate(() => (window as unknown as DotWindow).dotProbe.frames),
  ).toBe(complete);
});

test("queued pointer work is canceled on leaving, pressing, navigation, and resizing", async ({
  page,
}) => {
  await observePaint(page);
  await page.goto("/");
  const results = await page.locator("#intro").evaluate(async (surface) => {
    const results = [];
    const bounds = surface.getBoundingClientRect();
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
      const count = (window as unknown as DotWindow).dotProbe.frames;
      surface.dispatchEvent(
        new PointerEvent("pointermove", {
          pointerType: "mouse",
          clientX: bounds.left + 120,
          clientY: bounds.top + 120,
        }),
      );
      const target = ["scroll", "resize", "blur"].includes(type)
        ? window
        : ["focusin", "visibilitychange"].includes(type)
          ? document
          : surface;
      target.dispatchEvent(new Event(type));
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
      results.push({
        type,
        paints: (window as unknown as DotWindow).dotProbe.frames - count,
        canvas: !!surface.querySelector("canvas"),
      });
    }
    return results;
  });
  for (const result of results)
    expect(result, result.type).toMatchObject({ paints: 0, canvas: false });
});

test("preferences and visibility restore the static pattern without stale replay", async ({
  page,
  browserName,
}) => {
  await observePaint(page);
  await page.goto("/");
  const surface = page.locator("#intro");
  await move(surface);
  await expect(surface.locator("canvas")).toHaveCount(1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(surface.locator("canvas")).toHaveCount(0);
  await move(surface);
  await settleMedia(page);
  await expect(surface).toHaveCSS("background-image", /radial-gradient/);
  await expect(surface.locator("canvas")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await settleMedia(page);
  await expect(surface.locator("canvas")).toHaveCount(0);
  await move(surface);
  await expect(surface.locator("canvas")).toHaveCount(1);
  for (const hidden of [true, false]) {
    await page.evaluate((value) => {
      Object.defineProperty(document, "hidden", { configurable: true, value });
      document.dispatchEvent(new Event("visibilitychange"));
    }, hidden);
    await expect(surface.locator("canvas")).toHaveCount(0);
  }
  await move(surface);
  await expect(surface.locator("canvas")).toHaveCount(1);
  await page.emulateMedia({ media: "print" });
  await expect(surface.locator("canvas")).toHaveCount(0);
  await expect(surface).toHaveCSS("background-image", "none");
  await page.emulateMedia({ media: "screen" });
  await settleMedia(page);
  await expect(surface.locator("canvas")).toHaveCount(0);
  if (browserName === "chromium") {
    await move(surface);
    await expect(surface.locator("canvas")).toHaveCount(1);
    await page.emulateMedia({ forcedColors: "active" });
    await expect(surface.locator("canvas")).toHaveCount(0);
    await page.emulateMedia({ forcedColors: "none" });
    await settleMedia(page);
  }
  for (const type of ["touch", "pen"]) {
    await move(surface, type);
    await settleMedia(page);
    await expect(surface.locator("canvas")).toHaveCount(0);
  }
});

test("active paint retires on scrolling, resizing, blur, and keyboard focus", async ({
  page,
}) => {
  await observePaint(page);
  await page.goto("/");
  const surface = page.locator("#intro");
  for (const type of ["scroll", "resize", "blur"]) {
    await move(surface);
    await expect(surface.locator("canvas")).toHaveCount(1);
    await page.evaluate(
      (event) => window.dispatchEvent(new Event(event)),
      type,
    );
    await expect(surface.locator("canvas")).toHaveCount(0);
    await settle(page);
    await expect(surface).toHaveCSS("background-image", /radial-gradient/);
  }
  await move(surface);
  await expect(surface.locator("canvas")).toHaveCount(1);
  const link = page.getByRole("link", { name: "See my work", exact: true });
  await link.focus();
  await expect(surface.locator("canvas")).toHaveCount(0);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#work$/);
});

test("exact dot hits and a new pointer position stay finite and continuous", async ({
  page,
}) => {
  await observePaint(page);
  await page.goto("/");
  const surface = page.locator("#intro");
  await surface.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const top = parseFloat(getComputedStyle(element).borderTopWidth);
    element.dispatchEvent(
      new PointerEvent("pointermove", {
        pointerType: "mouse",
        clientX: bounds.left + 120,
        clientY: bounds.top + top + 120,
      }),
    );
  });
  await expect(surface.locator("canvas")).toHaveCount(1);
  await settle(page);
  const result = await surface.evaluate(async (element) => {
    const probe = (window as unknown as DotWindow).dotProbe;
    const index = 7 * 80 + 7;
    const first = probe.positions[index];
    const canvas = element.querySelector("canvas");
    const bounds = element.getBoundingClientRect();
    const top = parseFloat(getComputedStyle(element).borderTopWidth);
    element.dispatchEvent(
      new PointerEvent("pointermove", {
        pointerType: "mouse",
        clientX: bounds.left + 184,
        clientY: bounds.top + top + 120,
      }),
    );
    const immediate = probe.positions[index];
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
    return {
      first,
      immediate,
      next: probe.positions[index],
      sameCanvas: canvas === element.querySelector("canvas"),
    };
  });
  expect(result.first).toEqual([168, 120]);
  expect(result.immediate).toEqual(result.first);
  expect(result.sameCanvas).toBe(true);
  expect(result.next?.[0]).toBeLessThan(168);
  expect(result.next?.[0]).toBeGreaterThan(120);
  await settle(page);
  const coordinates = await page.evaluate(() =>
    (window as unknown as DotWindow).dotProbe.positions.flat(),
  );
  expect(coordinates.every(Number.isFinite)).toBe(true);
});

test.describe("large high-density display", () => {
  test.use({ viewport: { width: 3840, height: 1400 }, deviceScaleFactor: 2 });
  test("bounds drawing memory without changing grid or layout", async ({
    page,
  }) => {
    await observePaint(page);
    await page.goto("/");
    await move(page.locator("#intro"));
    const canvas = page.locator("#intro canvas");
    await expect(canvas).toHaveCount(1);
    const size = await canvas.evaluate((element) => {
      if (!(element instanceof HTMLCanvasElement))
        throw new Error("Expected the dot canvas.");
      return {
        width: element.width,
        height: element.height,
        cssWidth: element.getBoundingClientRect().width,
      };
    });
    expect(size.width * size.height).toBeLessThan(4_010_000);
    expect(size.cssWidth).toBe(3840);
    await settle(page);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    );
    expect(overflow).toBe(false);
  });
});

test("missing canvas support preserves the static dots and native links", async ({
  page,
}) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null;
  });
  await page.goto("/");
  await move(page.locator("#intro"));
  await settleMedia(page);
  await expect(page.locator("canvas.dot-field")).toHaveCount(0);
  await expect(page.locator("#intro")).toHaveCSS(
    "background-image",
    /radial-gradient/,
  );
  await page.getByRole("link", { name: "See my work", exact: true }).click();
  await expect(page).toHaveURL(/#work$/);
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
    await settleMedia(page);
    await expect(surface.locator("canvas")).toHaveCount(0);
    await expect(surface).toHaveCSS("background-image", /radial-gradient/);
    await page.screenshot({ path: testInfo.outputPath("mobile-dots.png") });
    await page.getByRole("link", { name: "See my work", exact: true }).tap();
    await expect(page).toHaveURL(/#work$/);
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
    await expect(surface.locator("canvas")).toHaveCount(0);
    await expect(surface).toHaveCSS("background-image", /radial-gradient/);
    const link = page.getByRole("link", { name: "See my work", exact: true });
    await link.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#work$/);
  });
});
