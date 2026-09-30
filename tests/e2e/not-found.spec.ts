import { expect, test } from "@playwright/test";

const missingPath = "/route-that-does-not-exist";

test("unknown routes return the authored 404 with recovery paths", async ({
  page,
}) => {
  const response = await page.goto("/route-that-does-not-exist");

  expect(response).not.toBeNull();
  expect(response?.status()).toBe(404);
  await expect(page).toHaveTitle("Page not found — Ahammed Nibras");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "I haven’t published a page at this address.",
    }),
  ).toBeVisible();

  const recovery = page.getByRole("navigation", { name: "Page recovery" });
  const links = recovery.getByRole("link");

  await expect(links).toHaveCount(3);
  expect(
    await links.evaluateAll((items) =>
      items.map((item) => item.getAttribute("href")),
    ),
  ).toEqual(["/", "/#work", "/#contact"]);
});

test("the 320px recovery path works without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 320, height: 800 },
  });
  const page = await context.newPage();

  const response = await page.goto(missingPath);
  expect(response?.status()).toBe(404);

  const viewport = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(viewport.scrollWidth).toBe(viewport.clientWidth);

  const homepageLink = page.getByRole("link", {
    name: /Homepage A short introduction/,
  });
  await expect(homepageLink).toBeVisible();
  await homepageLink.click();
  await expect(page).toHaveURL(/\/$/);

  await context.close();
});
