import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { freezeCssMotion } from "../helpers/motion";

const cards = "#contact .route-link";

test("all four contact cards fill behind their content without changing geometry", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/#contact");
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
  });
  await expect(page.locator(cards)).toHaveCount(4);
  for (const card of await page.locator(cards).all()) {
    const result = await card.evaluate(async (element) => {
      if (!(element instanceof HTMLAnchorElement))
        throw new Error("Expected a contact link.");
      const size = [element.offsetWidth, element.offsetHeight];
      const ink = [...element.querySelectorAll("h3, .route-action")].map(
        (node) => getComputedStyle(node).color,
      );
      void getComputedStyle(element).backgroundSize;
      element.focus();
      const sweep = element
        .getAnimations()
        .find(
          (animation) =>
            animation instanceof CSSTransition &&
            animation.transitionProperty === "background-size",
        );
      if (!sweep?.effect)
        throw new Error("Expected the contact fill transition.");
      sweep.pause();
      await sweep.ready;
      const duration = Number(sweep.effect.getTiming().duration);
      const samples = [0, 0.5, 1].map((progress) => {
        sweep.currentTime = duration * progress;
        return {
          progress: parseFloat(getComputedStyle(element).backgroundSize),
          size: [element.offsetWidth, element.offsetHeight],
          ink: [...element.querySelectorAll("h3, .route-action")].map(
            (node) => getComputedStyle(node).color,
          ),
        };
      });
      sweep.finish();
      return { duration, size, ink, samples };
    });
    expect(result.duration).toBeCloseTo(640, 3);
    expect(result.samples[0]?.progress).toBe(0);
    expect(result.samples[1]?.progress).toBeGreaterThan(0);
    expect(result.samples[1]?.progress).toBeLessThan(180);
    expect(result.samples[2]?.progress).toBe(180);
    for (const sample of result.samples) {
      expect(sample.size).toEqual(result.size);
      expect(sample.ink).toEqual(result.ink);
    }
    await expect(card).toHaveCSS("background-image", /radial-gradient/);
    await expect(card).toHaveCSS("background-clip", "padding-box");
    await expect(card).toHaveCSS("background-position", /^100% 0(?:px|%)$/);
    await expect(card).toHaveCSS("outline-style", "solid");
    await expect(card.locator(".sticker")).toHaveCSS(
      "background-color",
      "rgb(1, 58, 99)",
    );
    await expect(card.locator(".sticker")).toHaveCSS(
      "color",
      "rgb(255, 255, 255)",
    );
    await card.evaluate((element) => element.blur());
    await expect(card).toHaveCSS("background-size", "0% 0%");
    await expect(card.locator(".sticker")).toHaveCSS(
      "background-color",
      "rgb(143, 216, 220)",
    );
    await expect(card.locator(".sticker")).toHaveCSS("color", "rgb(1, 58, 99)");
  }
});

test("an interrupted wash reverses and re-enters from its current paint", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/#contact");
  const card = page.locator(cards).first();
  const result = await card.evaluate(async (element) => {
    const size = () => parseFloat(getComputedStyle(element).backgroundSize);
    const transition = async () => {
      const motion = element
        .getAnimations()
        .find(
          (animation) =>
            animation instanceof CSSTransition &&
            animation.transitionProperty === "background-size",
        );
      if (!motion?.effect) throw new Error("Expected the wash transition.");
      motion.pause();
      await motion.ready;
      return motion;
    };
    void size();
    element.focus();
    const entry = await transition();
    entry.currentTime = Number(entry.effect?.getTiming().duration) * 0.4;
    const entryPaint = size();
    element.blur();
    const exit = await transition();
    exit.currentTime = 0;
    const exitStart = size();
    exit.currentTime = Number(exit.effect?.getTiming().duration) / 2;
    const exitPaint = size();
    element.focus();
    const reentry = await transition();
    reentry.currentTime = 0;
    const reentryStart = size();
    reentry.finish();
    return { entryPaint, exitStart, exitPaint, reentryStart };
  });
  expect(result.entryPaint).toBeGreaterThan(0);
  expect(result.entryPaint).toBeLessThan(180);
  expect(result.exitStart).toBeCloseTo(result.entryPaint, 3);
  expect(result.exitPaint).toBeGreaterThan(0);
  expect(result.exitPaint).toBeLessThan(result.exitStart);
  expect(result.reentryStart).toBeCloseTo(result.exitPaint, 3);
  await expect(card).toHaveCSS("background-size", "180% 180%");
});

