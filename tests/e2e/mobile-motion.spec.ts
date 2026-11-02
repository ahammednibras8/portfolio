import { expect, test } from "@playwright/test";

test.describe("mobile motion budget", () => {
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "Touch and sensor emulation uses Chromium.",
  );
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 412, height: 915 },
  });

  test("touch feedback and arrivals are shorter without changing the icon cadence", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
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
    expect(timing.tokens).toEqual([100, 150, 180, 360, 24]);
    expect(timing.arrivals).toEqual([360, 360]);
    const button = page.getByRole("link", { name: "See my work", exact: true });
    await button.scrollIntoViewIfNeeded();
    await expect(button.locator("svg")).toHaveClass(/icon-loop/);
    const loops = await button
      .locator("svg")
      .evaluate((element) =>
        element
          .getAnimations({ subtree: true })
          .map((animation) => animation.effect?.getTiming().duration),
      );
    expect(loops).toEqual([8000, 8000]);
    await button.dispatchEvent("pointerdown", {
      pointerType: "touch",
      button: 0,
    });
    await expect(button).toHaveCSS("scale", "0.985");
    await expect(button).toHaveCSS("transition-duration", "0.1s");
    await button.dispatchEvent("pointercancel", { pointerType: "touch" });
    await expect(button).toHaveCSS("scale", "none");
    await expect(button).toHaveCSS("background-size", "0% 100%");
    const durations = await button.evaluate((element) =>
      getComputedStyle(element).transitionDuration.split(", ").map(parseFloat),
    );
    expect(durations[0]).toBeCloseTo(0.27);
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

  test("sensor bursts write once per frame and queued work is canceled when hidden", async ({
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
    await expect
      .poll(async () => {
        await page.evaluate(() =>
          dispatchEvent(
            new DeviceOrientationEvent("deviceorientation", {
              beta: 15,
              gamma: -30,
            }),
          ),
        );
        return portrait.evaluate((element) =>
          element.style.getPropertyValue("--tilt-x"),
        );
      })
      .toBe("-6px");
    const result = await portrait.evaluate(async (element) => {
      if (!(element instanceof HTMLElement))
        throw new Error("Expected the portrait.");
      const style = element.style;
      const original = style.setProperty.bind(style);
      const writes: string[] = [];
      style.setProperty = (name, value, priority) => {
        if (name === "--tilt-x" || name === "--tilt-y")
          writes.push(`${name}:${value}`);
        original(name, value, priority);
      };
      const frame = () =>
        new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const lean = (beta: number, gamma: number) =>
        dispatchEvent(
          new DeviceOrientationEvent("deviceorientation", { beta, gamma }),
        );
      try {
        for (let index = 1; index <= 30; index++) lean(45 + index, index);
        const beforeFrame = writes.length;
        await frame();
        const afterBurst = writes.length;
        lean(75, 30);
        await frame();
        const afterDuplicate = writes.length;
        lean(15, -30);
        document.documentElement.setAttribute("data-test-hidden", "");
        document.dispatchEvent(new Event("visibilitychange"));
        await frame();
        const whileHidden = writes.length;
        document.documentElement.removeAttribute("data-test-hidden");
        document.dispatchEvent(new Event("visibilitychange"));
        lean(15, -30);
        await frame();
        return { beforeFrame, afterBurst, afterDuplicate, whileHidden, writes };
      } finally {
        style.setProperty = original;
      }
    });
    expect(result).toEqual({
      beforeFrame: 0,
      afterBurst: 2,
      afterDuplicate: 2,
      whileHidden: 2,
      writes: [
        "--tilt-x:6px",
        "--tilt-y:6px",
        "--tilt-x:-6px",
        "--tilt-y:-6px",
      ],
    });
  });
});
