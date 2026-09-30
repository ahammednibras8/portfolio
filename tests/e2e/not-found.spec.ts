import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const missingPath = "/route-that-does-not-exist";
const notFoundArtifact = resolve("dist/404.html");

test("the built 404 artifact exists with meaningful recovery links", async ({
  page,
}) => {
  await readFile(notFoundArtifact, "utf8");

  await page.goto("/404.html");

  await expect(page).toHaveTitle("Page not found — Ahammed Nibras");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "I haven’t published a page at this address.",
    }),
  ).toBeVisible();

  const recovery = page.getByRole("navigation", { name: "Page recovery" });

  const homepage = recovery.locator('a[href="/"]');
  const work = recovery.locator('a[href="/#work"]');
  const contact = recovery.locator('a[href="/#contact"]');

  await expect(homepage.locator("strong")).toHaveText("Homepage");
  await expect(homepage.locator("span").last()).toHaveText(
    "A short introduction to what I build.",
  );
  await expect(work.locator("strong")).toHaveText("Selected work");
  await expect(work.locator("span").last()).toHaveText(
    "Cascade, its constraints, and the evidence behind it.",
  );
  await expect(contact.locator("strong")).toHaveText("Get in touch");
  await expect(contact.locator("span").last()).toHaveText(
    "Email, GitHub, and LinkedIn.",
  );
});

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
