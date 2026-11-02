import { expect, type Locator, type Page, test } from "@playwright/test";

const prepare = async (page: Page) => {
  await page.addInitScript(() => {
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
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await page.evaluate(async () => {
    await document.fonts.ready;
    document.documentElement.style.scrollBehavior = "auto";
    for (const animation of document.getAnimations())
      if (
        animation instanceof CSSAnimation &&
        !animation.animationName.startsWith("icon-")
      )
        animation.finish();
  });
  await expect(page.locator(".sticker-wave svg")).toHaveClass(/icon-active/);
};

const frame = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );

const scrollTo = async (page: Page, top: number) => {
  await page.evaluate(
    (top) => window.scrollTo({ top, behavior: "instant" }),
    top,
  );
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(top);
  await frame(page);
};

const finish = async (icon: Locator) => {
  await icon.evaluate(async (element) => {
    const animations = element
      .getAnimations({ subtree: true })
      .filter(
        (animation) =>
          animation instanceof CSSAnimation &&
          animation.animationName.startsWith("icon-"),
      );
    if (!animations.length) throw new Error("Expected a finite icon gesture.");
    const done = animations.map((animation) => animation.finished);
    for (const animation of animations) animation.finish();
    await Promise.all(done);
  });
  await expect(icon).not.toHaveClass(/icon-active/);
};

test("native scrolling keeps action icons idle and does not move their layout", async ({
  page,
}) => {
  await prepare(page);
  const owner = page.locator(".hero-contact");
  const icon = owner.locator("svg");
  const before = await owner.boundingBox();
  await page.mouse.wheel(0, 120);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(20);
  await frame(page);
  const down = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, -60);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(down);
  const after = await owner.boundingBox();
  expect(before).not.toBeNull();
  expect(after?.width).toBeCloseTo(before?.width ?? 0, 2);
  expect(after?.height).toBeCloseTo(before?.height ?? 0, 2);
  await expect(icon).not.toHaveClass(/icon-active/);
  await expect(icon).toHaveCSS("animation-name", "none");
  await expect(icon.locator("path").first()).toHaveCSS(
    "animation-name",
    "none",
  );
  await expect(page.locator(".is-backward, .icon-loop")).toHaveCount(0);
  await expect(page.locator("html")).not.toHaveClass(/icon-loops-backward/);
});

test("scroll direction and jitter never seek, reverse, or restart an active gesture", async ({
  page,
}) => {
  await prepare(page);
  const icon = page.locator(".hero-contact svg");
  await page.locator(".hero-contact").dispatchEvent("pointerover", {
    pointerType: "mouse",
  });
  await expect(icon).toHaveClass(/icon-active/);
  const sample = (initial: boolean) =>
    icon.evaluate(async (element, initial) => {
      const animations = element
        .getAnimations({ subtree: true })
        .filter((animation) => animation instanceof CSSAnimation);
      await Promise.all(animations.map((animation) => animation.ready));
      return animations.map((animation, index) => {
        if (initial) {
          animation.id = "native-scroll-" + index;
          const timing = animation.effect?.getTiming();
          animation.currentTime =
            Number(timing?.delay) + Number(timing?.duration) * 0.42;
        }
        const target = (animation.effect as KeyframeEffect).target as Element;
        const style = getComputedStyle(target);
        return {
          id: animation.id,
          time: animation.currentTime,
          direction: animation.effect?.getTiming().direction,
          rate: animation.playbackRate,
          opacity: style.opacity,
          translate: style.translate,
        };
      });
    }, initial);
  const before = await sample(true);
  expect(before.length).toBeGreaterThan(0);
  for (const position of [100, 99, 98, 60, 120]) {
    await scrollTo(page, position);
    expect(await sample(false)).toEqual(before);
  }
  expect(
    before.every(({ direction, rate }) => direction === "normal" && rate === 1),
  ).toBe(true);
  await expect(icon).toHaveAttribute("data-test-gestures", "1");
});

test("scrolling fully offscreen cancels the active animation and returning does not replay it", async ({
  page,
}) => {
  await prepare(page);
  const hand = page.locator(".sticker-wave svg");
  const original = await hand.evaluateHandle(
    (element) => element.getAnimations({ subtree: true })[0],
  );
  await page
    .locator("#contact")
    .evaluate((element) => element.scrollIntoView({ behavior: "instant" }));
  await expect(hand).not.toHaveClass(/icon-active/);
  expect(await original.evaluate((animation) => animation?.playState)).toBe(
    "idle",
  );
  expect(
    await hand.evaluate(
      (element) => element.getAnimations({ subtree: true }).length,
    ),
  ).toBe(0);
  await scrollTo(page, 0);
  await expect(hand).not.toHaveClass(/icon-active/);
  await expect(hand).toHaveAttribute("data-test-gestures", "1");
  await page.locator(".sticker-wave").dispatchEvent("pointerover", {
    pointerType: "mouse",
  });
  await expect(hand).toHaveClass(/icon-active/);
  await expect(hand).toHaveAttribute("data-test-gestures", "2");
  await original.dispose();
});

