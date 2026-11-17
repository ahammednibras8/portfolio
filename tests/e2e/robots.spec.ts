import { expect, test } from "@playwright/test";

test("robots allows production crawling and advertises the generated sitemap", async ({
  request,
}) => {
  const siteUrl = process.env.SITE_URL ?? "https://example.com";
  const response = await request.get("/robots.txt");

  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]?.split(";", 1)[0]).toBe(
    "text/plain",
  );
  expect(await response.text()).toBe(
    [
      "User-agent: *",
      "Allow: /",
      `Sitemap: ${new URL("/sitemap-index.xml", siteUrl).href}`,
      "",
    ].join("\n"),
  );

  const sitemapResponse = await request.get("/sitemap-index.xml");

  expect(sitemapResponse.ok()).toBe(true);
  expect(sitemapResponse.headers()["content-type"]).toMatch(
    /^(?:application|text)\/xml(?:;|$)/,
  );

  const sitemap = await request.get("/sitemap-0.xml");
  expect(sitemap.ok()).toBe(true);
  const entries = [...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map(([, url]) => url)
    .sort();

  expect(entries).toEqual([
    new URL("/", siteUrl).href,
    new URL("/about/", siteUrl).href,
  ]);
});
