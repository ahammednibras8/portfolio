import { expect, type Page, test } from "@playwright/test";

const arrow = (page: Page) =>
  page.locator(".hero-contact .lucide-arrow-right > path").first();
const loopsReady = async (page: Page) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await expect(arrow(page)).toHaveCSS("animation-play-state", "running");
};

test("all icons move for 3 seconds, rest for 5, and keep their outer SVGs still", async ({
  page,
}) => {
  await loopsReady(page);
  const icons = await page.locator("main svg.lucide").evaluateAll((elements) =>
    elements.map((element) => {
      const moving = [...element.children].filter(
        (part) => getComputedStyle(part).animationName !== "none",
      );
      return {
        type: element.getAttribute("class"),
        outer: getComputedStyle(element).animationName,
        count: moving.length,
        loops: moving.every(
          (part) =>
            getComputedStyle(part).animationIterationCount === "infinite",
        ),
        rests: moving.every((part) => {
          const animation = part.getAnimations()[0];
          const frames =
            (animation?.effect as KeyframeEffect | null)?.getKeyframes() ?? [];
          const duration = Number(animation?.effect?.getTiming().duration);
          const rest = frames.find((frame) => frame.offset === 0.375);
          const end = frames.find((frame) => frame.offset === 1);
          const properties = Object.keys(rest ?? {}).filter(
            (property) =>
              !["offset", "computedOffset", "easing", "composite"].includes(
                property,
              ),
          );
          return Boolean(
            rest &&
            end &&
            duration * 0.375 === 3000 &&
            duration * (1 - 0.375) === 5000 &&
            properties.every((property) => rest[property] === end[property]) &&
            !frames.some(
              (frame) =>
                Number(frame.offset) > 0.375 && Number(frame.offset) < 1,
            ),
          );
        }),
      };
    }),
  );
  expect(icons.length).toBeGreaterThan(20);
  for (const icon of icons) {
    expect(icon.count, icon.type ?? "icon").toBeGreaterThan(0);
    expect(icon).toMatchObject({ outer: "none", loops: true, rests: true });
  }
});

test("the arrow stays at rest for five seconds and then repeats", async ({
  page,
}) => {
  await loopsReady(page);
  const states = await arrow(page).evaluate(async (element) => {
    const animation = element.getAnimations()[0];
    if (!animation?.effect) throw new Error("Expected an arrow loop.");
    animation.pause();
    await animation.ready;
    const delay = Number(animation.effect.getTiming().delay);
    return [3000, 4000, 6000, 7999, 8000 + 1260].map((time) => {
      animation.currentTime = delay + time;
      const style = getComputedStyle(element);
      return {
        opacity: Number(style.opacity),
        translate: parseFloat(style.translate) || 0,
      };
    });
  });
  for (const state of states.slice(0, 4))
    expect(state).toEqual({ opacity: 1, translate: 0 });
  expect(states[4]?.opacity).toBeCloseTo(0, 3);
  expect(states[4]?.translate).toBeCloseTo(9, 3);
});

test("the hero and footer have no pause controls while icons keep running", async ({
  page,
}, testInfo) => {
  await loopsReady(page);
  await expect(page.locator(".icon-motion-toggle")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /pause icons|resume icons/i }),
  ).toHaveCount(0);
  await expect(page.locator("#intro > .speech-bubble")).toHaveCSS(
    "scale",
    "none",
  );
  await expect(page.locator("#intro .route-label")).toHaveText(
    "Software engineer",
  );
  await page.getByRole("link", { name: "Get in touch", exact: true }).hover();
  await expect(arrow(page)).toHaveCSS("animation-play-state", "running");
  await page.screenshot({
    path: testInfo.outputPath("no-pause-controls-desktop.png"),
  });
});

test("viewport pause preserves the same animation and resumes its phase", async ({
  page,
}) => {
  await loopsReady(page);
  await arrow(page).evaluate((element) => {
    const animation = element.getAnimations()[0];
    if (!animation) throw new Error("Expected an arrow loop.");
    animation.id = "viewport-loop-probe";
  });
  await page
    .locator("#contact")
    .evaluate((element) => element.scrollIntoView({ behavior: "instant" }));
  await expect(arrow(page)).toHaveCSS("animation-play-state", "paused");
  const before = await arrow(page).evaluate(async (element) => {
    const animation = element.getAnimations()[0];
    if (!animation) throw new Error("Expected the same arrow loop.");
    // CSS can report paused before the animation's pending pause is committed.
    await animation.ready;
    return animation.currentTime;
  });
  await page.waitForTimeout(120);
  expect(
    await arrow(page).evaluate(
      (element) => element.getAnimations()[0]?.currentTime,
    ),
  ).toBe(before);
  await page
    .locator("#intro")
    .evaluate((element) => element.scrollIntoView({ behavior: "instant" }));
  await expect(arrow(page)).toHaveCSS("animation-play-state", "running");
  expect(
    await arrow(page).evaluate((element) => element.getAnimations()[0]?.id),
  ).toBe("viewport-loop-probe");
});

