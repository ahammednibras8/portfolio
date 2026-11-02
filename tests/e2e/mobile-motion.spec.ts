import { expect, type Page, test } from "@playwright/test";
import { freezeHero } from "../helpers/motion";

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
    await freezeHero(page);
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
    expect(timing.tokens).toEqual([100, 180, 240, 480, 24, 760]);
    expect(timing.arrivals).toEqual([480, 480]);
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
      { duration: 760, iterations: 1, delay: 0, state: "paused" },
      { duration: 760, iterations: 1, delay: 0, state: "paused" },
    ]);
    await expect(button).toHaveCSS("scale", "0.985");
    await expect(button).toHaveCSS("transition-duration", "0.1s");
    await button.dispatchEvent("pointercancel", { pointerType: "touch" });
    await expect(button).toHaveCSS("scale", "none");
    await expect(button).toHaveCSS("background-size", "0% 100%");
    const durations = await button.evaluate((element) =>
      getComputedStyle(element).transitionDuration.split(", ").map(parseFloat),
    );
    expect(durations[0]).toBeCloseTo(0.36);
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

  test("project cards ease through touch press and release without snapping", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/#work");
    const card = page.locator(".project-list .route-link").first();
    await card.focus();
    await card.evaluate((element) => (element as HTMLElement).blur());
    const result = await card.evaluate((element) => {
      const durations = getComputedStyle(element).transitionDuration;
      const down = new PointerEvent("pointerdown", {
        pointerType: "touch",
        button: 0,
        bubbles: true,
        cancelable: true,
      });
      element.dispatchEvent(down);
      const sample = () => {
        const transition = element
          .getAnimations()
          .find(
            (animation) =>
              animation instanceof CSSTransition &&
              animation.transitionProperty === "scale",
          );
        if (!transition?.effect) throw new Error("Expected eased card scale.");
        transition.pause();
        const duration = Number(transition.effect.getTiming().duration);
        transition.currentTime = duration / 2;
        const midpoint = parseFloat(getComputedStyle(element).scale);
        transition.finish();
        const endpoint = getComputedStyle(element).scale;
        return { duration, midpoint, endpoint };
      };
      const press = sample();
      element.dispatchEvent(
        new PointerEvent("pointercancel", {
          pointerType: "touch",
          bubbles: true,
        }),
      );
      const release = sample();
      return { durations, press, release, prevented: down.defaultPrevented };
    });
    expect(result.durations).toBe("0.24s, 0.24s, 0.18s, 0.1s");
    expect(result.prevented).toBe(false);
    for (const sample of [result.press, result.release]) {
      expect(sample.duration).toBe(100);
      expect(sample.midpoint).toBeGreaterThan(0.985);
      expect(sample.midpoint).toBeLessThan(1);
    }
    expect(result.press.endpoint).toBe("0.985");
    expect(result.release.endpoint).toBe("none");
    await expect(card).not.toHaveClass(/is-pressed/);
  });

  test("mobile lifecycle connectors finish before their highlight is cleaned up", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/#evidence");
    const step = page.locator(".run-path li").first();
    await expect(step).toHaveClass(/is-tracing/);
    const timings = await step.evaluate((element) =>
      element
        .getAnimations({ subtree: true })
        .filter(
          (animation) =>
            animation instanceof CSSAnimation &&
            ["run-step-wash", "run-line-draw"].includes(
              animation.animationName,
            ),
        )
        .map((animation) => ({
          name: (animation as CSSAnimation).animationName,
          ...animation.effect?.getTiming(),
        })),
    );
    const wash = timings.find(({ name }) => name === "run-step-wash");
    const connector = timings.find(({ name }) => name === "run-line-draw");
    expect(wash).toMatchObject({ duration: 760, iterations: 1 });
    expect(connector).toMatchObject({
      duration: 480,
      iterations: 1,
      delay: Number(wash?.delay) + 240,
    });
    expect(Number(connector?.delay) + Number(connector?.duration)).toBeLessThan(
      Number(wash?.delay) + Number(wash?.duration),
    );
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