test("a completed greeting stays completed after scrolling away and back", async ({
  page,
}) => {
  await prepare(page);
  const hand = page.locator(".sticker-wave svg");
  await finish(hand);
  await page
    .locator("#contact")
    .evaluate((element) => element.scrollIntoView({ behavior: "instant" }));
  await frame(page);
  await scrollTo(page, 0);
  await expect(hand).not.toHaveClass(/icon-active/);
  await expect(hand).toHaveAttribute("data-test-gestures", "1");
  await expect(hand.locator("path").first()).toHaveCSS(
    "animation-name",
    "none",
  );
});

test("a greeting starts at one-quarter visibility, not at the viewport edge", async ({
  browserName,
  page,
}) => {
  test.skip(browserName !== "chromium", "Exact edge geometry uses Chromium.");
  await prepare(page);
  // Move an as-yet unseen icon out of its card clipping. The application's
  // observer still owns this same element and receives real intersections.
  await page.locator("#contact .lucide-mail").evaluate((element) => {
    document.querySelector("main")?.append(element);
    Object.assign((element as SVGElement).style, {
      position: "fixed",
      top: innerHeight + "px",
      left: "16px",
      width: "40px",
      height: "40px",
      scale: "none",
      rotate: "none",
      translate: "none",
    });
  });
  const icon = page.locator("main > .lucide-mail");
  const intersection = () =>
    icon.evaluate(
      (element) =>
        new Promise<{ ratio: number; intersects: boolean }>((resolve) => {
          const observer = new IntersectionObserver(([entry]) => {
            if (!entry) return;
            observer.disconnect();
            resolve({
              ratio: entry.intersectionRatio,
              intersects: entry.isIntersecting,
            });
          });
          observer.observe(element);
        }),
    );
  expect(await intersection()).toEqual({ ratio: 0, intersects: true });
  await expect(icon).not.toHaveClass(/icon-active/);
  await icon.evaluate((element) => {
    (element as SVGElement).style.top = innerHeight - 8 + "px";
  });
  expect((await intersection()).ratio).toBeCloseTo(0.2, 3);
  await expect(icon).not.toHaveClass(/icon-active/);
  await icon.evaluate((element) => {
    (element as SVGElement).style.top = innerHeight - 10 + "px";
  });
  expect((await intersection()).ratio).toBeCloseTo(0.25, 3);
  await expect(icon).toHaveClass(/icon-active/);
  await expect(icon).toHaveAttribute("data-test-gestures", "1");
});

test("icons encountered while hidden stay still on restoration until interaction", async ({
  page,
}) => {
  await prepare(page);
  const setHidden = (hidden: boolean) =>
    page.evaluate((hidden) => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        value: hidden,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    }, hidden);
  await setHidden(true);
  const owner = page.locator('#contact a[href^="mailto:"]');
  const icon = owner.locator(".lucide-mail");
  await owner.scrollIntoViewIfNeeded();
  await frame(page);
  await expect(page.locator("main .icon-active")).toHaveCount(0);
  await setHidden(false);
  await frame(page);
  await expect(icon).not.toHaveClass(/icon-active/);
  await expect(icon).not.toHaveAttribute("data-test-gestures");
  await owner.focus();
  await expect(icon).toHaveClass(/icon-active/);
});

test("scroll bursts coalesce reading progress without an icon geometry loop", async ({
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
  expect(reads).toBe(1);
});

test.describe("phone native scrolling", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test("scrolling leaves action icons idle and the contact anchor remains native", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "Touch context uses Chromium.");
    await prepare(page);
    await scrollTo(page, 140);
    await scrollTo(page, 80);
    await expect(page.locator(".hero-contact svg")).not.toHaveClass(
      /icon-active/,
    );
    await page.getByRole("link", { name: "Get in touch", exact: true }).tap();
    await expect(page).toHaveURL(/#contact$/);
    await expect(page.locator(".hero-contact svg")).not.toHaveClass(
      /icon-active/,
    );
  });
});