test("an icon entering exactly at the viewport edge does not get stuck paused", async ({
  browserName,
  page,
}) => {
  test.skip(
    browserName !== "chromium",
    "Exact edge geometry is measured in Chromium.",
  );
  await loopsReady(page);
  const icon = page.locator("#contact .lucide-mail");
  // Isolate the observed SVG from its card's clipping and arrival transform.
  await icon.evaluate((element) => {
    document.querySelector("main")?.append(element);
    Object.assign((element as SVGElement).style, {
      position: "fixed",
      top: `${innerHeight}px`,
      left: "16px",
      width: "24px",
      height: "24px",
      translate: "none",
    });
  });
  const observedIcon = page.locator("main > .lucide-mail");
  const edge = await observedIcon.evaluate(
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
  expect(edge).toEqual({ ratio: 0, intersects: true });
  await expect(observedIcon).toHaveClass(/is-in-view/);
  await observedIcon.evaluate((element) => {
    (element as SVGElement).style.top = `${innerHeight - 12}px`;
  });
  await expect(observedIcon.locator("path")).toHaveCSS(
    "animation-play-state",
    "running",
  );
});

test("system preferences stop automatic loops and clearing them restores motion", async ({
  browserName,
  page,
}) => {
  await loopsReady(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(arrow(page)).toHaveCSS("animation-name", "none");
  await expect(page.locator("html")).not.toHaveClass(/icon-loops-running/);
  await page.getByRole("link", { name: "Get in touch", exact: true }).hover();
  await expect(arrow(page)).toHaveCSS("animation-name", "none");
  await page.reload();
  await expect(arrow(page)).toHaveCSS("animation-name", "none");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(arrow(page)).toHaveCSS("animation-play-state", "running");
  if (browserName === "chromium") {
    await page.emulateMedia({ forcedColors: "active" });
    await expect(arrow(page)).toHaveCSS("animation-name", "none");
    await page.emulateMedia({ forcedColors: "none" });
    await expect(arrow(page)).toHaveCSS("animation-play-state", "running");
  }
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".icon-motion-toggle")).toHaveCount(0);
  await expect(arrow(page)).toHaveCSS("animation-name", "none");
  await page.emulateMedia({ media: "screen" });
  await expect(arrow(page)).toHaveCSS("animation-play-state", "running");
});

test("a hidden document pauses every loop and visibility restores motion", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => document.documentElement.hasAttribute("data-test-hidden"),
    });
  });
  await loopsReady(page);
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-test-hidden", "");
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(arrow(page)).toHaveCSS("animation-play-state", "paused");
  expect(
    await page
      .locator("main svg.lucide > *")
      .evaluateAll((parts) =>
        parts.every(
          (part) => getComputedStyle(part).animationPlayState === "paused",
        ),
      ),
  ).toBe(true);
  await page.evaluate(() => {
    document.documentElement.removeAttribute("data-test-hidden");
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(arrow(page)).toHaveCSS("animation-play-state", "running");
});

test("blocked session storage does not break automatic motion", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      get: () => {
        throw new DOMException("Storage blocked", "SecurityError");
      },
    }),
  );
  await loopsReady(page);
  await page.evaluate(() => dispatchEvent(new Event("pageshow")));
  await expect(arrow(page)).toHaveCSS("animation-play-state", "running");
});

test("legacy saved pause state cannot disable icons after the controls are removed", async ({
  page,
}) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("portfolio-icon-motion", "paused");
  });
  await loopsReady(page);
  await page.evaluate(() => dispatchEvent(new Event("pageshow")));
  await expect(arrow(page)).toHaveCSS("animation-play-state", "running");
  await page.reload();
  await expect(arrow(page)).toHaveCSS("animation-play-state", "running");
});

test("pages without icons do not show an unnecessary motion control", async ({
  page,
}) => {
  await page.goto("/route-that-does-not-exist");
  await expect(page.locator("main svg.lucide")).toHaveCount(0);
  await expect(page.locator(".icon-motion-toggle")).toHaveCount(0);
  await expect(page.locator("html")).not.toHaveClass(/icon-loops-running/);
});

test("without JavaScript icons stay static and no unusable control is shown", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator(".icon-loop")).toHaveCount(0);
  await expect(page.locator(".icon-motion-toggle")).toHaveCount(0);
  expect(
    await page
      .locator("main svg.lucide, main svg.lucide > *")
      .evaluateAll((elements) =>
        elements.every(
          (element) => getComputedStyle(element).animationName === "none",
        ),
      ),
  ).toBe(true);
  await context.close();
});

test("the offline icon follows system motion preferences and keeps its slash fixed", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/offline/");
  const arc = page.locator(".lucide-wifi-off > path").nth(1);
  await expect(arc).toHaveCSS("animation-play-state", "running");
  await expect(page.locator(".lucide-wifi-off")).toHaveCSS(
    "animation-name",
    "none",
  );
  await expect(page.locator(".lucide-wifi-off > path").last()).toHaveCSS(
    "animation-name",
    "none",
  );
  await expect(page.locator(".icon-motion-toggle")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(arc).toHaveCSS("animation-name", "none");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(arc).toHaveCSS("animation-play-state", "running");
});

test.describe("phone motion", () => {
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "Touch-only emulation uses Chromium.",
  );
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  test("phone icons run without pause controls and respect reduced motion", async ({
    page,
  }, testInfo) => {
    await loopsReady(page);
    await expect(page.locator(".icon-motion-toggle")).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath("no-pause-controls-phone.png"),
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(arrow(page)).toHaveCSS("animation-name", "none");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect(arrow(page)).toHaveCSS("animation-play-state", "running");
  });
});
