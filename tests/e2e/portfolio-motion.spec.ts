import { expect, test } from "@playwright/test";

test("the hero settles around a solid, stationary name", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      for (const element of document.querySelectorAll(
        "#intro > .hero-portrait, #intro > .speech-bubble, .hero-name",
      ))
        for (const animation of element.getAnimations()) animation.pause();
    });
  });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);

  const samples = await page.evaluate(() =>
    [".hero-portrait", "#intro > .speech-bubble"].map((selector) => {
      const element = document.querySelector(selector) as HTMLElement;
      const name =
        selector === ".hero-portrait" ? "portrait-arrive" : "hero-arrive";
      const animation = element
        .getAnimations()
        .find((motion) => (motion as CSSAnimation).animationName === name);
      if (!animation?.effect)
        throw new Error("Expected a composed hero entrance.");
      const timing = animation.effect.getTiming();
      const frames = [
        0,
        Number(timing.duration) / 2,
        Number(timing.duration),
      ].map((time) => {
        animation.currentTime = Number(timing.delay) + time;
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          x: box.left + box.width / 2,
          y: box.top + box.height / 2,
          scale: style.scale === "none" ? 1 : Number(style.scale),
          opacity: Number(style.opacity),
          translate: style.translate,
        };
      });
      if (selector === "#intro > .speech-bubble") {
        animation.currentTime =
          Number(timing.delay) + Number(timing.duration) / 3;
      } else {
        animation.finish();
      }
      return {
        frames,
        duration: timing.duration,
        delay: timing.delay,
        iterations: timing.iterations,
      };
    }),
  );
  expect(samples.map(({ delay }) => delay)).toEqual([80, 160]);
  expect(samples[0]?.frames[0]?.scale).toBeCloseTo(0.98);
  expect(samples[0]?.frames[0]?.opacity).toBeCloseTo(0.92);
  expect(samples[1]?.frames[0]?.scale).toBeCloseTo(0.99);
  for (const { duration, frames, iterations } of samples) {
    expect(duration).toBe(480);
    expect(iterations).toBe(1);
    const first = frames[0];
    const last = frames[2];
    if (!first || !last)
      throw new Error("Expected both hero endpoint samples.");
    expect(first.scale).toBeLessThan(1);
    expect(last.scale).toBe(1);
    expect(last.x).toBeCloseTo(first.x, 1);
    expect(last.y).toBeCloseTo(first.y, 1);
    expect(
      frames.every(
        ({ opacity, translate }) => opacity >= 0.92 && translate === "none",
      ),
    ).toBe(true);
  }
  await expect(page.locator("h1")).toHaveCSS("animation-name", "none");
  await expect(page.locator(".hero-name")).toHaveCSS("color", "rgb(1, 58, 99)");
  await expect(page.locator("#intro > .speech-bubble")).toHaveCSS(
    "opacity",
    "1",
  );
  await page.getByRole("link", { name: "See my work" }).focus();
  await expect(page.locator("#intro > .speech-bubble")).toHaveCSS(
    "scale",
    "none",
  );
  expect(
    await page
      .locator("#intro > .speech-bubble")
      .evaluate((element) =>
        element
          .getAnimations()
          .some((animation) => animation.playState === "running"),
      ),
  ).toBe(false);
});

for (const viewport of [
  { width: 1280, height: 800, label: "desktop" },
  { width: 390, height: 844, label: "phone" },
]) {
  test(`motion-enabled ${viewport.label} composition stays readable`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.addInitScript(() => {
      document.addEventListener("DOMContentLoaded", () => {
        for (const element of document.querySelectorAll(
          "#intro > .hero-portrait, #intro > .speech-bubble, .hero-name",
        ))
          for (const animation of element.getAnimations()) animation.pause();
      });
    });
    await page.goto("/");
    await page.evaluate(async () => {
      await document.fonts.ready;
      for (const element of document.querySelectorAll(
        "#intro > .hero-portrait, #intro > .speech-bubble, .hero-name",
      )) {
        for (const animation of element.getAnimations()) {
          if (!(animation instanceof CSSAnimation)) continue;
          const timing = animation.effect?.getTiming();
          animation.currentTime =
            Number(timing?.delay ?? 0) + Number(timing?.duration) / 2;
        }
      }
    });
    await expect(page.locator("h1")).toHaveCSS("opacity", "1");
    await expect(page.locator("#intro > .speech-bubble")).toHaveCSS(
      "opacity",
      "1",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`motion-polish-${viewport.label}.png`),
    });
  });
}

