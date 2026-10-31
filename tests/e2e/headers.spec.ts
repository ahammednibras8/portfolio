import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const expectedHeaders = {
  "content-security-policy":
    "default-src 'none'; base-uri 'none'; connect-src 'none'; font-src 'self'; form-action 'none'; frame-ancestors 'none'; img-src 'self'; manifest-src 'self'; script-src 'self'; style-src 'self'; worker-src 'self'",
  "permissions-policy":
    "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
} as const;

test("the build includes the Cloudflare Pages header rules", async () => {
  const headersArtifact = await readFile(resolve("dist/_headers"), "utf8");

  expect(headersArtifact).toBe(`/*
  Content-Security-Policy: ${expectedHeaders["content-security-policy"]}
  X-Frame-Options: ${expectedHeaders["x-frame-options"]}
  X-Content-Type-Options: ${expectedHeaders["x-content-type-options"]}
  Referrer-Policy: ${expectedHeaders["referrer-policy"]}
  Permissions-Policy: ${expectedHeaders["permissions-policy"]}

/_astro/*
  Cache-Control: public, max-age=31536000, immutable

/offline/*
  X-Robots-Tag: noindex

/sw.js
  ! Content-Security-Policy
  Content-Security-Policy: default-src 'none'; connect-src 'self'

https://beta.ahammednibras.com/*
  X-Robots-Tag: noindex
`);
});

test("Cloudflare Pages applies the security headers to HTML responses", async ({
  request,
}) => {
  const home = await request.get("/");
  const notFound = await request.get("/route-that-does-not-exist");

  expect(home.status()).toBe(200);
  expect(notFound.status()).toBe(404);

  for (const [name, value] of Object.entries(expectedHeaders)) {
    expect(home.headers()[name]).toBe(value);
    expect(notFound.headers()[name]).toBe(value);
  }
});

test("only content-hashed assets are cached for a year", async ({
  page,
  request,
}) => {
  const immutable = "public, max-age=31536000, immutable";
  const responses: Promise<string>[] = [];

  page.on("response", (response) => {
    if (new URL(response.url()).pathname.startsWith("/_astro/")) {
      responses.push(
        response.allHeaders().then((headers) => headers["cache-control"] ?? ""),
      );
    }
  });
  await page.goto("/", { waitUntil: "load" });

  expect(responses.length).toBeGreaterThan(0);
  expect(new Set(await Promise.all(responses))).toEqual(new Set([immutable]));

  // HTML must revalidate, or a rollback would not reach returning visitors.
  const home = await request.get("/");
  expect(home.headers()["cache-control"]).not.toContain("immutable");

  // A missing file must not be remembered as missing for a year.
  const missing = await request.get("/_astro/does-not-exist.css");
  expect(missing.status()).toBe(404);
  expect(missing.headers()["cache-control"]).not.toContain("immutable");
});

test("the site can be installed from its web app manifest", async ({
  page,
  request,
}) => {
  const response = await request.get("/manifest.webmanifest");
  const manifest = (await response.json()) as {
    display: string;
    icons: { purpose?: string; sizes: string; src: string }[];
    start_url: string;
  };

  expect(response.status()).toBe(200);
  expect(manifest).toMatchObject({ display: "standalone", start_url: "/" });
  expect(manifest.icons.map(({ sizes }) => sizes)).toEqual(
    expect.arrayContaining(["192x192", "512x512"]),
  );
  expect(manifest.icons.some(({ purpose }) => purpose === "maskable")).toBe(
    true,
  );

  for (const { src } of manifest.icons) {
    const icon = await request.get(src);

    expect(icon.status(), src).toBe(200);
    expect(icon.headers()["content-type"], src).toBe("image/png");
  }

  await page.goto("/");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/manifest.webmanifest",
  );
});

test("Chromium reads the manifest under the security policy", async ({
  browserName,
  context,
  page,
}) => {
  test.skip(browserName !== "chromium", "Only Chromium exposes this check.");

  await page.goto("/");

  const session = await context.newCDPSession(page);
  const { errors, url } = await session.send("Page.getAppManifest");

  expect(url).toMatch(/\/manifest\.webmanifest$/);
  expect(errors).toEqual([]);
});
