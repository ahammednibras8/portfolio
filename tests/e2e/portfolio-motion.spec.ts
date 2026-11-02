import { expect, type Page, test } from "@playwright/test";
import { freezeHero } from "../helpers/motion";

// Pause new finite gestures before a slow assertion can outlive them.
const freezeEntrancesAndIcons = (page: Page) =>
  page.addInitScript(() => {
    const pause = (element: Element) => {
      for (const animation of element.getAnimations({ subtree: true })) {
        if (
          animation instanceof CSSAnimation &&
          (animation.animationName === "zoom-in" ||
            animation.animationName.startsWith("icon-")) &&
          animation.playState !== "finished"
        )
          animation.pause();
      }
    };
    new MutationObserver((records) => {
      for (const { target } of records)
        if (
          target instanceof Element &&
          target.matches(".is-zooming, .icon-active")
        )
          pause(target);
    }).observe(document, {
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
  });

test("the hero settles around a solid, stationary name", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await freezeHero(page);
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
  expect(samples.map(({ delay }) => delay)).toEqual([60, 120]);
  expect(samples[0]?.frames[0]?.scale).toBeCloseTo(0.96);
  expect(samples[0]?.frames[0]?.opacity).toBeCloseTo(0.92);
  expect(samples[1]?.frames[0]?.scale).toBeCloseTo(0.985);
  for (const { duration, frames, iterations } of samples) {
    expect(duration).toBe(640);
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
  await expect(page.locator("h1")).toHaveCSS("transform", "none");
  expect(samples[1]?.frames.every(({ opacity }) => opacity === 1)).toBe(true);
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

test("desktop motion uses one shared timing and easing vocabulary", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const tokens = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      durations: [
        "short",
        "standard",
        "deliberate",
        "route",
        "arrival",
        "stagger",
        "gesture",
      ].map((name) => {
        const value = style.getPropertyValue(`--motion-${name}`).trim();
        return parseFloat(value) * (value.endsWith("ms") ? 1 : 1000);
      }),
      easings: ["settle", "fluid", "spring"].map((name) =>
        style
          .getPropertyValue(`--motion-ease-${name}`)
          .match(/[\d.]+/g)
          ?.map(Number),
      ),
    };
  });
  expect(tokens).toEqual({
    durations: [120, 220, 260, 300, 640, 45, 900],
    easings: [
      [0.22, 0.61, 0.36, 1],
      [0.45, 0, 0.55, 1],
      [0.22, 1.12, 0.36, 1],
    ],
  });
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
    await freezeHero(page);
    await page.goto("/");
    await page.evaluate(async () => {
      await document.fonts.ready;
      for (const element of document.querySelectorAll(
        "#intro > .hero-portrait, #intro > .speech-bubble, .hero-name",
      )) {
        if (!element.getAnimations().length)
          throw new Error("Expected a paused hero animation to sample.");
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
  await freezeEntrancesAndIcons(page);
  await page.goto("/");
  await expect(page.locator(".project-list > .zoom-ready")).toHaveCount(6);
  await page
    .locator("#work")
    .evaluate((element) => element.scrollIntoView({ behavior: "instant" }));
  await expect(page.locator(".project-list > .is-zooming")).toHaveCount(6);
  const samples = await page
    .locator(".project-list > li")
    .evaluateAll((pieces) =>
      Promise.all(
        pieces.map(async (piece) => {
          const animation = piece
            .getAnimations()
            .find(
              (entry) => (entry as CSSAnimation).animationName === "zoom-in",
            );
          if (!animation?.effect)
            throw new Error("Expected a project entrance.");
          animation.pause();
          const timing = animation.effect.getTiming();
          const frames = [0, 0.5, 1].map((progress) => {
            animation.currentTime =
              Number(timing.delay) + Number(timing.duration) * progress;
            const style = getComputedStyle(piece);
            const box = piece.getBoundingClientRect();
            return {
              scale: style.scale === "none" ? 1 : Number(style.scale),
              opacity: style.opacity,
              translate: style.translate,
              transform: style.transform,
              x: box.left + box.width / 2,
              y: box.top + box.height / 2,
            };
          });
          animation.finish();
          await Promise.allSettled([animation.finished]);
          return { timing, frames };
        }),
      ),
    );
  expect(samples.map(({ timing }) => Math.round(timing.delay ?? 0))).toEqual([
    0, 45, 90, 135, 135, 135,
  ]);
  expect(
    samples.every(
      ({ timing }) => timing.duration === 640 && timing.iterations === 1,
    ),
  ).toBe(true);
  for (const { frames } of samples) {
    expect(frames[0]?.scale).toBeCloseTo(0.975);
    expect(frames[2]?.scale).toBe(1);
    for (const frame of frames) {
      expect(frame.opacity).toBe("1");
      expect(frame.translate).toBe("none");
      expect(frame.transform).toBe("none");
      expect(frame.x).toBeCloseTo(frames[0]?.x ?? NaN, 1);
      expect(frame.y).toBeCloseTo(frames[0]?.y ?? NaN, 1);
    }
  }
  await expect(
    page.locator(".project-list > :is(.zoom-ready, .is-zooming)"),
  ).toHaveCount(0);
  expect(
    await page
      .locator(".project-list > li")
      .evaluateAll((pieces) =>
        pieces.every(
          (piece) =>
            (piece as HTMLElement).style.getPropertyValue("--zoom-order") ===
            "",
        ),
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

test.describe("touch gesture lifecycle", () => {
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "Touch-only pointer emulation uses Chromium.",
  );
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 412, height: 915 },
  });

  for (const preference of ["reduced", "hidden"] as const) {
    test(`${preference} cancels a gesture until a fresh interaction`, async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await freezeEntrancesAndIcons(page);
      await page.addInitScript(() => {
        Object.defineProperty(document, "hidden", {
          configurable: true,
          get: () => document.documentElement.hasAttribute("data-test-hidden"),
        });
      });
      await page.goto("/");
      const button = page.getByRole("link", {
        name: "See my work",
        exact: true,
      });
      const icon = button.locator("svg");
      await button.scrollIntoViewIfNeeded();
      await expect(icon).not.toHaveClass(/icon-active/);
      await button.dispatchEvent("pointerdown", {
        pointerType: "touch",
        button: 0,
      });
      await expect(icon).toHaveClass(/icon-active/);
      expect(
        await icon.evaluate((element) =>
          element
            .getAnimations({ subtree: true })
            .some(
              (animation) =>
                animation instanceof CSSAnimation &&
                animation.animationName.startsWith("icon-") &&
                animation.playState === "paused",
            ),
        ),
      ).toBe(true);

      if (preference === "reduced")
        await page.emulateMedia({ reducedMotion: "reduce" });
      else
        await page.evaluate(() => {
          document.documentElement.setAttribute("data-test-hidden", "");
          document.dispatchEvent(new Event("visibilitychange"));
        });
      await expect(page.locator(".icon-active, .is-pressed")).toHaveCount(0);
      await button.dispatchEvent("pointerdown", {
        pointerType: "touch",
        button: 0,
      });
      await button.dispatchEvent("pointercancel", { pointerType: "touch" });
      await expect(icon).not.toHaveClass(/icon-active/);
      expect(
        await icon.evaluate(
          (element) =>
            element
              .getAnimations({ subtree: true })
              .filter(
                (animation) =>
                  animation instanceof CSSAnimation &&
                  animation.animationName.startsWith("icon-"),
              ).length,
        ),
      ).toBe(0);

      if (preference === "reduced")
        await page.emulateMedia({ reducedMotion: "no-preference" });
      else
        await page.evaluate(() => {
          document.documentElement.removeAttribute("data-test-hidden");
          document.dispatchEvent(new Event("visibilitychange"));
        });
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
      await expect(icon).not.toHaveClass(/icon-active/);
      await button.dispatchEvent("pointerdown", {
        pointerType: "touch",
        button: 0,
      });
      await expect(icon).toHaveClass(/icon-active/);
      await icon.evaluate(async (element) => {
        const animations = element
          .getAnimations({ subtree: true })
          .filter(
            (animation) =>
              animation instanceof CSSAnimation &&
              animation.animationName.startsWith("icon-"),
          );
        for (const animation of animations) animation.finish();
        await Promise.allSettled(animations.map(({ finished }) => finished));
      });
      await expect(icon).not.toHaveClass(/icon-active/);
      expect(
        await icon.evaluate((element) =>
          (element as SVGElement).style.getPropertyValue(
            "--icon-arrival-delay",
          ),
        ),
      ).toBe("");
      await button.dispatchEvent("pointercancel", { pointerType: "touch" });
      await button.tap();
      await expect(page).toHaveURL(/#work$/);
      await expect(
        page.getByRole("heading", { name: "Selected work", exact: true }),
      ).toBeInViewport();
    });
  }
});

for (const preference of ["reduced", "forced", "print"] as const) {
  test(`${preference} leaves reading arrivals settled for this visit`, async ({
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
    await page.bringToFront();
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
