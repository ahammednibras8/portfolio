import { expect, test } from "@playwright/test";

test("robots allows production crawling and advertises the generated sitemap", async ({
  request,
}) => {
  const response = await request.get("/robots.txt");

  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]?.split(";", 1)[0]).toBe(
    "text/plain",
  );
  expect(await response.text()).toBe(
    [
      "User-agent: *",
      "Allow: /",
      "Sitemap: https://example.com/sitemap-index.xml",
      "",
    ].join("\n"),
  );

  const sitemapResponse = await request.get("/sitemap-index.xml");

  expect(sitemapResponse.ok()).toBe(true);
  expect(sitemapResponse.headers()["content-type"]).toMatch(
    /^(?:application|text)\/xml(?:;|$)/,
  );
});
