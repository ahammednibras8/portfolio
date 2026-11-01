import { expect, type Page, test } from "@playwright/test";

// Late fonts reflow the page and move every part, so wait for them first.
const fontsReady = (page: Page) =>
  page.evaluate(() => document.fonts.ready.then(() => undefined));

const jumpTo = (page: Page, id: string) =>
  page.evaluate(async (target) => {
    await document.fonts.ready;
    document.documentElement.style.scrollBehavior = "auto";
    document.getElementById(target)?.scrollIntoView();
    // Leave the page as a visitor has it, with smooth anchors when motion is on.
    document.documentElement.style.scrollBehavior = "";
  }, id);

test("the right-side dots are removed and header navigation still works", async ({
  page,
}) => {
  await page.setViewportSize({ height: 800, width: 1280 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ height: 800, width });
    await expect(page.locator(".part-rail")).toHaveCount(0);
    await expect(
      page.getByRole("navigation", { name: "Page parts" }),
    ).toHaveCount(0);
  }

  await page
    .getByRole("navigation", { name: "Primary" })
    .getByRole("link", { name: "About", exact: true })
    .click();

  const top = await page
    .locator("#about")
    .evaluate((part) => part.getBoundingClientRect().top);

  expect(Math.abs(top - 44)).toBeLessThanOrEqual(2);
});

test("every short part fills the screen as its own slide", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1440 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  for (const id of [
    "intro",
    "work",
    "cascade",
    "toolbox",
    "architecture",
    "about",
  ]) {
    const height = await page
      .locator(`#${id}`)
      .evaluate((part) => part.getBoundingClientRect().height);

    expect(height, id).toBeGreaterThanOrEqual(856);
  }
});

test("pieces zoom in around their center and settle", async ({ page }) => {
  await page.setViewportSize({ height: 800, width: 1280 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");

  const piece = page.locator("#about .speech-bubble");
  const read = () =>
    piece.evaluate((element) => {
      const { opacity, scale, translate, visibility } =
        getComputedStyle(element);

      return { opacity, scale, translate, visibility };
    });

  await expect(piece).toHaveClass(/zoom-ready/);
  await expect(piece).toHaveCSS("scale", "0.96");

  // Waiting pieces stay readable, because motion never hides content.
  expect(await read()).toEqual({
    opacity: "1",
    scale: "0.96",
    translate: "none",
    visibility: "visible",
  });

  await page.locator("#about").evaluate((part) => {
    part.scrollIntoView({ behavior: "instant" });
  });
  await expect(piece).toHaveClass(/is-zooming/);
  await expect(piece).toHaveCSS(
    "animation-timing-function",
    "cubic-bezier(0.22, 1, 0.36, 1)",
  );

  const frames = await piece.evaluate((element) => {
    const animation = element
      .getAnimations()
      .find((motion) => (motion as CSSAnimation).animationName === "zoom-in");

    if (!animation)
      throw new Error("Expected the entrance zoom to be running.");

    animation.pause();
    const duration = Number(animation.effect?.getTiming().duration);
    const samples = [0, duration / 2].map((time) => {
      animation.currentTime = time;
      const { left, width } = element.getBoundingClientRect();
      const { scale, translate } = getComputedStyle(element);

      return {
        center: left + width / 2,
        scale: Number(scale),
        translate,
        width,
      };
    });

    animation.finish();
    return samples;
  });

  const [start, middle] = frames;

  if (!start || !middle) throw new Error("Expected both zoom samples.");

  expect(middle.width).toBeGreaterThan(start.width);
  expect(middle.center).toBeCloseTo(start.center, 1);
  expect(middle.scale).toBeGreaterThan(start.scale);
  expect(middle.scale).toBeLessThan(1);
  expect(frames.every(({ translate }) => translate === "none")).toBe(true);

  await expect(piece).not.toHaveClass(/zoom-ready/);
  await expect(piece).toHaveCSS("scale", "none");
});

test("the first view never jumps", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");

  await expect(page.locator("#intro .zoom-ready")).toHaveCount(0);
});

test("a slow mouse wheel moves the page on every notch", async ({
  browserName,
  page,
}) => {
  test.skip(browserName === "webkit", "Playwright wheel events lag in WebKit.");

  await page.setViewportSize({ height: 900, width: 1440 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await fontsReady(page);
  await page.mouse.move(700, 450);

  let last = 0;

  for (let notch = 0; notch < 12; notch += 1) {
    await page.mouse.wheel(0, 100);

    // Each notch must move the page. A starved browser may take a moment.
    await expect
      .poll(() => page.evaluate(() => scrollY), {
        message: `notch ${notch}`,
        timeout: 3000,
      })
      .toBeGreaterThan(last);
    last = await page.evaluate(() => scrollY);
    await page.waitForTimeout(250);
  }
});

test("a scroll that stops just short of a part docks onto it", async ({
  browserName,
  page,
}) => {
  test.skip(browserName === "webkit", "Playwright wheel events lag in WebKit.");

  await page.setViewportSize({ height: 900, width: 1440 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await fontsReady(page);
  await page.mouse.move(700, 450);

  const top = () =>
    page
      .locator("#work")
      .evaluate((part) => Math.round(part.getBoundingClientRect().top));

  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    const part = document.querySelector<HTMLElement>("#work");

    window.scrollTo(0, (part?.offsetTop ?? 0) - 44 - 140);
  });
  await page.mouse.wheel(0, 60);
  await expect.poll(top, { timeout: 4000 }).toBe(44);

  // Leaving a part is never undone.
  await page.mouse.wheel(0, 100);
  await page.waitForTimeout(600);
  expect(await top()).toBeLessThan(0);
});

test("reduced motion keeps every piece still", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  await expect(page.locator(".zoom-ready")).toHaveCount(0);
});

test("without JavaScript nothing is scaled and header links still work", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto("/");
  await expect(page.locator(".zoom-ready")).toHaveCount(0);
  await expect(page.locator(".part-hud")).toHaveCount(0);

  await page
    .getByRole("navigation", { name: "Primary" })
    .getByRole("link", { name: "Contact", exact: true })
    .click();
  await expect(page).toHaveURL(/#contact$/);
  await context.close();
});

test("print leaves section controls out", async ({ page }) => {
  await page.goto("/");
  await page.emulateMedia({ media: "print" });

  await expect(page.locator(".part-hud")).toHaveCount(0);
  await expect(page.locator(".part-rail")).toHaveCount(0);
});

test("progress runs along the header and the browser bar matches it", async ({
  page,
}) => {
  await page.setViewportSize({ height: 800, width: 1280 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const progress = () =>
    page
      .locator(".site-header")
      .evaluate((header) =>
        Number.parseFloat(header.style.getPropertyValue("--page-progress")),
      );

  expect(await progress()).toBe(0);

  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
  });
  await expect.poll(progress).toBeGreaterThan(0.99);

  const bar = await page
    .locator(".site-header")
    .evaluate((header) => getComputedStyle(header, "::after").transform);

  expect(bar).toBe("matrix(1, 0, 0, 1, 0, 0)");
});

test("sections stay still during content entrances", async ({ page }) => {
  await page.setViewportSize({ height: 800, width: 1280 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");

  const names = () =>
    page.evaluate(() => ({
      about: getComputedStyle(document.getElementById("about") as Element)
        .animationName,
      cascade: getComputedStyle(document.getElementById("cascade") as Element)
        .animationName,
      intro: getComputedStyle(document.getElementById("intro") as Element)
        .animationName,
      story: getComputedStyle(document.getElementById("story") as Element)
        .animationName,
    }));

  const still = {
    about: "none",
    cascade: "none",
    intro: "none",
    story: "none",
  };
  expect(await names()).toEqual(still);
  await page
    .locator("#about")
    .evaluate((part) => part.scrollIntoView({ behavior: "instant" }));
  expect(await names()).toEqual(still);
  await expect(page.locator(".folio-mark.zoom-ready")).toHaveCount(0);

  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await names()).toMatchObject({
    about: "none",
    cascade: "none",
  });
});

test("section backgrounds have no dotted-circle overlays at any width", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });

  for (const width of [390, 1440, 2560]) {
    await page.setViewportSize({ height: 900, width });
    await page.goto("/");

    await expect(page.locator(".part-orb")).toHaveCount(0);
    const decoration = await page.evaluate(() =>
      ["work", "cascade", "toolbox", "architecture", "about", "contact"].map(
        (id) => {
          const part = document.getElementById(id) as HTMLElement;

          return getComputedStyle(part, "::after").content;
        },
      ),
    );

    expect(new Set(decoration), `at ${width}`).toEqual(new Set(["none"]));
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
    if (width === 390 || width === 1440) {
      await jumpTo(page, "about");
      await page.screenshot({
        path: testInfo.outputPath(`plain-bands-${width}.png`),
      });
    }
  }
});

