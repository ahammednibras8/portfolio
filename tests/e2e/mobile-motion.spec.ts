import { expect, type Page, test } from "@playwright/test";

const freezeGestures = (page: Page) =>
  page.addInitScript(() => {
    new MutationObserver((records) => {
      for (const { target } of records) {
        if (!(target instanceof Element) || !target.matches(".icon-active"))
          continue;
        for (const animation of target.getAnimations({ subtree: true }))
          if (
            animation instanceof CSSAnimation &&
            animation.animationName.startsWith("icon-") &&
            animation.playState !== "finished"
          )
            animation.pause();
      }
    }).observe(document, {
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
  });

test.describe("mobile motion budget", () => {
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "Touch pointer emulation uses Chromium.",
  );
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 412, height: 915 },
  });

  test("touch feedback, arrivals, and finite icon gestures use the coarse timing budget", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await freezeGestures(page);
    await page.addInitScript(() => {
      document.addEventListener("DOMContentLoaded", () => {
        for (const element of document.querySelectorAll(
          "#intro > .hero-portrait, #intro > .speech-bubble",
        ))
          for (const animation of element.getAnimations())
            if (
              animation instanceof CSSAnimation &&
              ["portrait-arrive", "hero-arrive"].includes(
                animation.animationName,
              )
            )
              animation.pause();
      });
    });
    await page.goto("/");
    expect(
      await page.evaluate(() => matchMedia("(pointer: coarse)").matches),
    ).toBe(true);
    const timing = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      const tokens = [
        "--motion-short",
        "--motion-standard",
        "--motion-route",
        "--motion-arrival",
        "--motion-stagger",
        "--motion-gesture",
      ].map((name) => {
        const value = style.getPropertyValue(name).trim();
        return parseFloat(value) * (value.endsWith("ms") ? 1 : 1000);
      });
      const arrivals = [
        ...document.querySelectorAll(
          "#intro > .hero-portrait, #intro > .speech-bubble",
        ),
      ].flatMap((element) => {
        const animations = element
          .getAnimations()
          .filter(
            (animation) =>
              animation instanceof CSSAnimation &&
              ["portrait-arrive", "hero-arrive"].includes(
                animation.animationName,
              ),
          );
        const durations = animations.map(
          (animation) => animation.effect?.getTiming().duration,
        );
        for (const animation of animations) animation.finish();
        return durations;
      });
      return { tokens, arrivals };
    });
    expect(timing.tokens).toEqual([90, 140, 180, 400, 24, 620]);
    expect(timing.arrivals).toEqual([400, 400]);
    const button = page.getByRole("link", { name: "See my work", exact: true });
    await button.scrollIntoViewIfNeeded();
    const icon = button.locator("svg");
    await expect(icon).not.toHaveClass(/icon-active/);
    expect(
      await icon.evaluate(
        (element) => element.getAnimations({ subtree: true }).length,
      ),
    ).toBe(0);
    await button.dispatchEvent("pointerdown", {
      pointerType: "touch",
      button: 0,
    });
    await expect(icon).toHaveClass(/icon-active/);
    const gestures = await icon.evaluate((element) => ({
      outer: element
        .getAnimations()
        .filter((animation) => animation instanceof CSSAnimation).length,
      parts: element
        .getAnimations({ subtree: true })
        .filter((animation) => animation instanceof CSSAnimation)
        .map((animation) => ({
          duration: animation.effect?.getTiming().duration,
          iterations: animation.effect?.getTiming().iterations,
          delay: animation.effect?.getTiming().delay,
          state: animation.playState,
        })),
    }));
    expect(gestures.outer).toBe(0);
    expect(gestures.parts).toEqual([
      { duration: 620, iterations: 1, delay: 0, state: "paused" },
      { duration: 620, iterations: 1, delay: 0, state: "paused" },
    ]);
    await expect(button).toHaveCSS("scale", "0.985");
    await expect(button).toHaveCSS("transition-duration", "0.09s");
    await button.dispatchEvent("pointercancel", { pointerType: "touch" });
    await expect(button).toHaveCSS("scale", "none");
    await expect(button).toHaveCSS("background-size", "0% 100%");
    const durations = await button.evaluate((element) =>
      getComputedStyle(element).transitionDuration.split(", ").map(parseFloat),
    );
    expect(durations[0]).toBeCloseTo(0.27);
    // Releasing a press leaves its gesture free to complete.
    await expect(icon).toHaveClass(/icon-active/);
    await icon.evaluate(async (element) => {
      const animations = element
        .getAnimations({ subtree: true })
        .filter((animation) => animation instanceof CSSAnimation);
      for (const animation of animations) animation.finish();
      await Promise.allSettled(animations.map(({ finished }) => finished));
    });
    await expect(icon).not.toHaveClass(/icon-active/);
    await button.tap();
    await expect(page).toHaveURL(/#work$/);
    await expect(
      page.getByRole("heading", { name: "Selected work", exact: true }),
    ).toBeInViewport();
  });

  test("startup reads all entrance positions before writing waiting classes", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.addInitScript(() => {
      const read = Element.prototype.getBoundingClientRect;
      const add = DOMTokenList.prototype.add;
      let writing = false;
      let before = 0;
      let after = 0;
      Element.prototype.getBoundingClientRect = function () {
        if (this.closest("main")) {
          if (writing) after++;
          else before++;
          document.documentElement.dataset.entranceReads = JSON.stringify({
            before,
            after,
          });
        }
        return read.call(this);
      };
      DOMTokenList.prototype.add = function (...tokens) {
        if (tokens.includes("zoom-ready")) writing = true;
        return add.apply(this, tokens);
      };
    });
    await page.goto("/");
    await expect(page.locator(".toolbox > .zoom-ready")).toHaveCount(5);
    const reads = await page
      .locator("html")
      .getAttribute("data-entrance-reads");
    expect(reads).not.toBeNull();
    const { before, after } = JSON.parse(reads ?? "{}");
    expect(before).toBeGreaterThan(20);
    expect(after).toBe(0);
  });

  test("pen input runs one gesture without consuming native activation", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await freezeGestures(page);
    await page.goto("/");
    const button = page.getByRole("link", { name: "See my work", exact: true });
    await button.scrollIntoViewIfNeeded();
    const result = await button.evaluate((element) => {
      const icon = element.querySelector("svg");
      if (!icon) throw new Error("Expected the action icon.");
      const pointer = () =>
        new PointerEvent("pointerdown", {
          pointerType: "pen",
          button: 0,
          isPrimary: true,
          bubbles: true,
          cancelable: true,
        });
      const first = pointer();
      element.dispatchEvent(first);
      const animations = icon
        .getAnimations({ subtree: true })
        .filter((animation) => animation instanceof CSSAnimation);
      for (const animation of animations) {
        animation.pause();
        animation.currentTime = 310;
      }
      const second = pointer();
      element.dispatchEvent(second);
      (element as HTMLElement).focus();
      const after = icon
        .getAnimations({ subtree: true })
        .filter((animation) => animation instanceof CSSAnimation);
      return {
        count: animations.length,
        prevented: first.defaultPrevented || second.defaultPrevented,
        sameAnimations:
          animations.length === after.length &&
          after.every((animation, index) => animation === animations[index]),
        times: after.map(({ currentTime }) => currentTime),
      };
    });
    expect(result).toEqual({
      count: 2,
      prevented: false,
      sameAnimations: true,
      times: [310, 310],
    });
    await button.dispatchEvent("pointerup", { pointerType: "pen", button: 0 });
    const icon = button.locator("svg");
    await expect(icon).toHaveClass(/icon-active/);
    await icon.evaluate(async (element) => {
      const animations = element
        .getAnimations({ subtree: true })
        .filter((animation) => animation instanceof CSSAnimation);
      for (const animation of animations) animation.finish();
      await Promise.allSettled(animations.map(({ finished }) => finished));
    });
    await expect(icon).not.toHaveClass(/icon-active/);
    await button.dispatchEvent("pointerdown", {
      pointerType: "pen",
      button: 0,
    });
    await expect(icon).toHaveClass(/icon-active/);
    await button.dispatchEvent("pointerup", { pointerType: "pen", button: 0 });
    await button.evaluate((element) => (element as HTMLElement).click());
    await expect(page).toHaveURL(/#work$/);
    await expect(
      page.getByRole("heading", { name: "Selected work", exact: true }),
    ).toBeInViewport();
  });

  test("touch interaction never requests sensors, registers sensor listeners, or vibrates", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.addInitScript(() => {
      const calls = { permissions: 0, listeners: [] as string[], haptics: 0 };
      const record = () =>
        document.documentElement?.setAttribute(
          "data-sensor-probe",
          JSON.stringify(calls),
        );
      const add = EventTarget.prototype.addEventListener;
      EventTarget.prototype.addEventListener = function (
        type,
        listener,
        options,
      ) {
        if (
          [
            "deviceorientation",
            "deviceorientationabsolute",
            "devicemotion",
          ].includes(type)
        ) {
          calls.listeners.push(type);
          record();
        }
        return add.call(this, type, listener, options);
      };
      const requestPermission = () => {
        calls.permissions++;
        record();
        return Promise.resolve("granted");
      };
      Object.assign(DeviceOrientationEvent, { requestPermission });
      Object.assign(DeviceMotionEvent, { requestPermission });
      Object.defineProperty(navigator, "vibrate", {
        configurable: true,
        value: () => {
          calls.haptics++;
          record();
          return true;
        },
      });
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => document.documentElement.hasAttribute("data-test-hidden"),
      });
      document.addEventListener("DOMContentLoaded", record);
    });
    await page.goto("/");
    const portrait = page.locator(".hero-portrait");
    await portrait.evaluate(async (element) => {
      const animations = element.getAnimations();
      for (const animation of animations) animation.finish();
      await Promise.allSettled(animations.map(({ finished }) => finished));
    });
    await portrait.locator("img").tap();
    const result = await portrait.evaluate(async (element) => {
      if (!(element instanceof HTMLElement))
        throw new Error("Expected the portrait.");
      const style = element.style;
      const original = style.setProperty.bind(style);
      const writes: string[] = [];
      style.setProperty = (name, value, priority) => {
        if (name === "--tilt-x" || name === "--tilt-y") writes.push(name);
        original(name, value, priority);
      };
      const frame = () =>
        new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const sensors = () => {
        for (let index = 0; index < 30; index++) {
          dispatchEvent(
            new DeviceOrientationEvent("deviceorientation", {
              beta: 45 + index,
              gamma: index,
            }),
          );
          dispatchEvent(new Event("devicemotion"));
        }
      };
      try {
        sensors();
        await frame();
        document.documentElement.setAttribute("data-test-hidden", "");
        document.dispatchEvent(new Event("visibilitychange"));
        sensors();
        await frame();
        document.documentElement.removeAttribute("data-test-hidden");
        document.dispatchEvent(new Event("visibilitychange"));
        sensors();
        await frame();
        return {
          writes,
          x: style.getPropertyValue("--tilt-x"),
          y: style.getPropertyValue("--tilt-y"),
          translate: getComputedStyle(element).translate,
        };
      } finally {
        style.setProperty = original;
      }
    });
    expect(result).toEqual({ writes: [], x: "", y: "", translate: "none" });
    for (const reducedMotion of ["reduce", "no-preference"] as const) {
      await page.emulateMedia({ reducedMotion });
      await portrait.locator("img").tap();
    }
    await page.getByRole("link", { name: "See my work", exact: true }).tap();
    await expect(page).toHaveURL(/#work$/);
    await expect(page.locator("html")).not.toHaveClass(/is-touch/);
    await expect(page.locator("html")).toHaveAttribute(
      "data-sensor-probe",
      JSON.stringify({ permissions: 0, listeners: [], haptics: 0 }),
    );
  });
});
