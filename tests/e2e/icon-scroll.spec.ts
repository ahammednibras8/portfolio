import { expect, type Page, test } from "@playwright/test";

const arrow = (page: Page) =>
  page.locator(".hero-contact .lucide-arrow-right > path").first();
const setHidden = (page: Page, hidden: boolean) =>
  page.evaluate((hidden) => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: hidden,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  }, hidden);
const prepare = async (page: Page) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("#intro > .speech-bubble")).toHaveCSS(
    "scale",
    "none",
  );
  await expect(arrow(page)).toHaveCSS("animation-play-state", "running");
};
const scrollTo = async (page: Page, position: number) => {
  await page.evaluate(
    (top) => window.scrollTo({ top, behavior: "instant" }),
    position,
  );
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(position);
  // Let the real scroll event and its coalesced direction frame both run.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
};

test("native scrolling plays down forward and up backward without moving the layout", async ({
  page,
}) => {
  await prepare(page);
  const before = await page.locator(".hero-contact").boundingBox();
  await page.mouse.wheel(0, 120);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(20);
  await expect(arrow(page)).toHaveCSS("animation-direction", "normal");
  await page.mouse.wheel(0, -60);
  await expect(arrow(page)).toHaveCSS("animation-direction", "reverse");
  const after = await page.locator(".hero-contact").boundingBox();
  expect(after?.width).toBeCloseTo(before?.width ?? 0, 2);
  expect(after?.height).toBeCloseTo(before?.height ?? 0, 2);
  await expect(page.locator(".hero-contact .lucide-arrow-right")).toHaveCSS(
    "animation-name",
    "none",
  );
  await page.mouse.wheel(0, 60);
  await expect(arrow(page)).toHaveCSS("animation-direction", "normal");
});

test("direction changes preserve the pose and identity of every moving part", async ({
  page,
}) => {
  await prepare(page);
  await scrollTo(page, 100);
  const snapshot = async (freeze: boolean) =>
    page.locator("main svg.lucide").evaluateAll(async (icons, freeze) => {
      if (freeze) {
        const animations = icons.flatMap((icon) =>
          icon.getAnimations({ subtree: true }),
        );
        for (const animation of animations) animation.pause();
        await Promise.all(animations.map((animation) => animation.ready));
      }
      const properties = [
        "translate",
        "rotate",
        "scale",
        "opacity",
        "stroke-dashoffset",
        "fill-opacity",
      ];
      return icons.flatMap((icon) =>
        icon.getAnimations({ subtree: true }).map((animation, index) => {
          if (freeze) {
            animation.id = `scroll-probe-${icons.indexOf(icon)}-${index}`;
            const timing = animation.effect?.getTiming();
            animation.currentTime =
              Number(timing?.delay ?? 0) + Number(timing?.duration) * 0.18;
          }
          const target = (animation.effect as KeyframeEffect).target as Element;
          const style = getComputedStyle(target);
          return {
            id: animation.id,
            pose: properties.map((property) =>
              style
                .getPropertyValue(property)
                .replace(/-?\d*\.?\d+(?:e[+-]?\d+)?/gi, (value) =>
                  String(Math.round(Number(value) * 1000) / 1000),
                ),
            ),
          };
        }),
      );
    }, freeze);
  const forward = await snapshot(true);
  expect(forward.length).toBeGreaterThan(20);
  await scrollTo(page, 60);
  await expect(arrow(page)).toHaveCSS("animation-direction", "reverse");
  expect(await snapshot(false)).toEqual(forward);
  await scrollTo(page, 100);
  await expect(arrow(page)).toHaveCSS("animation-direction", "normal");
  expect(await snapshot(false)).toEqual(forward);
});

