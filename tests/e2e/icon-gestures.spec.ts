import { expect, type Locator, type Page, test } from "@playwright/test";

// Freeze each gesture as soon as its class is added, before a slow assertion or
// screenshot can consume its lifetime. finish() still exercises app cleanup.
const freezeGestures = (page: Page) =>
  page.addInitScript(() => {
    new MutationObserver((records) => {
      for (const { target, oldValue } of records) {
        if (
          !(target instanceof SVGElement) ||
          !target.matches("svg.lucide.icon-active") ||
          oldValue?.split(/\s+/).includes("icon-active")
        )
          continue;
        target.setAttribute(
          "data-test-gestures",
          String(Number(target.getAttribute("data-test-gestures") ?? 0) + 1),
        );
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
      attributeOldValue: true,
      attributeFilter: ["class"],
    });
  });

const prepare = async (page: Page, path = "/") => {
  await freezeGestures(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(path);
};

const finish = async (icon: Locator) => {
  await icon.evaluate(async (element) => {
    const gestures = element
      .getAnimations({ subtree: true })
      .filter(
        (animation) =>
          animation instanceof CSSAnimation &&
          animation.animationName.startsWith("icon-"),
      );
    if (!gestures.length) throw new Error("Expected an active icon gesture.");
    const done = gestures.map((animation) => animation.finished);
    for (const animation of gestures) animation.finish();
    await Promise.all(done);
  });
  await expect(icon).not.toHaveClass(/icon-active/);
};

const enter = (owner: Locator) =>
  owner.dispatchEvent("pointerover", { pointerType: "mouse" });

test("every icon has a finite part gesture without an animated outer SVG or rest interval", async ({
  page,
}) => {
  await prepare(page);
  // Inspect the CSS contract in one synchronous sample, including icons below
  // the fold. Real event/visibility activation is covered independently below.
  const icons = await page.locator("main svg.lucide").evaluateAll((elements) =>
    elements.map((element) => {
      element.classList.add("icon-active");
      const parts = element
        .getAnimations({ subtree: true })
        .filter(
          (animation) =>
            animation instanceof CSSAnimation &&
            (animation.effect as KeyframeEffect).target?.parentNode === element,
        )
        .map((animation) => {
          const effect = animation.effect as KeyframeEffect;
          return {
            duration: effect.getTiming().duration,
            iterations: effect.getTiming().iterations,
            direction: effect.getTiming().direction,
            offsets: effect.getKeyframes().map((frame) => frame.computedOffset),
          };
        });
      return {
        type: element.getAttribute("class"),
        outer: getComputedStyle(element).animationName,
        parts,
      };
    }),
  );
  expect(icons.length).toBeGreaterThan(20);
  for (const icon of icons) {
    expect(icon.outer, icon.type ?? "icon").toBe("none");
    expect(icon.parts.length, icon.type ?? "icon").toBeGreaterThan(0);
    for (const part of icon.parts) {
      expect(part).toMatchObject({
        duration: 760,
        iterations: 1,
        direction: "normal",
      });
      expect(part.offsets[0]).toBe(0);
      expect(part.offsets.at(-1)).toBe(1);
      expect(part.offsets.some((offset) => offset > 0.375 && offset < 1)).toBe(
        true,
      );
    }
  }
});

test("decorative icons greet once with arrival delays while action and lifecycle icons wait for interaction", async ({
  page,
}) => {
  await prepare(page);
  const hand = page.locator(".sticker-wave svg");
  await expect(hand).toHaveClass(/icon-active/);
  const handTiming = await hand
    .locator("path")
    .first()
    .evaluate((part) => {
      const animation = part.getAnimations()[0];
      return {
        delay: animation?.effect?.getTiming().delay,
        offsets: (animation?.effect as KeyframeEffect)
          .getKeyframes()
          .map((frame) => frame.computedOffset),
      };
    });
  expect(handTiming.delay).toBe(400);
  const waveOffsets = [0, 0.2, 0.4, 0.6, 0.8, 1];
  expect(handTiming.offsets).toHaveLength(waveOffsets.length);
  // Engines expose fractional keyframes at different numeric precision.
  waveOffsets.forEach((offset, index) =>
    expect(handTiming.offsets[index]).toBeCloseTo(offset, 6),
  );
  await expect(page.locator(".hero-cta .icon-active")).toHaveCount(0);
  await finish(hand);
  const title = page.locator("#work .section-title svg");
  await title.scrollIntoViewIfNeeded();
  await expect(title).toHaveClass(/icon-active/);
  const delay = await title.evaluate((element) => ({
    expected:
      120 +
      ([...document.querySelectorAll("main svg.lucide")].indexOf(element) % 4) *
        60,
    actual: parseFloat(
      (element as SVGElement).style.getPropertyValue("--icon-arrival-delay"),
    ),
  }));
  expect(delay.actual).toBe(delay.expected);
  await page.locator(".run-path").scrollIntoViewIfNeeded();
  await expect(page.locator(".run-path .icon-active")).toHaveCount(0);
  await expect(page.locator(".action-arrow.icon-active")).toHaveCount(0);
  await page.locator(".run-path li").first().dispatchEvent("pointerover", {
    pointerType: "mouse",
  });
  await expect(page.locator(".run-path li").first().locator("svg")).toHaveClass(
    /icon-active/,
  );
});

test("an arrow traverses the normalized gesture and cleanup restores its exact resting pose", async ({
  page,
}) => {
  await prepare(page);
  const owner = page.locator(".hero-contact");
  const icon = owner.locator("svg");
  await enter(owner);
  await expect(icon).toHaveClass(/icon-active/);
  const states = await icon
    .locator("path")
    .first()
    .evaluate(async (part) => {
      const animation = part.getAnimations()[0];
      if (!animation?.effect) throw new Error("Expected an arrow gesture.");
      animation.pause();
      await animation.ready;
      const timing = animation.effect.getTiming();
      return [0, 0.42, 0.43, 1].map((progress) => {
        animation.currentTime =
          (timing.delay ?? 0) + Number(timing.duration) * progress;
        const style = getComputedStyle(part);
        return {
          opacity: Number(style.opacity),
          translate: parseFloat(style.translate) || 0,
        };
      });
    });
  const expected = [
    { opacity: 1, translate: 0 },
    { opacity: 0, translate: 9 },
    { opacity: 0, translate: -9 },
    { opacity: 1, translate: 0 },
  ];
  expect(states).toHaveLength(expected.length);
  for (const [index, state] of states.entries()) {
    expect(state.opacity).toBeCloseTo(expected[index]?.opacity ?? NaN, 3);
    expect(state.translate).toBeCloseTo(expected[index]?.translate ?? NaN, 3);
  }
  await finish(icon);
  await expect(icon.locator("path").first()).toHaveCSS(
    "animation-name",
    "none",
  );
  await expect(icon.locator("path").first()).toHaveCSS("opacity", "1");
  await expect(icon.locator("path").first()).toHaveCSS("translate", "none");
});

test("short exits and rapid reentry preserve a gesture; a later entry can replay it", async ({
  page,
}) => {
  await prepare(page);
  const owner = page.locator(".hero-contact");
  const icon = owner.locator("svg");
  await enter(owner);
  await expect(icon).toHaveClass(/icon-active/);
  const original = await icon.evaluateHandle((element) =>
    element
      .getAnimations({ subtree: true })
      .filter((animation) => animation instanceof CSSAnimation),
  );
  await owner.dispatchEvent("pointerout", { pointerType: "mouse" });
  await expect(icon).toHaveClass(/icon-active/);
  await enter(owner);
  expect(
    await icon.evaluate(
      (element, animations) =>
        animations.length > 0 &&
        animations.every((animation) =>
          element.getAnimations({ subtree: true }).includes(animation),
        ),
      original,
    ),
  ).toBe(true);
  await expect(icon).toHaveAttribute("data-test-gestures", "1");
  await finish(icon);
  // Crossing between children of one link is not a new owner entry.
  await icon.evaluate((element) =>
    element.dispatchEvent(
      new PointerEvent("pointerover", {
        bubbles: true,
        pointerType: "mouse",
        relatedTarget: element.closest("a"),
      }),
    ),
  );
  await expect(icon).not.toHaveClass(/icon-active/);
  await owner.dispatchEvent("pointerout", { pointerType: "mouse" });
  await enter(owner);
  await expect(icon).toHaveAttribute("data-test-gestures", "2");
  await expect(icon).toHaveClass(/icon-active/);
  expect(
    await icon.evaluate(
      (element, animations) =>
        animations.some((animation) =>
          element.getAnimations({ subtree: true }).includes(animation),
        ),
      original,
    ),
  ).toBe(false);
  await original.dispose();
});

test("cleanup waits for the last delayed part of a multi-part gesture", async ({
  page,
}) => {
  await prepare(page);
  const owner = page.locator("#cascade > .sticker");
  const icon = owner.locator(".lucide-layers");
  await owner.scrollIntoViewIfNeeded();
  await expect(icon).toHaveClass(/icon-active/);
  const timing = await icon.evaluate(async (element) => {
    const animations = element
      .getAnimations({ subtree: true })
      .filter((animation) => animation instanceof CSSAnimation)
      .sort(
        (left, right) =>
          Number(left.effect?.getTiming().delay) -
          Number(right.effect?.getTiming().delay),
      );
    if (animations.length !== 2) throw new Error("Expected two moving layers.");
    const [first, last] = animations;
    if (!first || !last) throw new Error("Expected both layer animations.");
    const done = first.finished;
    first.finish();
    await done;
    return {
      firstDelay: first.effect?.getTiming().delay,
      lastDelay: last.effect?.getTiming().delay,
      lastDuration: last.effect?.getTiming().duration,
      lastState: last.playState,
    };
  });
  expect(Number(timing.lastDelay) - Number(timing.firstDelay)).toBeCloseTo(
    80,
    3,
  );
  expect(timing.lastDuration).toBe(760);
  expect(timing.lastState).toBe("paused");
  await expect(icon).toHaveClass(/icon-active/);
  await finish(icon);
  await expect(icon).not.toHaveAttribute("style", /--icon-arrival-delay/);
});

test("keyboard focus plays an action gesture and preserves the link focus indicator", async ({
  page,
}) => {
  await prepare(page);
  const owner = page.locator(".hero-action");
  const icon = owner.locator("svg");
  await owner.focus();
  await expect(icon).toHaveClass(/icon-active/);
  await expect(owner).toHaveCSS("outline-style", "solid");
  await finish(icon);
  await owner.evaluate((element) => element.blur());
  await owner.focus();
  await expect(icon).toHaveAttribute("data-test-gestures", "2");
});

for (const pointerType of ["touch", "pen"]) {
  test(
    pointerType + " starts one gesture without cancelling native pointerdown",
    async ({ page }) => {
      await prepare(page);
      const owner = page.locator(".hero-action");
      const icon = owner.locator("svg");
      const native = await owner.evaluate((element, pointerType) => {
        const event = new PointerEvent("pointerdown", {
          bubbles: true,
          cancelable: true,
          button: 0,
          pointerType,
        });
        return element.dispatchEvent(event) && !event.defaultPrevented;
      }, pointerType);
      expect(native).toBe(true);
      await expect(icon).toHaveClass(/icon-active/);
      await owner.dispatchEvent("pointerdown", { pointerType, button: 0 });
      await expect(icon).toHaveAttribute("data-test-gestures", "1");
      await finish(icon);
      await expect(page.locator("html")).not.toHaveClass(/is-touch/);
    },
  );
}

for (const mode of ["reduce", "print", "forced"] as const) {
  test(
    mode + " cancels motion and clearing it requires a fresh interaction",
    async ({ page, browserName }) => {
      test.skip(mode === "forced" && browserName !== "chromium");
      await prepare(page);
      const hand = page.locator(".sticker-wave svg");
      await expect(hand).toHaveClass(/icon-active/);
      await page.emulateMedia({
        reducedMotion: mode === "reduce" ? "reduce" : "no-preference",
        media: mode === "print" ? "print" : "screen",
        forcedColors: mode === "forced" ? "active" : "none",
      });
      await expect(page.locator("main .icon-active")).toHaveCount(0);
      await enter(page.locator(".sticker-wave"));
      await expect(hand.locator("path").first()).toHaveCSS(
        "animation-name",
        "none",
      );
      await page.emulateMedia({
        reducedMotion: "no-preference",
        media: "screen",
        forcedColors: "none",
      });
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
      await expect(hand).not.toHaveClass(/icon-active/);
      await expect(hand).toHaveAttribute("data-test-gestures", "1");
      await enter(page.locator(".sticker-wave"));
      await expect(hand).toHaveClass(/icon-active/);
      await expect(hand).toHaveAttribute("data-test-gestures", "2");
    },
  );
}

test("loading with reduced motion consumes visible greetings without replay on preference restoration", async ({
  page,
}) => {
  await freezeGestures(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const hand = page.locator(".sticker-wave svg");
  await expect(hand).toBeInViewport({ ratio: 0.25 });
  // Wait for the initial intersection delivery while motion is disabled.
  await hand.evaluate(
    (element) =>
      new Promise<void>((resolve) => {
        const observer = new IntersectionObserver(() => {
          observer.disconnect();
          resolve();
        });
        observer.observe(element);
      }),
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(hand).not.toHaveClass(/icon-active/);
  await expect(hand).not.toHaveAttribute("data-test-gestures");
  await page.locator(".hero-action").focus();
  await expect(page.locator(".hero-action svg")).toHaveClass(/icon-active/);
});

test("a hidden document cancels gestures and restoration does not replay visible greetings", async ({
  page,
}) => {
  await prepare(page);
  const hand = page.locator(".sticker-wave svg");
  await expect(hand).toHaveClass(/icon-active/);
  const animation = await hand.evaluateHandle(
    (element) => element.getAnimations({ subtree: true })[0],
  );
  const setHidden = (hidden: boolean) =>
    page.evaluate((hidden) => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        value: hidden,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    }, hidden);
  await setHidden(true);
  await expect(page.locator("main .icon-active")).toHaveCount(0);
  expect(await animation.evaluate((animation) => animation?.playState)).toBe(
    "idle",
  );
  await enter(page.locator(".sticker-wave"));
  await expect(hand).not.toHaveClass(/icon-active/);
  await setHidden(false);
  await expect(hand).not.toHaveClass(/icon-active/);
  await expect(hand).toHaveAttribute("data-test-gestures", "1");
  await enter(page.locator(".sticker-wave"));
  await expect(hand).toHaveAttribute("data-test-gestures", "2");
  await animation.dispose();
});

test("motion needs neither pause controls nor storage access", async ({
  page,
}) => {
  await page.addInitScript(() => {
    for (const name of ["localStorage", "sessionStorage"])
      Object.defineProperty(window, name, {
        configurable: true,
        get: () => {
          document.documentElement.setAttribute("data-storage-read", name);
          throw new DOMException("Storage blocked", "SecurityError");
        },
      });
  });
  await prepare(page);
  const hand = page.locator(".sticker-wave svg");
  await expect(hand).toHaveClass(/icon-active/);
  await finish(hand);
  await page.evaluate(() => dispatchEvent(new Event("pageshow")));
  await expect(hand).not.toHaveClass(/icon-active/);
  await expect(page.locator("html")).not.toHaveAttribute("data-storage-read");
  await expect(page.locator(".icon-motion-toggle, .icon-loop")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /pause icons|resume icons/i }),
  ).toHaveCount(0);
  await expect(page.locator("#intro .route-label")).toHaveText(
    "Software engineer",
  );
});

test("pages without icons do not show an unnecessary motion control", async ({
  page,
}) => {
  await page.goto("/route-that-does-not-exist");
  await expect(page.locator("main svg.lucide")).toHaveCount(0);
  await expect(page.locator(".icon-motion-toggle, .icon-active")).toHaveCount(
    0,
  );
});

test("without JavaScript icon parts stay static and no unusable control is shown", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.locator(".icon-active, .icon-motion-toggle")).toHaveCount(
      0,
    );
    expect(
      await page
        .locator("main svg.lucide, main svg.lucide > *")
        .evaluateAll((elements) =>
          elements.every(
            (element) => getComputedStyle(element).animationName === "none",
          ),
        ),
    ).toBe(true);
  } finally {
    await context.close();
  }
});

