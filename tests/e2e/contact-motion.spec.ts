import { expect, test } from "@playwright/test";

for (const trigger of ["hover", "focus"] as const) {
  test(`Get in touch repeats its A-to-B arrow pass with ${trigger}`, async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    const button = page.getByRole("link", {
      name: "Get in touch",
      exact: true,
    });
    const arrow = button.locator(".action-arrow");
    await expect(arrow).toHaveAttribute("aria-hidden", "true");
    await expect(button).toHaveAttribute("href", "#contact");
    // Only the arrow's own motion is measured, not the hero's entrance.
    await expect(page.locator("#intro > .speech-bubble")).toHaveCSS(
      "scale",
      "none",
    );
    if (trigger === "hover") await button.hover();
    else await button.focus();
    await expect(arrow).toHaveClass(/is-in-view/);
    await expect(arrow.locator("path").first()).toHaveCSS(
      "animation-name",
      "icon-arrow-travel",
    );
    const sample = await arrow.evaluate((element) => {
      const animations = element.getAnimations({ subtree: true });
      for (const animation of animations) animation.pause();
      const path = element.querySelector("path");
      if (!path) throw new Error("Expected the original Lucide arrow.");
      const frames = [0, 0.1575, 0.16125, 0.8].map((fraction) => {
        for (const animation of animations)
          animation.currentTime =
            Number(animation.effect?.getTiming().delay ?? 0) + fraction * 8000;
        return [...element.children].map((part) => {
          const style = getComputedStyle(part);
          return {
            translate: parseFloat(style.translate),
            opacity: Number(style.opacity),
          };
        });
      });
      return {
        frames,
        timing: animations.map((animation) => animation.effect?.getTiming()),
        labelOpacity: getComputedStyle(element.parentElement as Element)
          .opacity,
        outerAnimation: getComputedStyle(element).animationName,
      };
    });
    expect(sample.outerAnimation).toBe("none");
    expect(sample.labelOpacity).toBe("1");
    expect(sample.timing).toHaveLength(2);
    expect(
      sample.timing.every(
        (timing) => timing?.duration === 8000 && timing.iterations === Infinity,
      ),
    ).toBe(true);
    for (const [index, frame] of sample.frames.entries()) {
      expect(frame).toHaveLength(2);
      expect(frame[0]).toEqual(frame[1]);
      if (index === 1 || index === 2) {
        expect(frame[0]?.translate).toBeCloseTo(index === 1 ? 9 : -9, 3);
        expect(frame[0]?.opacity).toBeCloseTo(0, 3);
      }
      if (index === 3) expect(Number(frame[0]?.opacity)).toBe(1);
    }
    if (trigger === "hover") await page.mouse.move(0, 0);
    else await button.evaluate((element) => element.blur());
    await arrow.evaluate((element) => {
      for (const animation of element.getAnimations({ subtree: true }))
        animation.play();
    });
    await expect(arrow.locator("path").first()).toHaveCSS(
      "animation-play-state",
      "running",
    );

    await page.screenshot({
      path: testInfo.outputPath(`contact-${trigger}.png`),
    });
    await button.click();
    await expect(page).toHaveURL(/#contact$/);
    await expect(
      page.getByRole("heading", { name: "Contact", exact: true }),
    ).toBeInViewport();
  });
}

test("contact motion is static with reduced motion and forced colors", async ({
  browserName,
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const button = page.getByRole("link", { name: "Get in touch", exact: true });
  const path = button.locator(".action-arrow path").first();
  await button.focus();
  await expect(path).toHaveCSS("animation-name", "none");
  await expect(path).toHaveCSS("opacity", "1");
  if (browserName === "chromium") {
    await page.emulateMedia({
      reducedMotion: "no-preference",
      forcedColors: "active",
    });
    await button.hover();
    await expect(path).toHaveCSS("animation-name", "none");
  }
  await button.click();
  await expect(page).toHaveURL(/#contact$/);
});

test.describe("on touch screens", () => {
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "Touch-only emulation uses Chromium.",
  );
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });

  test("the contact arrow loops without focus and tapping navigates", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    const button = page.getByRole("link", {
      name: "Get in touch",
      exact: true,
    });
    const arrow = button.locator(".action-arrow");
    await expect(button).not.toBeFocused();
    await expect(arrow).toHaveClass(/is-in-view/);
    await expect(arrow.locator("path").first()).toHaveCSS(
      "animation-name",
      "icon-arrow-travel",
    );
    await button.tap();
    await expect(page).toHaveURL(/#contact$/);
    await expect(
      page.getByRole("heading", { name: "Contact", exact: true }),
    ).toBeInViewport();
  });
});
