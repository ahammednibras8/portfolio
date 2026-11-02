import { expect, test } from "@playwright/test";

const cards = "#contact .route-link";
const fill = "linear-gradient(rgb(143, 216, 220) 0px, rgb(143, 216, 220) 0px)";

test("all four contact cards fill behind their content without changing geometry", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/#contact");
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
  });
  await expect(page.locator(cards)).toHaveCount(4);
  for (const card of await page.locator(cards).all()) {
    const result = await card.evaluate(async (element) => {
      if (!(element instanceof HTMLAnchorElement))
        throw new Error("Expected a contact link.");
      const size = [element.offsetWidth, element.offsetHeight];
      const ink = [...element.querySelectorAll("h3, .route-action")].map(
        (node) => getComputedStyle(node).color,
      );
      void getComputedStyle(element).backgroundSize;
      element.focus();
      const sweep = element
        .getAnimations()
        .find(
          (animation) =>
            animation instanceof CSSTransition &&
            animation.transitionProperty === "background-size",
        );
      if (!sweep?.effect)
        throw new Error("Expected the contact fill transition.");
      sweep.pause();
      await sweep.ready;
      const duration = Number(sweep.effect.getTiming().duration);
      const samples = [0, 0.5, 1].map((progress) => {
        sweep.currentTime = duration * progress;
        return {
          progress: parseFloat(getComputedStyle(element).backgroundSize),
          size: [element.offsetWidth, element.offsetHeight],
          ink: [...element.querySelectorAll("h3, .route-action")].map(
            (node) => getComputedStyle(node).color,
          ),
        };
      });
      sweep.finish();
      return { duration, size, ink, samples };
    });
    expect(result.duration).toBeCloseTo(360, 3);
    expect(result.samples[0]?.progress).toBe(0);
    expect(result.samples[1]?.progress).toBeGreaterThan(0);
    expect(result.samples[1]?.progress).toBeLessThan(100);
    expect(result.samples[2]?.progress).toBe(100);
    for (const sample of result.samples) {
      expect(sample.size).toEqual(result.size);
      expect(sample.ink).toEqual(result.ink);
    }
    await expect(card).toHaveCSS("background-image", fill);
    await expect(card).toHaveCSS("background-clip", "padding-box");
    await expect(card).toHaveCSS("background-position", "0px 50%");
    await expect(card).toHaveCSS("outline-style", "solid");
    await card.evaluate((element) => element.blur());
    await expect(card).toHaveCSS("background-size", "0% 100%");
  }
});

test("hover fills only the engaged contact card and retracts on exit", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/#contact");
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
  });
  for (const card of await page.locator(cards).all()) {
    await card.hover();
    await expect(card).toHaveCSS("background-size", "100% 100%");
    await expect(page.locator(`${cards}:not(:hover)`).first()).toHaveCSS(
      "background-size",
      "0% 100%",
    );
    await page.mouse.move(0, 0);
    await expect(card).toHaveCSS("background-size", "0% 100%");
  }
  await page.locator(cards).first().hover();
  await expect(page.locator(cards).first()).toHaveCSS(
    "background-size",
    "100% 100%",
  );
  await page
    .locator("#contact")
    .screenshot({ path: testInfo.outputPath("contact-fill.png") });
  // The project cards and navigation retain their existing surfaces.
  await expect(page.locator(".project-list .route-link").first()).toHaveCSS(
    "background-image",
    "none",
  );
  await expect(
    page.locator('.primary-navigation a[href="/#contact"]'),
  ).toHaveCSS("background-size", "0px 2px");
});

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test.describe(`touch contact fill with ${reducedMotion}`, () => {
    test.use({
      hasTouch: true,
      isMobile: true,
      viewport: { width: 390, height: 844 },
      reducedMotion,
    });
    test("press feedback releases on cancellation and never delays navigation", async ({
      browserName,
      page,
    }) => {
      test.skip(
        browserName !== "chromium",
        "Coarse-pointer emulation is Chromium-only.",
      );
      await page.goto("/#contact");
      const card = page.locator(cards).first();
      await card.scrollIntoViewIfNeeded();
      for (const release of [
        "pointerup",
        "pointercancel",
        "pointerleave",
        "scroll",
        "visibilitychange",
      ] as const) {
        await card
          .locator("h3")
          .dispatchEvent("pointerdown", { pointerType: "touch", button: 0 });
        await expect(card).toHaveClass(/is-pressed/);
        await expect(card).toHaveCSS("background-size", "100% 100%");
        await expect(card).toHaveCSS(
          "transition-duration",
          reducedMotion === "reduce" ? "0s" : "0.09s",
        );
        if (release === "scroll")
          await page.evaluate(() => window.dispatchEvent(new Event("scroll")));
        else if (release === "visibilitychange")
          await page.evaluate(() =>
            document.dispatchEvent(new Event("visibilitychange")),
          );
        else await card.dispatchEvent(release, { pointerType: "touch" });
        await expect(card).not.toHaveClass(/is-pressed/);
        await expect(card).toHaveCSS("background-size", "0% 100%");
      }
      await page.route("https://github.com/ahammednibras8", (route) =>
        route.fulfill({
          status: 200,
          contentType: "text/html",
          body: "<title>Profile destination</title>",
        }),
      );
      await page
        .locator('#contact a[href="https://github.com/ahammednibras8"]')
        .tap();
      await expect(page).toHaveURL("https://github.com/ahammednibras8");
    });
  });
}

test("reduced motion is instant and system modes omit decorative fill", async ({
  page,
  browserName,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#contact");
  const card = page.locator(cards).first();
  await card.focus();
  await expect(card).toHaveCSS("background-size", "100% 100%");
  await expect(card).toHaveCSS("transition-duration", "0s");
  if (browserName === "chromium") {
    await page.emulateMedia({ forcedColors: "active" });
    await expect(card).toHaveCSS("background-image", "none");
    await expect(card).toHaveCSS("outline-style", "solid");
  }
  await page.emulateMedia({ media: "print", forcedColors: "none" });
  await expect(card).toHaveCSS("background-image", "none");
  await expect(page.locator("#contact")).toBeHidden();
});

test.describe("contact fill without JavaScript", () => {
  test.use({ javaScriptEnabled: false, reducedMotion: "reduce" });
  test("focus fills the card and the destination remains a native link", async ({
    page,
  }) => {
    await page.goto("/#contact");
    const card = page.locator(cards).first();
    await card.focus();
    await expect(card).toHaveCSS("background-size", "100% 100%");
    await expect(card).toHaveAttribute(
      "href",
      "mailto:ahammednibras737@gmail.com",
    );
    await card.evaluate((element) => element.blur());
    await expect(card).toHaveCSS("background-size", "0% 100%");
  });
});