test("background scrolling never seeks icons and visibility restores the saved phase", async ({
  page,
}) => {
  await prepare(page);
  await setHidden(page, true);
  const before = await arrow(page).evaluate(async (element) => {
    const animation = element.getAnimations()[0];
    await animation?.ready;
    return animation?.currentTime;
  });
  await scrollTo(page, 100);
  await scrollTo(page, 50);
  expect(
    await arrow(page).evaluate(
      (element) => element.getAnimations()[0]?.currentTime,
    ),
  ).toBe(before);
  await expect(arrow(page)).toHaveCSS("animation-direction", "normal");
  await setHidden(page, false);
  await expect(arrow(page)).toHaveCSS("animation-play-state", "running");
  await scrollTo(page, 20);
  await expect(arrow(page)).toHaveCSS("animation-direction", "reverse");
});

test("tiny scroll jitter is ignored but slow movement accumulates", async ({
  page,
}) => {
  await prepare(page);
  await scrollTo(page, 100);
  await scrollTo(page, 99);
  await scrollTo(page, 98);
  await expect(arrow(page)).toHaveCSS("animation-direction", "normal");
  await scrollTo(page, 96);
  await expect(arrow(page)).toHaveCSS("animation-direction", "reverse");
});

test("scroll reversals leave offscreen clocks untouched", async ({ page }) => {
  await prepare(page);
  await scrollTo(page, 100);
  const detail = page.locator("#contact .lucide-mail > path");
  const before = await detail.evaluate(async (element) => {
    const animation = element.getAnimations()[0];
    if (!animation) throw new Error("Expected an offscreen icon loop.");
    await animation.ready;
    animation.currentTime =
      Number(animation.effect?.getTiming().delay ?? 0) + 1440;
    return animation.currentTime;
  });
  await scrollTo(page, 60);
  await expect(arrow(page)).toHaveCSS("animation-direction", "reverse");
  await expect(detail).toHaveCSS("animation-play-state", "paused");
  await expect(detail).toHaveCSS("animation-direction", "normal");
  expect(
    await detail.evaluate((element) => element.getAnimations()[0]?.currentTime),
  ).toBe(before);
  await scrollTo(page, 100);
  await expect(arrow(page)).toHaveCSS("animation-direction", "normal");
  expect(
    await detail.evaluate((element) => element.getAnimations()[0]?.currentTime),
  ).toBe(before);
});

test("an icon re-entering while hidden synchronizes direction only when visible", async ({
  page,
}) => {
  await prepare(page);
  await scrollTo(page, 100);
  await scrollTo(page, 60);
  await expect(arrow(page)).toHaveCSS("animation-direction", "reverse");
  await setHidden(page, true);
  const before = await page
    .locator("#contact .lucide-mail")
    .evaluate(async (element) => {
      const animation = element.getAnimations({ subtree: true })[0];
      if (!animation) throw new Error("Expected an offscreen loop.");
      for (
        let parent = element.parentElement;
        parent && parent !== document.querySelector("main");
        parent = parent.parentElement
      ) {
        parent.style.scale = "none";
        parent.style.transform = "none";
      }
      await animation.ready;
      animation.id = "reentry-loop";
      animation.currentTime =
        Number(animation.effect?.getTiming().delay ?? 0) + 1440;
      const clock = Object.getOwnPropertyDescriptor(
        Animation.prototype,
        "currentTime",
      );
      if (!clock?.get || !clock.set)
        throw new Error("Expected an animation clock.");
      element.setAttribute("data-seeks", "0");
      Object.defineProperty(animation, "currentTime", {
        configurable: true,
        get: () => clock.get?.call(animation),
        set(time) {
          element.setAttribute(
            "data-seeks",
            String(Number(element.getAttribute("data-seeks")) + 1),
          );
          clock.set?.call(animation, time);
        },
      });
      const time = animation.currentTime;
      Object.assign((element as SVGElement).style, {
        position: "fixed",
        top: "100px",
        left: "16px",
      });
      return time;
    });
  const returning = page.locator("#contact .lucide-mail");
  await expect(returning).toHaveClass(/is-in-view/);
  await expect(returning.locator("path")).toHaveCSS(
    "animation-direction",
    "normal",
  );
  await expect(returning).toHaveAttribute("data-seeks", "0");
  expect(
    await returning.evaluate(
      (element) => element.getAnimations({ subtree: true })[0]?.currentTime,
    ),
  ).toBe(before);
  await setHidden(page, false);
  await expect(returning.locator("path")).toHaveCSS(
    "animation-direction",
    "reverse",
  );
  await expect(returning.locator("path")).toHaveCSS(
    "animation-play-state",
    "running",
  );
  await expect(returning).toHaveAttribute("data-seeks", "1");
  expect(
    await returning.evaluate(
      (element) => element.getAnimations({ subtree: true })[0]?.id,
    ),
  ).toBe("reentry-loop");
});

