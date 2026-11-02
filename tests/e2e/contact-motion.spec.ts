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
    await expect(button).toHaveCSS("translate", "-2px -2px");
    await expect(button).toHaveCSS("color", "rgb(1, 58, 99)");
    await expect(button.locator(".contact-arrow-badge")).toHaveCSS(
      "background-color",
      "rgb(1, 58, 99)",
    );
    await expect(button.locator(".contact-arrow-badge")).toHaveCSS(
      "color",
      "rgb(255, 255, 255)",
    );
    await expect(button.locator(".contact-arrow-badge")).toHaveCSS(
      "scale",
      "1.12",
    );
    await expect(button.locator(".contact-arrow-badge")).toHaveCSS(
      "rotate",
      "-12deg",
    );
    await expect
      .poll(() =>
        button.evaluate((element) =>
          parseFloat(getComputedStyle(element, "::before").scale),
        ),
      )
      .toBe(1);
    expect(
      await button.evaluate(
        (element) => getComputedStyle(element, "::before").pointerEvents,
      ),
    ).toBe("none");
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
        labelOpacity: getComputedStyle(
          element.closest(".hero-contact") as Element,
        ).opacity,
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
    await expect(button.locator(".contact-arrow-badge")).toHaveCSS(
      "scale",
      "none",
    );
    await expect(button.locator(".contact-arrow-badge")).toHaveCSS(
      "rotate",
      "none",
    );
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
  await expect(button).toHaveCSS("translate", "none");
  await expect(button).toHaveCSS("transition-duration", "0s");
  await expect(button.locator(".contact-arrow-badge")).toHaveCSS(
    "scale",
    "none",
  );
  await expect(button.locator(".contact-arrow-badge")).toHaveCSS(
    "rotate",
    "none",
  );
  expect(
    await button.evaluate(
      (element) => getComputedStyle(element, "::before").transitionDuration,
    ),
  ).toBe("0s");
  await expect(path).toHaveCSS("animation-name", "none");
  await expect(path).toHaveCSS("opacity", "1");
  if (browserName === "chromium") {
    await page.emulateMedia({
      reducedMotion: "no-preference",
      forcedColors: "active",
    });
    await button.hover();
    await expect(path).toHaveCSS("animation-name", "none");
    await expect(button).toHaveCSS("box-shadow", "none");
    await expect(button.locator(".contact-arrow-badge")).toHaveCSS(
      "scale",
      "none",
    );
    await expect(button.locator(".contact-arrow-badge")).toHaveCSS(
      "rotate",
      "none",
    );
    expect(
      await button.evaluate(
        (element) => getComputedStyle(element, "::before").content,
      ),
    ).toBe("none");
  }
  await button.click();
  await expect(page).toHaveURL(/#contact$/);
});

test("the contact pill presses and releases without changing its layout", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const button = page.getByRole("link", { name: "Get in touch", exact: true });
  await expect(page.locator("#intro > .speech-bubble")).toHaveCSS(
    "scale",
    "none",
  );
  const before = await button.boundingBox();
  const neighbor = await page.locator(".hero-action").boundingBox();
  await button.hover();
  await page.mouse.down();
  try {
    await expect(button).toHaveClass(/is-pressed/);
    await expect(button).toHaveCSS("box-shadow", "none");
    await expect(button).toHaveCSS("translate", "2px 2px");
    await expect(button.locator(".contact-arrow-badge")).toHaveCSS(
      "scale",
      "0.96",
    );
    await expect(button.locator(".contact-arrow-badge")).toHaveCSS(
      "rotate",
      "0deg",
    );
    await expect(button).toHaveCSS("opacity", "1");
    const pressed = await button.boundingBox();
    expect(pressed?.width).toBe(before?.width);
    expect(pressed?.height).toBe(before?.height);
    expect(await page.locator(".hero-action").boundingBox()).toEqual(neighbor);
    await page.mouse.move(0, 0);
  } finally {
    await page.mouse.up();
  }
  await button.evaluate((element) => element.blur());
  await expect(button).not.toHaveClass(/is-pressed/);
  await expect(button).toHaveCSS("translate", "none");
  await expect(button.locator(".contact-arrow-badge")).toHaveCSS(
    "scale",
    "none",
  );
  await expect(button.locator(".contact-arrow-badge")).toHaveCSS(
    "rotate",
    "none",
  );
  await expect
    .poll(() =>
      button.evaluate((element) =>
        parseFloat(getComputedStyle(element, "::before").scale),
      ),
    )
    .toBe(0);
  await expect(page).not.toHaveURL(/#contact$/);
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

  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    test(`contact touch feedback releases after cancellation with ${reducedMotion}`, async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion });
      await page.goto("/");
      const button = page.getByRole("link", {
        name: "Get in touch",
        exact: true,
      });
      await button.dispatchEvent("pointerdown", {
        button: 0,
        pointerType: "touch",
      });
      await expect(button).toHaveClass(/is-pressed/);
      await expect(button).toHaveCSS("box-shadow", "none");
      await expect(button).toHaveCSS(
        "translate",
        reducedMotion === "reduce" ? "none" : "2px 2px",
      );
      await expect(button.locator(".contact-arrow-badge")).toHaveCSS(
        "scale",
        reducedMotion === "reduce" ? "none" : "0.96",
      );
      await expect(button.locator(".contact-arrow-badge")).toHaveCSS(
        "rotate",
        reducedMotion === "reduce" ? "none" : "0deg",
      );
      await button.dispatchEvent("pointercancel", { pointerType: "touch" });
      await expect(button).not.toHaveClass(/is-pressed/);
      await expect(button).toHaveCSS("translate", "none");
      await expect(button.locator(".contact-arrow-badge")).toHaveCSS(
        "scale",
        "none",
      );
      await expect(button.locator(".contact-arrow-badge")).toHaveCSS(
        "rotate",
        "none",
      );
      await expect
        .poll(() =>
          button.evaluate((element) =>
            parseFloat(getComputedStyle(element, "::before").scale),
          ),
        )
        .toBe(0);
      await expect(button).not.toBeFocused();
      await button.tap();
      await expect(page).toHaveURL(/#contact$/);
      await expect(button).not.toHaveClass(/is-pressed/);
    });
  }
});
