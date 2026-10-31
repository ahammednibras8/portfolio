import { expect, type Page, test } from "@playwright/test";

const rail = (page: Page) =>
  page.getByRole("navigation", { name: "Page parts" });

test("the side rail lists every part and jumps to it", async ({ page }) => {
  await page.setViewportSize({ height: 800, width: 1280 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  await expect(rail(page).getByRole("link")).toHaveCount(9);

  const targets = await rail(page)
    .getByRole("link")
    .evaluateAll((links) =>
      links.map((link) => {
        const id = link.getAttribute("href")?.slice(1) ?? "";

        return document.getElementById(id) === null ? id : "";
      }),
    );

  expect(targets.filter(Boolean)).toEqual([]);

  const about = rail(page).getByRole("link", { name: "About" });

  await about.click();
  await expect(about).toHaveAttribute("aria-current", "true");
  await expect(rail(page).locator("[aria-current]")).toHaveCount(1);

  const top = await page
    .locator("#about")
    .evaluate((part) => part.getBoundingClientRect().top);

  expect(Math.abs(top - 44)).toBeLessThanOrEqual(2);
});

test("every short part fills the screen as its own slide", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1440 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  for (const id of ["intro", "work", "cascade", "architecture", "about"]) {
    const height = await page
      .locator(`#${id}`)
      .evaluate((part) => part.getBoundingClientRect().height);

    expect(height, id).toBeGreaterThanOrEqual(856);
  }
});

test("pieces wait in view, slide in from the side, and settle", async ({
  page,
}) => {
  await page.setViewportSize({ height: 800, width: 1280 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");

  const piece = page.locator("#about .speech-bubble");
  const read = () =>
    piece.evaluate((element) => {
      const { opacity, translate, visibility } = getComputedStyle(element);

      return { opacity, translate, visibility };
    });

  await expect(piece).toHaveClass(/slide-from-/);

  // Waiting pieces stay readable, because motion never hides content.
  expect(await read()).toMatchObject({ opacity: "1", visibility: "visible" });
  expect((await read()).translate).not.toBe("none");

  await page.locator("#about").evaluate((part) => {
    part.scrollIntoView({ behavior: "instant" });
  });
  await expect(piece).not.toHaveClass(/slide-from-/);
  expect((await read()).translate).toBe("none");
});

test("the first view never jumps", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");

  await expect(page.locator("#intro .slide-from-start")).toHaveCount(0);
  await expect(page.locator("#intro .slide-from-end")).toHaveCount(0);
});

test("a slow mouse wheel moves the page on every notch", async ({
  browserName,
  page,
}) => {
  test.skip(browserName === "webkit", "Playwright wheel events lag in WebKit.");

  await page.setViewportSize({ height: 900, width: 1440 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await page.mouse.move(700, 450);

  let last = 0;

  for (let notch = 0; notch < 12; notch += 1) {
    await page.mouse.wheel(0, 100);
    await page.waitForTimeout(350);

    const y = await page.evaluate(() => scrollY);

    expect(y, `notch ${notch}`).toBeGreaterThan(last);
    last = y;
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

  await expect(page.locator(".slide-from-start, .slide-from-end")).toHaveCount(
    0,
  );
  await expect(rail(page).getByRole("link", { name: "Intro" })).toHaveAttribute(
    "aria-current",
    "true",
  );
});

test("without JavaScript nothing is offset and the rail still links", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto("/");
  await expect(page.locator(".slide-from-start, .slide-from-end")).toHaveCount(
    0,
  );

  await rail(page).getByRole("link", { name: "Contact" }).click();
  await expect(page).toHaveURL(/#contact$/);
  await context.close();
});

test("print leaves the rail out", async ({ page }) => {
  await page.goto("/");
  await page.emulateMedia({ media: "print" });

  await expect(page.locator(".part-rail")).toBeHidden();
});

const hud = (page: Page) => page.getByRole("group", { name: "Part controls" });

const jumpTo = (page: Page, id: string) =>
  page.evaluate((target) => {
    document.documentElement.style.scrollBehavior = "auto";
    document.getElementById(target)?.scrollIntoView();
  }, id);

const partTop = (page: Page, id: string) =>
  page
    .locator(`#${id}`)
    .evaluate((part) => Math.round(part.getBoundingClientRect().top));

test("the HUD waits out the first view, then names the part", async ({
  page,
}) => {
  await page.setViewportSize({ height: 800, width: 1280 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");

  await expect(hud(page)).toBeHidden();
  await expect(page.locator(".part-hud-count")).toHaveText("01 / 09");

  await jumpTo(page, "cascade");
  await expect(hud(page)).toBeVisible();
  await expect(page.locator(".part-hud-count")).toHaveText("03 / 09");
  await expect(page.locator(".part-hud-name")).toHaveText("Cascade");
  await expect(page.locator(".part-hud-status")).toHaveText("03 / 09 Cascade");
});

test("the HUD steps through every part and never gets stuck", async ({
  page,
}) => {
  await page.setViewportSize({ height: 800, width: 1280 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await jumpTo(page, "work");
  await expect(hud(page)).toBeVisible();

  const next = hud(page).getByRole("button", { name: "Next part" });
  const previous = hud(page).getByRole("button", { name: "Previous part" });
  const order = [
    "cascade",
    "story",
    "evidence",
    "architecture",
    "deployment",
    "about",
    "contact",
  ];

  for (const id of order) {
    await next.click();
    await expect
      .poll(() => partTop(page, id), { message: id })
      .toBeLessThan(80);
    expect(await partTop(page, id), id).toBeGreaterThan(30);
  }

  // There is nothing after the last part, so Next has nowhere to go.
  await expect(next).toBeDisabled();
  await expect(previous).toBeEnabled();

  // The footer takes the HUD's place once it rises into view.
  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
  });
  await expect(hud(page)).toBeHidden();

  await jumpTo(page, "contact");
  await expect(hud(page)).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect.poll(() => partTop(page, "contact")).toBeGreaterThan(80);
  await expect.poll(() => partTop(page, "about")).toBeLessThan(80);

  // Going back inside a long part returns to its own start first.
  await jumpTo(page, "story");
  await page.evaluate(() => {
    window.scrollBy(0, 500);
  });
  await expect(hud(page)).toBeVisible();
  await previous.click();
  await expect.poll(() => partTop(page, "story")).toBeLessThan(80);
  expect(await partTop(page, "story")).toBeGreaterThan(30);
  await previous.click();
  await expect.poll(() => partTop(page, "cascade")).toBeLessThan(80);
});

test("arrow keys step parts and leave other keys alone", async ({ page }) => {
  await page.setViewportSize({ height: 800, width: 1280 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await jumpTo(page, "work");

  await page.keyboard.press("ArrowRight");
  await expect.poll(() => partTop(page, "cascade")).toBeLessThan(80);

  // A modified arrow belongs to the browser, so it must not step.
  await page.keyboard.press("Alt+ArrowRight");
  await page.waitForTimeout(300);
  expect(await partTop(page, "cascade")).toBeLessThan(80);
  expect(await partTop(page, "story")).toBeGreaterThan(300);

  await expect(
    hud(page).getByRole("button", { name: "Next part" }),
  ).toHaveAttribute("aria-keyshortcuts", "ArrowRight");
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

test("without JavaScript the HUD never appears", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto("/");
  await expect(page.locator(".part-hud")).toBeHidden();
  await context.close();
});

test("depth effects run only where scroll-driven animation exists", async ({
  page,
}) => {
  await page.setViewportSize({ height: 800, width: 1280 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");

  const supported = await page.evaluate(() =>
    CSS.supports("animation-timeline: view()"),
  );
  const names = () =>
    page.evaluate(() => ({
      about: getComputedStyle(document.getElementById("about") as Element)
        .animationName,
      cascade: getComputedStyle(document.getElementById("cascade") as Element)
        .animationName,
      intro: getComputedStyle(document.getElementById("intro") as Element)
        .animationName,
      orb: getComputedStyle(
        document.getElementById("about") as Element,
        "::after",
      ).animationName,
      story: getComputedStyle(document.getElementById("story") as Element)
        .animationName,
    }));

  if (supported) {
    expect(await names()).toEqual({
      about: "part-rise",
      // Cascade keeps rolling its dots while it rises.
      cascade: "dot-wave, part-rise",
      intro: "dot-wave",
      orb: "orb-drift",
      story: "none",
    });
  } else {
    expect((await names()).about).toBe("none");
  }

  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await names()).toMatchObject({
    about: "none",
    cascade: "none",
    orb: "none",
  });
});

test("the depth orbs stay faint and inside their parts", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });

  for (const width of [390, 1440, 2560]) {
    await page.setViewportSize({ height: 900, width });
    await page.goto("/");

    const clipped = await page.evaluate(() =>
      ["work", "cascade", "architecture", "about", "contact"].map((id) => {
        const part = document.getElementById(id) as HTMLElement;

        return getComputedStyle(part).overflow;
      }),
    );

    expect(new Set(clipped), `at ${width}`).toEqual(new Set(["clip"]));
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
  }
});