for (const direction of ["normal", "reverse"] as const) {
  test(`a restored icon keeps its initial delay when synchronizing to ${direction}`, async ({
    page,
  }) => {
    await prepare(page);
    await scrollTo(page, 100);
    if (direction === "reverse") await scrollTo(page, 60);
    await page.locator("#contact .lucide-mail").evaluate((icon, direction) => {
      icon.classList.toggle("is-backward", direction === "normal");
      (icon as SVGElement).style.setProperty("--icon-loop-delay", "500ms");
    }, direction);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(arrow(page)).toHaveCSS("animation-name", "none");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect(arrow(page)).toHaveCSS("animation-play-state", "running");
    await page.locator("#contact .lucide-mail").evaluate(async (icon) => {
      const animation = icon.getAnimations({ subtree: true })[0];
      const clock = Object.getOwnPropertyDescriptor(
        Animation.prototype,
        "currentTime",
      );
      if (!animation || !clock?.get || !clock.set)
        throw new Error("Expected an animation clock.");
      await animation.ready;
      if (animation.currentTime !== 0)
        throw new Error("Expected a waiting offscreen icon.");
      icon.setAttribute("data-seeks", "0");
      Object.defineProperty(animation, "currentTime", {
        configurable: true,
        get: () => clock.get?.call(animation),
        set(time) {
          icon.setAttribute(
            "data-seeks",
            String(Number(icon.getAttribute("data-seeks")) + 1),
          );
          clock.set?.call(animation, time);
        },
      });
      for (
        let parent = icon.parentElement;
        parent && parent !== document.querySelector("main");
        parent = parent.parentElement
      ) {
        parent.style.scale = "none";
        parent.style.transform = "none";
      }
      animation.id = "delay-probe";
      Object.assign((icon as SVGElement).style, {
        position: "fixed",
        top: "100px",
        left: "16px",
      });
    });
    const returning = page.locator("#contact .lucide-mail");
    await expect(returning).toHaveClass(/is-in-view/);
    await expect(returning.locator("path")).toHaveCSS(
      "animation-direction",
      direction,
    );
    await expect(returning).toHaveAttribute("data-seeks", "0");
    expect(
      await returning.evaluate(
        (icon) => icon.getAnimations({ subtree: true })[0]?.id,
      ),
    ).toBe("delay-probe");
  });
}

test("a burst of scroll events reads page geometry once per frame", async ({
  page,
}) => {
  await prepare(page);
  await scrollTo(page, 100);
  const reads = await page.evaluate(async () => {
    const getter = Object.getOwnPropertyDescriptor(
      Element.prototype,
      "scrollHeight",
    )?.get;
    if (!getter) throw new Error("Expected native scroll geometry.");
    let reads = 0;
    Object.defineProperty(document.documentElement, "scrollHeight", {
      configurable: true,
      get() {
        reads++;
        return getter.call(this);
      },
    });
    try {
      for (let index = 0; index < 20; index++)
        dispatchEvent(new Event("scroll"));
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      return reads;
    } finally {
      Reflect.deleteProperty(document.documentElement, "scrollHeight");
    }
  });
  expect(reads).toBeGreaterThan(0);
  // One reading-progress frame and one icon-direction frame share the burst.
  expect(reads).toBeLessThanOrEqual(2);
});

