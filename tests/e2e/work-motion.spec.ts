import { expect, test } from "@playwright/test";

for (const trigger of ["hover", "focus"] as const) {
  test(`See my work matches the contact feedback on ${trigger}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({
      width: trigger === "hover" ? 1280 : 320,
      height: 900,
    });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    await expect(page.locator("#intro > .speech-bubble")).toHaveCSS(
      "scale",
      "none",
    );
    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = "auto";
    });
    const button = page.getByRole("link", { name: "See my work", exact: true });
    const badge = button.locator(".hero-arrow-badge");
    const arrow = badge.locator("svg");
    await expect(button).toHaveAttribute("href", "#work");
    await expect(button).toHaveCSS("background-color", "rgb(185, 226, 255)");
    await expect(button).toHaveCSS("background-size", "0% 100%");
    await expect(badge).toHaveCSS("background-color", "rgb(255, 255, 255)");
    if (trigger === "hover") await button.hover();
    else await button.focus();
    // Check the real sweep mid-flight, while its navy label stays readable.
    await button.evaluate(async (element) => {
      const fill = element
        .getAnimations()
        .find(
          (animation) =>
            animation instanceof CSSTransition &&
            animation.transitionProperty === "background-size",
        );
      if (!fill?.effect)
        throw new Error("Expected the primary button's sweep.");
      fill.pause();
      await fill.ready;
      fill.currentTime = Number(fill.effect.getTiming().duration) * 0.12;
    });
    const progress = await button.evaluate((element) =>
      parseFloat(getComputedStyle(element).backgroundSize),
    );
    expect(progress).toBeGreaterThan(0);
    expect(progress).toBeLessThan(100);
    await expect(button).toHaveCSS("background-clip", "padding-box");
    await expect(button).toHaveCSS("color", "rgb(1, 58, 99)");
    await expect(button).toHaveCSS(
      "background-image",
      "linear-gradient(rgb(153, 208, 245) 0px, rgb(153, 208, 245) 0px)",
    );
    const contrasts = await button.evaluate((element) => {
      const style = getComputedStyle(element);
      const luminance = (color: string) => {
        const channels =
          color
            .match(/[\d.]+/g)
            ?.slice(0, 3)
            .map(Number) ?? [];
        return channels.reduce((sum, channel, index) => {
          const value = channel / 255;
          const linear =
            value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
          return sum + linear * ([0.2126, 0.7152, 0.0722][index] ?? 0);
        }, 0);
      };
      const ink = luminance(style.color);
      return [
        style.backgroundColor,
        ...(style.backgroundImage.match(/rgb\([^)]+\)/g) ?? []),
      ].map((color) => {
        const fill = luminance(color);
        return (Math.max(ink, fill) + 0.05) / (Math.min(ink, fill) + 0.05);
      });
    });
    expect(Math.min(...contrasts)).toBeGreaterThan(4.5);
    expect(
      await button.evaluate(
        (element) => getComputedStyle(element, "::before").content,
      ),
    ).toBe("none");
    await page.screenshot({
      path: testInfo.outputPath("work-sweep-partial.png"),
    });
    await button.evaluate((element) => {
      for (const animation of element.getAnimations()) animation.finish();
    });
    await expect(button).toHaveCSS("background-size", "100% 100%");
    await expect(button).toHaveCSS("translate", "-2px -2px");
    await expect(badge).toHaveCSS("background-color", "rgb(1, 58, 99)");
    await expect(badge).toHaveCSS("color", "rgb(255, 255, 255)");
    await expect(badge).toHaveCSS("scale", "1.12");
    await expect(badge).toHaveCSS("rotate", "-12deg");
    await expect(arrow).toHaveCSS("scale", "none");
    await expect(arrow).toHaveCSS("rotate", "none");
    const loops = await arrow.evaluate((element) =>
      element.getAnimations({ subtree: true }).map((animation) => ({
        duration: animation.effect?.getTiming().duration,
        iterations: animation.effect?.getTiming().iterations === Infinity,
      })),
    );
    expect(loops).toEqual([
      { duration: 8000, iterations: true },
      { duration: 8000, iterations: true },
    ]);
    await arrow.evaluate((element) => {
      for (const animation of element.getAnimations({ subtree: true })) {
        animation.pause();
        animation.currentTime =
          Number(animation.effect?.getTiming().delay ?? 0) + 6000;
      }
    });
    await page.screenshot({ path: testInfo.outputPath("work-hover.png") });
    if (trigger === "hover") await page.mouse.move(0, 0);
    else await button.evaluate((element) => element.blur());
    await expect(button).toHaveCSS("background-size", "0% 100%");
    await expect(button).toHaveCSS("translate", "none");
    await expect(badge).toHaveCSS("scale", "none");
    await expect(badge).toHaveCSS("rotate", "none");
    await page.screenshot({ path: testInfo.outputPath("work-rest.png") });
    await button.click();
    await expect(page).toHaveURL(/#work$/);
    await expect(
      page.getByRole("heading", { name: "Selected work", exact: true }),
    ).toBeInViewport();
  });
}

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`work-button press releases after cancellation with ${reducedMotion}`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto("/");
    await expect(page.locator("#intro > .speech-bubble")).toHaveCSS(
      "scale",
      "none",
    );
    const button = page.locator(".hero-action");
    const badge = button.locator(".hero-arrow-badge");
    const before = await button.boundingBox();
    for (const release of ["pointercancel", "pointerleave"] as const) {
      await button.locator("svg path").first().dispatchEvent("pointerdown", {
        button: 0,
        pointerType: "touch",
      });
      await expect(button).toHaveClass(/is-pressed/);
      await expect(button).toHaveCSS("box-shadow", "none");
      await expect(button).toHaveCSS("background-size", "100% 100%");
      await expect(button).toHaveCSS(
        "translate",
        reducedMotion === "reduce" ? "none" : "2px 2px",
      );
      await expect(badge).toHaveCSS(
        "scale",
        reducedMotion === "reduce" ? "none" : "0.96",
      );
      const pressed = await button.boundingBox();
      expect(pressed?.width).toBe(before?.width);
      expect(pressed?.height).toBe(before?.height);
      await button.dispatchEvent(release, { pointerType: "touch" });
      await expect(button).not.toHaveClass(/is-pressed/);
      await expect(button).toHaveCSS("background-size", "0% 100%");
      await expect(button).toHaveCSS("translate", "none");
      await expect(badge).toHaveCSS("scale", "none");
    }
    await expect(page).not.toHaveURL(/#work$/);
  });
}

test("work-button system fallbacks are static and keep the native link", async ({
  page,
  browserName,
}) => {
  await page.goto("/");
  const button = page.locator(".hero-action");
  const badge = button.locator(".hero-arrow-badge");
  for (const mode of ["reduce", "forced", "print"] as const) {
    if (mode === "forced" && browserName !== "chromium") continue;
    await page.emulateMedia({
      media: mode === "print" ? "print" : "screen",
      reducedMotion: mode === "reduce" ? "reduce" : "no-preference",
      forcedColors: mode === "forced" ? "active" : "none",
    });
    if (mode !== "print") await button.focus();
    await expect(button).toHaveCSS("translate", "none");
    await expect(button).toHaveCSS("transition-duration", "0s");
    await expect(badge).toHaveCSS("scale", "none");
    await expect(badge).toHaveCSS("rotate", "none");
    await expect(button.locator("svg path").first()).toHaveCSS(
      "animation-name",
      "none",
    );
    if (mode === "forced")
      await expect(button).toHaveCSS("background-image", "none");
    if (mode === "print") await expect(button).toBeHidden();
  }
  await page.emulateMedia({
    media: "screen",
    forcedColors: "none",
    reducedMotion: "reduce",
  });
  await button.click();
  await expect(page).toHaveURL(/#work$/);
});

test("See my work still navigates without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto("/");
    // WebKit's pointer-stability check needs the finite hero entrance to settle.
    await expect(page.locator("#intro > .speech-bubble")).toHaveCSS(
      "scale",
      "none",
    );
    await page.getByRole("link", { name: "See my work", exact: true }).click();
    await expect(page).toHaveURL(/#work$/);
    await expect(
      page.getByRole("heading", { name: "Selected work", exact: true }),
    ).toBeInViewport();
  } finally {
    await context.close();
  }
});