test("reading units never zoom inside another zooming unit", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await expect(page.locator(".toolbox > .zoom-ready")).toHaveCount(5);
  await expect(page.locator(".architecture-node.zoom-ready")).toHaveCount(8);
  await expect(
    page.locator(".toolbox.zoom-ready, .architecture-diagram.zoom-ready"),
  ).toHaveCount(0);
  expect(
    await page
      .locator(".zoom-ready")
      .evaluateAll(
        (pieces) =>
          pieces.filter((piece) => piece.parentElement?.closest(".zoom-ready"))
            .length,
      ),
  ).toBe(0);
});

test("project entrances have a short capped stagger in reading order", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await expect(page.locator(".project-list > .zoom-ready")).toHaveCount(6);
  await page
    .locator("#work")
    .evaluate((element) => element.scrollIntoView({ behavior: "instant" }));
  await expect(page.locator(".project-list > .is-zooming")).toHaveCount(6);
  const timings = await page
    .locator(".project-list > li")
    .evaluateAll((pieces) =>
      pieces.map((piece) => {
        const animation = piece
          .getAnimations()
          .find((entry) => (entry as CSSAnimation).animationName === "zoom-in");
        if (!animation?.effect) throw new Error("Expected a project entrance.");
        animation.pause();
        return animation.effect.getTiming();
      }),
    );
  expect(timings.map(({ delay }) => Math.round(delay ?? 0))).toEqual([
    0, 40, 80, 120, 120, 120,
  ]);
  expect(
    timings.every(
      ({ duration, iterations }) => duration === 480 && iterations === 1,
    ),
  ).toBe(true);
});

test("keyboard focus settles a waiting card synchronously", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const card = page.locator(".project-list .route-link").last();
  await expect(card.locator("..")).toHaveClass(/zoom-ready/);
  const state = await card.evaluate((element) => {
    (element as HTMLElement).focus();
    return {
      waiting: element.closest(".zoom-ready") !== null,
      order: element.parentElement?.style.getPropertyValue("--zoom-order"),
    };
  });
  expect(state).toEqual({ waiting: false, order: "" });
  await expect(card).toBeFocused();
  await expect(card).toHaveCSS("outline-style", "solid");
  await expect(card.locator("h3")).toHaveCSS("transform", "none");
});

test.describe("touch motion preferences", () => {
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "Touch-only pointer emulation uses Chromium.",
  );
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 412, height: 915 },
  });

  test("changing reduced motion clears sensor offsets and suppresses later haptics", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "vibrate", {
        value: () => {
          document.documentElement.dataset.buzzed = "true";
          return true;
        },
      });
    });
    await page.goto("/");
    const portrait = page.locator(".hero-portrait");
    await expect(page.locator("html")).toHaveClass(/is-touch/);
    await expect
      .poll(async () => {
        await page.evaluate(() =>
          window.dispatchEvent(
            new DeviceOrientationEvent("deviceorientation", {
              beta: 75,
              gamma: 30,
            }),
          ),
        );
        return portrait.evaluate((element) =>
          element.style.getPropertyValue("--tilt-x"),
        );
      })
      .toBe("6px");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect
      .poll(() =>
        portrait.evaluate((element) =>
          element.style.getPropertyValue("--tilt-x"),
        ),
      )
      .toBe("");
    await page.evaluate(() =>
      window.dispatchEvent(
        new DeviceOrientationEvent("deviceorientation", {
          beta: 75,
          gamma: 30,
        }),
      ),
    );
    expect(
      await portrait.evaluate((element) =>
        element.style.getPropertyValue("--tilt-x"),
      ),
    ).toBe("");
    await page.getByRole("link", { name: "See my work" }).tap();
    await expect(page.locator("html")).not.toHaveAttribute(
      "data-buzzed",
      "true",
    );
    expect(
      await page
        .locator("main svg.lucide > *")
        .evaluateAll((parts) =>
          parts.every(
            (part) => getComputedStyle(part).animationName === "none",
          ),
        ),
    ).toBe(true);
  });

  test("a late sensor permission cannot revive a retired visibility lifecycle", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.addInitScript(() => {
      Object.assign(DeviceOrientationEvent, {
        requestPermission: () =>
          new Promise<string>((resolve) => {
            document.documentElement.dataset.asked = "true";
            addEventListener("grant-test-tilt", () => resolve("granted"), {
              once: true,
            });
          }),
      });
    });
    await page.goto("/");
    const portrait = page.locator(".hero-portrait");
    await portrait.locator("img").tap();
    await expect(page.locator("html")).toHaveAttribute("data-asked", "true");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator("#intro")).toHaveClass(/motion-settled/);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.evaluate(async () => {
      dispatchEvent(new Event("grant-test-tilt"));
      await Promise.resolve();
      dispatchEvent(
        new DeviceOrientationEvent("deviceorientation", {
          beta: 75,
          gamma: 30,
        }),
      );
    });
    expect(
      await portrait.evaluate((element) =>
        element.style.getPropertyValue("--tilt-x"),
      ),
    ).toBe("");
    await page
      .locator("#work")
      .evaluate((element) => element.scrollIntoView({ behavior: "instant" }));
    await page.evaluate(() =>
      dispatchEvent(
        new DeviceOrientationEvent("deviceorientation", {
          beta: 75,
          gamma: 30,
        }),
      ),
    );
    expect(
      await portrait.evaluate((element) =>
        element.style.getPropertyValue("--tilt-x"),
      ),
    ).toBe("");
  });
});