for (const width of [390, 1280]) {
  test(`a jump straight to a part finishes every zoom at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ height: 844, width });
    await page.emulateMedia({ reducedMotion: "no-preference" });

    const waiting = () =>
      page.evaluate(() =>
        [...document.querySelectorAll(".zoom-ready")]
          .filter((piece) => {
            const { bottom, top } = piece.getBoundingClientRect();

            return bottom > 0 && top < innerHeight;
          })
          .map((piece) => piece.textContent?.trim().slice(0, 20)),
      );

    await page.goto("/#contact");
    await expect.poll(waiting, { timeout: 5000 }).toEqual([]);

    await page.goto("/");
    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "About", exact: true })
      .click();
    await expect.poll(waiting, { timeout: 5000 }).toEqual([]);
  });
}

test("focus rings stay visible over the navy header", async ({ page }) => {
  await page.setViewportSize({ height: 800, width: 1280 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  // The skip link lands on the navy header.
  const skip = page.getByRole("link", { name: "Skip to content" });

  await skip.focus();
  await expect(skip).toBeFocused();
  await expect(skip).toHaveCSS("outline-color", "rgb(255, 255, 255)");
});

test("the bottom section counter is absent on mobile and desktop", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });

  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ height: 900, width });
    await page.goto("/");

    for (const id of ["intro", "story", "evidence", "toolbox", "contact"]) {
      await jumpTo(page, id);
      await expect(page.locator(".part-hud")).toHaveCount(0);
      await expect(
        page.getByRole("group", { name: "Part controls" }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: /^(Previous|Next) part$/ }),
      ).toHaveCount(0);
    }

    await expect(page.locator("[aria-keyshortcuts]")).toHaveCount(0);
    expect(
      await page.evaluate(
        () => getComputedStyle(document.documentElement).scrollPaddingBottom,
      ),
    ).not.toBe("80px");

    await jumpTo(page, "toolbox");
    await page.screenshot({
      path: testInfo.outputPath(`no-bottom-counter-${width}.png`),
    });
  }
});

test("left and right arrows no longer trigger section navigation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await jumpTo(page, "work");

  const start = await page.evaluate(() => scrollY);
  const allowed = await page.evaluate(() =>
    ["ArrowLeft", "ArrowRight"].map((key) =>
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key, cancelable: true }),
      ),
    ),
  );

  expect(allowed).toEqual([true, true]);
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowLeft");
  expect(await page.evaluate(() => scrollY)).toBe(start);
});
