import { expect, test } from "@playwright/test";
import { pressTab } from "../helpers/keyboard";

const missingPath = "/route-that-does-not-exist";

test("the 320px recovery actions open separate pages without JavaScript", async ({
  browser,
  browserName,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 320, height: 800 },
  });
  const page = await context.newPage();

  const response = await page.goto(missingPath);
  expect(response?.status()).toBe(404);
  await expect(page).toHaveTitle("Page not found — Ahammed Nibras");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "I haven’t published a page at this address.",
    }),
  ).toBeVisible();
  await expect(page.locator("[itemscope]")).toHaveCount(0);
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  const recovery = page.getByRole("navigation", { name: "Page recovery" });
  await expect(recovery.getByRole("link")).toHaveCount(2);
  await expect(
    recovery.getByRole("link", { name: /Homepage/ }),
  ).toHaveAttribute("href", "/");
  await expect(
    recovery.getByRole("link", { name: /Get in touch/ }),
  ).toHaveAttribute("href", "/#contact");

  const viewport = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(viewport.scrollWidth).toBe(viewport.clientWidth);

  const homepageLink = page.getByRole("link", {
    name: /Homepage A short introduction/,
  });
  await expect(homepageLink).toBeVisible();
  await pressTab(page, browserName);
  await expect(homepageLink).toBeFocused();
  const homePromise = context.waitForEvent("page");
  await page.keyboard.press("Enter");
  const home = await homePromise;
  await expect(home).toHaveURL(new URL("/", page.url()).href);
  await expect(home.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await home.evaluate(() => window.opener)).toBeNull();
  await expect(page).toHaveURL(new RegExp(`${missingPath}$`));
  await home.close();
  await page.bringToFront();

  await page.goto(missingPath);
  const contactLink = page.getByRole("link", {
    name: /Get in touch Email address/,
  });
  await pressTab(page, browserName);
  await pressTab(page, browserName);
  await expect(contactLink).toBeFocused();
  const contactPromise = context.waitForEvent("page");
  await page.keyboard.press("Enter");
  const contact = await contactPromise;
  await expect(contact).toHaveURL(new URL("/#contact", page.url()).href);
  await expect(contact.locator("#contact")).toBeInViewport();
  expect(await contact.evaluate(() => window.opener)).toBeNull();
  await expect(page).toHaveURL(new RegExp(`${missingPath}$`));
  await contact.close();

  await context.close();
});
