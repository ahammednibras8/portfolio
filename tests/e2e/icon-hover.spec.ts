import { expect, type Page, test } from "@playwright/test";

const freezeGestures = (page: Page) =>
  page.addInitScript(() => {
    new MutationObserver((records) => {
      for (const { target } of records) {
        if (!(target instanceof SVGElement) || !target.matches(".icon-active"))
          continue;
        for (const animation of target.getAnimations({ subtree: true }))
          if (
            animation instanceof CSSAnimation &&
            animation.animationName.startsWith("icon-")
          )
            animation.pause();
      }
    }).observe(document, {
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
  });

const cases = [
  [".sticker-wave", ".sticker-wave svg", "-6deg", "0px"],
  ["#work .section-title", "#work .section-title svg", "0deg", "0px"],
  ["#cascade > .sticker", "#cascade > .sticker svg", "0deg", "0px"],
  [".run-path li:first-child", ".run-path li:first-child svg", "0deg", "0px"],
  [".architecture-node-link", ".architecture-node-icon", "0deg", "0px"],
  [".architecture-recovery", ".architecture-recovery > svg", "12deg", "0px"],
  ["#contact .route-link", "#contact .sticker svg", "0deg", "0px"],
  ["#contact .route-link", "#contact .action-arrow", "0deg", "2px"],
] as const;

test("icon hover is local, directional, and leaves each finite gesture intact", async ({
  page,
}, testInfo) => {
  await freezeGestures(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  // Sample settled icons, not a pointer target still moving during navigation.
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    for (const piece of document.querySelectorAll(".zoom-ready"))
      piece.classList.remove("zoom-ready");
  });
  for (const [target, selector, rotation, translation] of cases) {
    const icon = page.locator(selector).first();
    const owner = page.locator(target).first();
    await owner.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    await expect(icon).toHaveCSS("scale", "none");
    const original = await icon.evaluateHandle((element) =>
      element
        .getAnimations({ subtree: true })
        .filter(
          (animation) =>
            animation instanceof CSSAnimation &&
            (animation.effect as KeyframeEffect | null)?.target?.parentNode ===
              element,
        ),
    );
    const ownerBox = await owner.evaluate((element) => ({
      width: (element as HTMLElement).offsetWidth,
      height: (element as HTMLElement).offsetHeight,
    }));
    await owner.hover();
    await expect(icon, selector).toHaveCSS("scale", "1.06");
    await expect(icon, selector).toHaveCSS("rotate", rotation);
    await expect(icon, selector).toHaveCSS("translate", translation);
    await expect(icon).toHaveCSS("animation-name", "none");
    await expect(icon).toHaveClass(/icon-active/);
    expect(
      await icon.evaluate((element, previous) => {
        const current = element.getAnimations({ subtree: true });
        const gestures = current.filter(
          (animation) => animation instanceof CSSAnimation,
        );
        return (
          gestures.length > 0 &&
          previous.every((animation) => current.includes(animation)) &&
          gestures.every(
            (animation) =>
              animation.effect?.getTiming().duration === 900 &&
              animation.effect.getTiming().iterations === 1,
          )
        );
      }, original),
    ).toBe(true);
    expect(
      await owner.evaluate((element) => ({
        width: (element as HTMLElement).offsetWidth,
        height: (element as HTMLElement).offsetHeight,
      })),
    ).toEqual(ownerBox);
    if (target === "#contact .route-link")
      await page.screenshot({ path: testInfo.outputPath("contact-icons.png") });
    await page.mouse.move(0, 0);
    await expect(icon).toHaveCSS("scale", "none");
    await expect(icon).toHaveCSS("rotate", "none");
    await expect(icon).toHaveCSS("translate", "none");
    // Exiting leaves the gesture alive. Drive its end explicitly so app
    // cleanup runs before the next case instead of racing a short timer.
    await expect(icon).toHaveClass(/icon-active/);
    await icon.evaluate(async (element) => {
      const animations = element
        .getAnimations({ subtree: true })
        .filter((animation) => animation instanceof CSSAnimation);
      const done = animations.map((animation) => animation.finished);
      for (const animation of animations) animation.finish();
      await Promise.all(done);
    });
    await expect(icon).not.toHaveClass(/icon-active/);
    await original.dispose();
  }
  for (const selector of [".hero-contact", ".hero-action"]) {
    const button = page.locator(selector);
    await button.hover();
    await expect(button.locator(".hero-arrow-badge")).toHaveCSS(
      "scale",
      "1.12",
    );
    await expect(button.locator(".hero-arrow-badge")).toHaveCSS(
      "rotate",
      "-12deg",
    );
    await expect(button.locator("svg")).toHaveCSS("scale", "none");
    await expect(button.locator("svg")).toHaveCSS("rotate", "none");
  }
});

test("link focus matches hover and system preferences leave icons still", async ({
  page,
  browserName,
}) => {
  await freezeGestures(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const link = page.locator('#contact a[href^="mailto:"]');
  const icon = link.locator(".sticker svg");
  await link.focus();
  await expect(icon).toHaveCSS("scale", "1.06");
  await expect(icon).toHaveCSS("rotate", "0deg");
  await expect(icon).toHaveClass(/icon-active/);
  await expect(link).toHaveCSS("outline-style", "solid");
  await link.evaluate((element) => element.blur());
  await expect(icon).toHaveCSS("scale", "none");

  for (const mode of ["reduce", "print", "forced"] as const) {
    if (mode === "forced" && browserName !== "chromium") continue;
    await page.emulateMedia({
      media: mode === "print" ? "print" : "screen",
      reducedMotion: mode === "reduce" ? "reduce" : "no-preference",
      forcedColors: mode === "forced" ? "active" : "none",
    });
    await link.focus();
    await expect(icon).toHaveCSS("scale", "none");
    await expect(icon).toHaveCSS("rotate", "none");
    await expect(icon).toHaveCSS("translate", "none");
    await expect(icon).toHaveCSS("transition-duration", "0s");
    await expect(icon.locator("path").first()).toHaveCSS(
      "animation-name",
      "none",
    );
  }
});

test("icon feedback works without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    reducedMotion: "no-preference",
  });
  try {
    const page = await context.newPage();
    await page.goto("/");
    // Keep the hover target still; application scripts remain disabled.
    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = "auto";
    });
    const link = page.locator('#contact a[href^="mailto:"]');
    await link.hover();
    await expect(link.locator(".sticker svg")).toHaveCSS("scale", "1.06");
    await expect(link.locator(".sticker svg")).toHaveCSS("rotate", "0deg");
    await expect(link.locator("svg path").first()).toHaveCSS(
      "animation-name",
      "none",
    );
    await page.mouse.move(0, 0);
    await link.focus();
    await expect(link.locator(".sticker svg")).toHaveCSS("scale", "1.06");
    await expect(link).toHaveCSS("outline-style", "solid");
    expect(
      await link
        .locator("svg > *")
        .evaluateAll((parts) =>
          parts.every(
            (part) => getComputedStyle(part).animationName === "none",
          ),
        ),
    ).toBe(true);
  } finally {
    await context.close();
  }
});

test.describe("touch icons", () => {
  test.skip(({ browserName }) => browserName !== "chromium");
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });

  test("a tap does not leave a decorative icon enlarged", async ({ page }) => {
    await freezeGestures(page);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    const icon = page.locator(".sticker-wave svg");
    await page.locator(".sticker-wave").tap();
    await expect(icon).toHaveCSS("scale", "none");
    await expect(icon).toHaveCSS("rotate", "none");
    await expect(icon).toHaveCSS("translate", "none");
    await expect(icon.locator("path").first()).toHaveCSS(
      "animation-name",
      "icon-hand-wave",
    );
    await expect(icon.locator("path").first()).toHaveCSS(
      "animation-iteration-count",
      "1",
    );
    await page.locator(".hero-action").tap();
    await expect(page).toHaveURL(/#work$/);
    await expect(page.locator(".hero-action svg")).toHaveCSS("scale", "none");
  });
});
