import { expect, test } from "@playwright/test";

const cases = [
  [".sticker-wave", ".sticker-wave svg", "-10deg", "0px"],
  ["#work .section-title", "#work .section-title svg", "-6deg", "0px"],
  ["#cascade > .sticker", "#cascade > .sticker svg", "-6deg", "0px"],
  [".run-path li:first-child", ".run-path li:first-child svg", "-6deg", "0px"],
  [".architecture-node-link", ".architecture-node-icon", "-6deg", "0px"],
  [".architecture-recovery", ".architecture-recovery > svg", "20deg", "0px"],
  ["#contact .route-link", "#contact .sticker svg", "-6deg", "0px"],
  ["#contact .route-link", "#contact .action-arrow", "0deg", "2px"],
  [".hero-action", ".hero-action .action-arrow", "0deg", "0px 2px"],
] as const;

test("icon hover is local, directional, and leaves each loop intact", async ({
  page,
}, testInfo) => {
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
    const loops = await icon.evaluateHandle((element) =>
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
    await expect(icon, selector).toHaveCSS("scale", "1.12");
    await expect(icon, selector).toHaveCSS("rotate", rotation);
    await expect(icon, selector).toHaveCSS("translate", translation);
    await expect(icon).toHaveCSS("animation-name", "none");
    expect(
      await icon.evaluate((element, original) => {
        const current = element.getAnimations({ subtree: true });
        return (
          original.length > 0 &&
          original.every(
            (animation) =>
              current.includes(animation) &&
              animation.effect?.getTiming().duration === 8000 &&
              animation.effect.getTiming().iterations === Infinity,
          )
        );
      }, loops),
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
    await loops.dispose();
  }
  await page.locator(".hero-contact").hover();
  await expect(page.locator(".contact-arrow-badge")).toHaveCSS("scale", "1.12");
  await expect(page.locator(".contact-arrow-badge svg")).toHaveCSS(
    "scale",
    "none",
  );
  await expect(page.locator(".contact-arrow-badge svg")).toHaveCSS(
    "rotate",
    "none",
  );
});

test("link focus matches hover and system preferences leave icons still", async ({
  page,
  browserName,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const link = page.locator('#contact a[href^="mailto:"]');
  const icon = link.locator(".sticker svg");
  await link.focus();
  await expect(icon).toHaveCSS("scale", "1.12");
  await expect(icon).toHaveCSS("rotate", "-6deg");
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
    const link = page.locator('#contact a[href^="mailto:"]');
    await link.hover();
    await expect(link.locator(".sticker svg")).toHaveCSS("scale", "1.12");
    await expect(link.locator("svg path").first()).toHaveCSS(
      "animation-name",
      "none",
    );
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
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    const icon = page.locator(".sticker-wave svg");
    await page.locator(".sticker-wave").tap();
    await expect(icon).toHaveCSS("scale", "none");
    await expect(icon).toHaveCSS("rotate", "none");
    await expect(icon.locator("path").first()).toHaveCSS(
      "animation-name",
      "icon-hand-wave",
    );
    await page.locator(".hero-action").tap();
    await expect(page).toHaveURL(/#work$/);
    await expect(page.locator(".hero-action svg")).toHaveCSS("scale", "none");
  });
});
