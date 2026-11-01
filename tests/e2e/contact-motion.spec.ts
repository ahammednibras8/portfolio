import { expect, test } from "@playwright/test";

for (const trigger of ["hover", "focus"] as const) {
  test(`Get in touch makes one A-to-B arrow pass on ${trigger}`, async ({
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
    await expect(arrow).toHaveClass(/is-playing/);
    await expect(arrow.locator("path").first()).toHaveCSS(
      "animation-name",
      "contact-arrow-travel",
    );
    const sample = await arrow.evaluate((element) => {
      const animations = element.getAnimations({ subtree: true });
      for (const animation of animations) animation.pause();
      const path = element.querySelector("path");
      if (!path) throw new Error("Expected the original Lucide arrow.");
      const frames = [0, 0.42, 0.43, 1].map((fraction) => {
        for (const animation of animations)
          animation.currentTime = fraction * 560;
        return [...element.children].map((part) => {
          const style = getComputedStyle(part);
          return { translate: style.translate, opacity: style.opacity };
        });
      });
      // Keep the sampled animations current until the exit/finish assertion.
      for (const animation of animations) animation.currentTime = 280;
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
        (timing) => timing?.duration === 560 && timing.iterations === 1,
      ),
    ).toBe(true);
    for (const [index, frame] of sample.frames.entries()) {
      expect(frame).toHaveLength(2);
      expect(frame[0]).toEqual(frame[1]);
      if (index === 1)
        expect(frame[0]).toEqual({ translate: "9px", opacity: "0" });
      if (index === 2)
        expect(frame[0]).toEqual({ translate: "-9px", opacity: "0" });
      if (index === 3) expect(Number(frame[0]?.opacity)).toBe(1);
    }
    if (trigger === "hover") await page.mouse.move(0, 0);
    else await button.evaluate((element) => element.blur());
    await arrow.evaluate((element) => {
      for (const animation of element.getAnimations({ subtree: true }))
        animation.finish();
    });
    await expect(arrow).not.toHaveClass(/is-playing/);
    await expect(arrow.locator("path").first()).toHaveCSS("opacity", "1");
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

  test("a touch press plays the contact arrow without focus and tapping navigates", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    const button = page.getByRole("link", {
      name: "Get in touch",
      exact: true,
    });
    const arrow = button.locator(".action-arrow");
    await button.dispatchEvent("pointerdown", {
      pointerType: "touch",
      button: 0,
    });
    await expect(button).not.toBeFocused();
    await expect(arrow).toHaveClass(/is-playing/);
    await expect(arrow.locator("path").first()).toHaveCSS(
      "animation-name",
      "contact-arrow-travel",
    );
    await button.tap();
    await expect(page).toHaveURL(/#contact$/);
    await expect(
      page.getByRole("heading", { name: "Contact", exact: true }),
    ).toBeInViewport();
  });
});