test.describe("background portrait sensor", () => {
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "Phone sensors are exercised in Chromium.",
  );
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 412, height: 915 },
  });
  test("sensor updates pause in hidden tabs and do not resume offscreen", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.addInitScript(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => document.documentElement.hasAttribute("data-test-hidden"),
      });
    });
    await page.goto("/");
    const portrait = page.locator(".hero-portrait");
    const lean = async (gamma: number) => {
      await page.evaluate(
        (gamma) =>
          dispatchEvent(
            new DeviceOrientationEvent("deviceorientation", {
              beta: 75,
              gamma,
            }),
          ),
        gamma,
      );
      return portrait.evaluate((element) =>
        element.style.getPropertyValue("--tilt-x"),
      );
    };
    await expect.poll(() => lean(30)).toBe("6px");
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-test-hidden", "");
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(await lean(-30)).toBe("6px");
    await page.evaluate(() => {
      document.documentElement.removeAttribute("data-test-hidden");
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect.poll(() => lean(-30)).toBe("-6px");
    await page
      .locator("#contact")
      .evaluate((element) => element.scrollIntoView({ behavior: "instant" }));
    await expect(page.locator("#contact")).toBeInViewport();
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    await page.evaluate(() =>
      document.dispatchEvent(new Event("visibilitychange")),
    );
    expect(await lean(30)).toBe("-6px");
  });
});

for (const preference of ["reduced", "forced", "print"] as const) {
  test(`${preference} motion cleanup is terminal for this visit`, async ({
    browserName,
    page,
  }) => {
    test.skip(
      preference === "forced" && browserName !== "chromium",
      "Forced colors are emulated in Chromium.",
    );
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    await expect(page.locator(".toolbox > .zoom-ready")).toHaveCount(5);
    if (preference === "reduced")
      await page.emulateMedia({ reducedMotion: "reduce" });
    if (preference === "forced")
      await page.emulateMedia({ forcedColors: "active" });
    if (preference === "print") await page.emulateMedia({ media: "print" });
    await expect(
      page.locator(".zoom-ready, .is-zooming, .is-tracing"),
    ).toHaveCount(0);
    await page.emulateMedia({
      reducedMotion: "no-preference",
      forcedColors: "none",
      media: "screen",
    });
    await page
      .locator("#about")
      .evaluate((element) => element.scrollIntoView({ behavior: "instant" }));
    await expect(
      page.locator(".zoom-ready, .is-zooming, .is-tracing"),
    ).toHaveCount(0);
    await expect(page.locator(".hero-portrait")).toHaveCSS(
      "animation-name",
      "none",
    );
    await expect(page.locator("#about .speech-bubble")).toHaveCSS(
      "scale",
      "none",
    );
  });
}

test("portfolio visual checkpoints keep projects and contact unobstructed", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    for (const id of ["intro", "work", "about", "contact"]) {
      await page
        .locator(`#${id}`)
        .evaluate((element) => element.scrollIntoView({ behavior: "instant" }));
      await expect(
        page.locator(".part-hud, .part-rail, .part-orb"),
      ).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(`portfolio-${id}-${width}.png`),
      });
    }
  }
});