test("system preferences suppress scroll reversal and do not revive icon motion", async ({
  page,
  browserName,
}) => {
  await prepare(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await scrollTo(page, 100);
  await scrollTo(page, 50);
  await expect(page.locator("html")).not.toHaveClass(/icon-loops-backward/);
  await expect(arrow(page)).toHaveCSS("animation-name", "none");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(arrow(page)).toHaveCSS("animation-play-state", "running");
  await scrollTo(page, 20);
  await expect(arrow(page)).toHaveCSS("animation-direction", "reverse");
  if (browserName === "chromium") {
    await page.emulateMedia({ forcedColors: "active" });
    await scrollTo(page, 100);
    await expect(page.locator("html")).toHaveClass(/icon-loops-backward/);
    await expect(arrow(page)).toHaveCSS("animation-name", "none");
  }
  await page.emulateMedia({ media: "print" });
  await expect(arrow(page)).toHaveCSS("animation-name", "none");
});

test("offscreen startup delays and full-turn boundaries keep the same rendered pose", async ({
  page,
}) => {
  await prepare(page);
  await scrollTo(page, 100);
  const snapshot = async (initial: boolean) =>
    page.locator("main svg.lucide").evaluateAll(async (icons, initial) => {
      const delayed = icons
        .flatMap((icon) =>
          icon.classList.contains("is-in-view")
            ? []
            : icon.getAnimations({ subtree: true }),
        )
        .find(
          (animation) =>
            Number(animation.effect?.getTiming().delay) > 0 &&
            animation.currentTime === 0,
        );
      const rotation = document
        .querySelector(".lucide-rotate-cw > path")
        ?.getAnimations()[0];
      if (!rotation) throw new Error("Expected a recovery loop.");
      if (initial) {
        if (!delayed)
          throw new Error("Expected an untouched delayed offscreen loop.");
        delayed.id = "delayed-scroll-probe";
        rotation.id = "boundary-scroll-probe";
        rotation.pause();
        await rotation.ready;
        const timing = rotation.effect?.getTiming();
        rotation.currentTime = Number(timing?.delay) + Number(timing?.duration);
      }
      return icons
        .flatMap((icon) => icon.getAnimations({ subtree: true }))
        .filter((animation) =>
          ["delayed-scroll-probe", "boundary-scroll-probe"].includes(
            animation.id,
          ),
        )
        .map((animation) => {
          const target = (animation.effect as KeyframeEffect)
            .target as SVGGraphicsElement;
          const matrix = target.getCTM();
          const style = getComputedStyle(target);
          return {
            id: animation.id,
            matrix: matrix
              ? [
                  matrix.a,
                  matrix.b,
                  matrix.c,
                  matrix.d,
                  matrix.e,
                  matrix.f,
                ].map((value) => Math.round(value * 100000) / 100000)
              : null,
            opacity: style.opacity,
            state: animation.playState,
          };
        });
    }, initial);
  const before = await snapshot(true);
  expect(before).toHaveLength(2);
  await scrollTo(page, 60);
  await expect(arrow(page)).toHaveCSS("animation-direction", "reverse");
  expect(await snapshot(false)).toEqual(before);
});

test("a queued direction change is canceled when the document is hidden", async ({
  page,
}) => {
  await prepare(page);
  await scrollTo(page, 100);
  await page.evaluate(() => {
    addEventListener(
      "scroll",
      () => {
        Object.defineProperty(document, "hidden", {
          configurable: true,
          value: true,
        });
        document.dispatchEvent(new Event("visibilitychange"));
      },
      { once: true },
    );
  });
  await scrollTo(page, 60);
  await expect(page.locator("html")).not.toHaveClass(/icon-loops-backward/);
  await expect(arrow(page)).toHaveCSS("animation-play-state", "paused");
});

test.describe("phone scroll direction", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test("touch-screen scrolling reverses without hover and keeps the contact anchor native", async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName !== "chromium",
      "Touch context is exercised in Chromium.",
    );
    await prepare(page);
    await scrollTo(page, 140);
    await scrollTo(page, 80);
    await expect(arrow(page)).toHaveCSS("animation-direction", "reverse");
    await page.getByRole("link", { name: "Get in touch", exact: true }).tap();
    await expect(page).toHaveURL(/#contact$/);
  });
});