test("the offline signal greets once, keeps its slash fixed, and obeys reduced motion", async ({
  page,
}) => {
  await prepare(page, "/offline/");
  const icon = page.locator(".lucide-wifi-off");
  const arc = icon.locator("path").nth(1);
  await expect(icon).toHaveClass(/icon-active/);
  await expect(arc).toHaveCSS("animation-name", "icon-server-light");
  await expect(arc).toHaveCSS("animation-iteration-count", "1");
  await expect(icon).toHaveCSS("animation-name", "none");
  await expect(icon.locator("path").last()).toHaveCSS("animation-name", "none");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(arc).toHaveCSS("animation-name", "none");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(icon).not.toHaveClass(/icon-active/);
  await enter(page.locator(".offline .sticker"));
  await expect(icon).toHaveClass(/icon-active/);
  await finish(icon);
});

test.describe("phone gestures", () => {
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "Touch-only emulation uses Chromium.",
  );
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });

  test("phone gestures use a short finite duration and leave native navigation intact", async ({
    page,
  }) => {
    await prepare(page);
    const hand = page.locator(".sticker-wave svg");
    await expect(hand).toHaveClass(/icon-active/);
    await expect(hand.locator("path").first()).toHaveCSS(
      "animation-duration",
      "0.62s",
    );
    await expect(hand.locator("path").first()).toHaveCSS(
      "animation-iteration-count",
      "1",
    );
    await finish(hand);
    await page.locator(".sticker-wave").tap();
    await expect(hand).toHaveClass(/icon-active/);
    await expect(hand).toHaveCSS("scale", "none");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.locator(".hero-action").tap();
    await expect(page).toHaveURL(/#work$/);
    await expect(page.locator("html")).not.toHaveClass(/is-touch/);
  });
});
