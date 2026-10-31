import { expect, test } from "@playwright/test";

const rail = (page: import("@playwright/test").Page) =>
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