for (const width of [1280, 390]) {
  test(`the soft wash stays inside the rounded contact card at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await freezeCssMotion(page, "#contact .lucide.icon-active > *");
    await page.goto("/#contact");
    await page.evaluate(() => document.fonts.ready);
    const card = page.locator(cards).first();
    await card.scrollIntoViewIfNeeded();
    const wash = await card.evaluateHandle(async (element) => {
      void getComputedStyle(element).backgroundSize;
      element.focus();
      const animations = element.getAnimations({ subtree: true });
      const fill = animations.find(
        (animation) =>
          animation instanceof CSSTransition &&
          animation.transitionProperty === "background-size",
      );
      if (!fill?.effect) throw new Error("Expected a contact wash.");
      for (const animation of animations) {
        if (animation instanceof CSSTransition && animation !== fill)
          animation.finish();
      }
      fill.pause();
      await fill.ready;
      fill.currentTime = 0;
      return fill;
    });
    const box = await card.boundingBox();
    if (!box) throw new Error("Expected a visible card.");
    const clip = {
      x: Math.floor(box.x - 6),
      y: Math.floor(box.y - 6),
      width: Math.ceil(box.width + 13),
      height: Math.ceil(box.height + 13),
    };
    const baseline = await sharp(await page.screenshot({ clip, scale: "css" }))
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    for (const fraction of [0.35, 0.65, 1]) {
      await wash.evaluate((animation, progress) => {
        animation.currentTime =
          Number(animation.effect?.getTiming().duration) * progress;
      }, fraction);
      const screenshot = await page.screenshot({
        clip,
        scale: "css",
        path: testInfo.outputPath(`contact-wash-${width}-${fraction}.png`),
      });
      const { data, info } = await sharp(screenshot)
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      let changed = 0;
      let spill = 0;
      const radius = 12;
      for (let y = 0; y < info.height; y++) {
        for (let x = 0; x < info.width; x++) {
          const offset = (y * info.width + x) * info.channels;
          if (
            ![0, 1, 2].some(
              (channel) =>
                Math.abs(
                  (data[offset + channel] ?? 0) -
                    (baseline.data[offset + channel] ?? 0),
                ) > 3,
            )
          )
            continue;
          changed++;
          const px = clip.x + x + 0.5;
          const py = clip.y + y + 0.5;
          const cx = Math.max(
            box.x + radius,
            Math.min(px, box.x + box.width - radius),
          );
          const cy = Math.max(
            box.y + radius,
            Math.min(py, box.y + box.height - radius),
          );
          if (Math.hypot(px - cx, py - cy) > radius + 0.75) spill++;
        }
      }
      expect(changed).toBeGreaterThan(100);
      expect(spill).toBe(0);
      await expect(card).toHaveCSS("overflow", "visible");
      await expect(card).toHaveCSS("outline-style", "solid");
    }
    await wash.evaluate((animation) => animation.finish());
    await wash.dispose();
  });
}

test("hover fills only the engaged contact card and retracts on exit", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/#contact");
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
  });
  for (const card of await page.locator(cards).all()) {
    await card.hover();
    await expect(card).toHaveCSS("background-size", "180% 180%");
    await expect(page.locator(`${cards}:not(:hover)`).first()).toHaveCSS(
      "background-size",
      "0% 0%",
    );
    await page.mouse.move(0, 0);
    await expect(card).toHaveCSS("background-size", "0% 0%");
  }
  await page.locator(cards).first().hover();
  await expect(page.locator(cards).first()).toHaveCSS(
    "background-size",
    "180% 180%",
  );
  await page
    .locator("#contact")
    .screenshot({ path: testInfo.outputPath("contact-fill.png") });
  // The project cards and navigation retain their existing surfaces.
  await expect(page.locator(".project-list .route-link").first()).toHaveCSS(
    "background-image",
    "none",
  );
  await expect(
    page.locator('.primary-navigation a[href="/#contact"]'),
  ).toHaveCSS("background-size", "0px 2px");
});

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test.describe(`touch contact fill with ${reducedMotion}`, () => {
    test.use({
      hasTouch: true,
      isMobile: true,
      viewport: { width: 390, height: 844 },
      reducedMotion,
    });
    test("press feedback releases on cancellation and never delays navigation", async ({
      browserName,
      page,
    }) => {
      test.skip(
        browserName !== "chromium",
        "Coarse-pointer emulation is Chromium-only.",
      );
      await page.goto("/#contact");
      const card = page.locator(cards).first();
      await card.scrollIntoViewIfNeeded();
      for (const release of [
        "pointerup",
        "pointercancel",
        "pointerleave",
        "scroll",
        "visibilitychange",
      ] as const) {
        await card
          .locator("h3")
          .dispatchEvent("pointerdown", { pointerType: "touch", button: 0 });
        await expect(card).toHaveClass(/is-pressed/);
        await expect(card).toHaveCSS("background-size", "180% 180%");
        await expect(card).toHaveCSS(
          "transition-duration",
          reducedMotion === "reduce" ? "0s" : "0.18s",
        );
        if (release === "scroll")
          await page.evaluate(() => window.dispatchEvent(new Event("scroll")));
        else if (release === "visibilitychange")
          await page.evaluate(() =>
            document.dispatchEvent(new Event("visibilitychange")),
          );
        else await card.dispatchEvent(release, { pointerType: "touch" });
        await expect(card).not.toHaveClass(/is-pressed/);
        await expect(card).toHaveCSS("background-size", "0% 0%");
      }
      await page.route("https://github.com/ahammednibras8", (route) =>
        route.fulfill({
          status: 200,
          contentType: "text/html",
          body: "<title>Profile destination</title>",
        }),
      );
      await page
        .locator('#contact a[href="https://github.com/ahammednibras8"]')
        .tap();
      await expect(page).toHaveURL("https://github.com/ahammednibras8");
    });
  });
}

test("reduced motion is instant and system modes omit decorative fill", async ({
  page,
  browserName,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#contact");
  const card = page.locator(cards).first();
  await card.focus();
  await expect(card).toHaveCSS("background-size", "180% 180%");
  await expect(card).toHaveCSS("transition-duration", "0s");
  if (browserName === "chromium") {
    await page.emulateMedia({ forcedColors: "active" });
    await expect(card).toHaveCSS("background-image", "none");
    await expect(card).toHaveCSS("outline-style", "solid");
  }
  await page.emulateMedia({ media: "print", forcedColors: "none" });
  await expect(card).toHaveCSS("background-image", "none");
  await expect(page.locator("#contact")).toBeHidden();
});

test.describe("contact fill without JavaScript", () => {
  test.use({ javaScriptEnabled: false, reducedMotion: "reduce" });
  test("focus fills the card and the destination remains a native link", async ({
    page,
  }) => {
    await page.goto("/#contact");
    const card = page.locator(cards).first();
    await card.focus();
    await expect(card).toHaveCSS("background-size", "180% 180%");
    await expect(card).toHaveAttribute(
      "href",
      "mailto:ahammednibras737@gmail.com",
    );
    await card.evaluate((element) => element.blur());
    await expect(card).toHaveCSS("background-size", "0% 0%");
  });
});
