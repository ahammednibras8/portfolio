import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

test("a lost connection shows the saved page and recovers on its own", async ({
  browserName,
  context,
  page,
}) => {
  test.skip(
    browserName !== "chromium",
    "Only Chromium drives offline workers.",
  );

  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

  await context.setOffline(true);
  await page.goto("/#work").catch(() => undefined);
  await page.reload();

  await expect(
    page.getByRole("heading", { level: 1, name: "You’re offline." }),
  ).toBeVisible();
  await expect(page.locator(".offline")).toHaveCSS(
    "background-color",
    "rgb(1, 58, 99)",
  );
  expect(
    await page.evaluate(() => document.fonts.check('700 16px "IBM Plex Sans"')),
  ).toBe(true);

  // A device can report online before requests work, so recovery may take a retry.
  await context.setOffline(false);
  await expect(
    page.getByRole("heading", { level: 1, name: "Hi, I’m Nibras." }),
  ).toBeVisible({ timeout: 15000 });
});

test("the offline page lines up with the header", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1440 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/offline/");

  const lefts = await page.evaluate(() =>
    ["#offline-heading", ".primary-navigation ul"].map((selector) =>
      Math.round(
        document.querySelector(selector)?.getBoundingClientRect().left ?? -1,
      ),
    ),
  );

  expect(new Set(lefts).size).toBe(1);

  const timings = await page
    .locator(".offline-signal")
    .evaluate((signal) => [
      getComputedStyle(signal, "::before").animationTimingFunction,
      getComputedStyle(signal, "::after").animationTimingFunction,
      getComputedStyle(signal.querySelector("svg") as SVGElement)
        .animationTimingFunction,
    ]);

  expect(timings).toEqual(["ease-in", "ease-in", "ease-in"]);
});

test("live pages are never answered from the offline cache", async () => {
  const worker = await readFile(resolve("dist/sw.js"), "utf8");

  expect(worker).not.toContain("__OFFLINE_VERSION__");
  expect(worker).toMatch(/offline-[0-9a-f]{12}/);
  expect(worker).toContain("fallBackTo(event.request, offlineUrl)");
});

test("the offline page stays out of search and keeps its own worker rules", async ({
  request,
}) => {
  const sitemap = await readFile(resolve("dist/sitemap-0.xml"), "utf8");
  const offline = await request.get("/offline/");
  const worker = await request.get("/sw.js");

  expect(sitemap).not.toContain("offline");
  expect(offline.status()).toBe(200);
  expect(offline.headers()["x-robots-tag"]).toBe("noindex");
  expect(worker.status()).toBe(200);
  expect(worker.headers()["content-security-policy"]).toBe(
    "default-src 'none'; connect-src 'self'",
  );
});
