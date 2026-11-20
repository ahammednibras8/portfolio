import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { promisify } from "node:util";
import { expect, test, type Page } from "@playwright/test";

const run = promisify(execFile);
let buildDirectory = "";

// Each project builds both settings once; do not change source or the local env.
test.describe.configure({ mode: "default" });
test.beforeAll(async () => {
  test.setTimeout(120_000);
  buildDirectory = await mkdtemp(join(tmpdir(), "portfolio-analytics-"));
  for (const enabled of ["false", "true"]) {
    await run(
      "pnpm",
      ["exec", "astro", "build", "--outDir", join(buildDirectory, enabled)],
      {
        env: { ...process.env, PUBLIC_ANALYTICS_ENABLED: enabled },
        timeout: 60_000,
      },
    );
  }
});

test.afterAll(async () => {
  if (buildDirectory)
    await rm(buildDirectory, { recursive: true, force: true });
});

async function visitBuild(
  page: Page,
  enabled: string,
  destination: string,
  policy: string,
) {
  const externalRequests: string[] = [];
  const origin = new URL(destination).origin;
  const contentTypes: Record<string, string> = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".woff2": "font/woff2",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
  };

  // Serve actual build files at each origin without visiting the live website.
  // Preserve the deployed policy and prevent every external request escaping.
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) {
      externalRequests.push(url.href);
      await route.abort();
      return;
    }

    const isDocument = route.request().resourceType() === "document";
    const filename = isDocument
      ? url.pathname === "/"
        ? "index.html"
        : "404.html"
      : url.pathname.slice(1);
    await route.fulfill({
      status: isDocument && url.pathname !== "/" ? 404 : 200,
      contentType:
        contentTypes[extname(filename)] ?? "application/octet-stream",
      headers: { "content-security-policy": policy },
      body: await readFile(join(buildDirectory, enabled, filename)),
    });
  });

  await page.goto(destination);
  return externalRequests;
}

for (const [enabled, destination] of [
  ["false", "https://ahammednibras.com/"],
  ["true", "http://127.0.0.1:4322/"],
  ["true", "https://feedback.ahammed-nibras.pages.dev/"],
  ["true", "https://ahammednibras.com.preview.example/"],
  ["true", "http://ahammednibras.com/"],
  ["true", "https://ahammednibras.com/404.html"],
] as const) {
  test(`analytics ${enabled} does not load on ${destination}`, async ({
    page,
    request,
  }) => {
    const response = await request.get("/");
    const policy = response.headers()["content-security-policy"];
    expect(policy).toBeTruthy();
    const externalRequests = await visitBuild(
      page,
      enabled,
      destination,
      policy ?? "",
    );

    await expect(
      page.locator('script[src="https://cloud.umami.is/script.js"]'),
    ).toHaveCount(0);
    expect(externalRequests).toEqual([]);
  });
}

test("the enabled production homepage configures manual tracking and remains blocked by the current policy", async ({
  page,
  request,
}) => {
  const response = await request.get("/");
  const policy = response.headers()["content-security-policy"];
  expect(policy).toContain("script-src 'self';");
  const externalRequests = await visitBuild(
    page,
    "true",
    "https://ahammednibras.com/?source=ignored#contact",
    policy ?? "",
  );

  const tracker = page.locator(
    'script[src="https://cloud.umami.is/script.js"]',
  );
  await expect(tracker).toHaveCount(1);
  await expect(tracker).toHaveAttribute(
    "data-website-id",
    "994f1189-2ae4-48b0-9b15-6b8c6f5c785f",
  );
  await expect(tracker).toHaveAttribute("data-auto-track", "false");
  await expect(tracker).toHaveAttribute("data-domains", "ahammednibras.com");
  await expect(tracker).toHaveAttribute("data-exclude-search", "true");
  await expect(tracker).toHaveAttribute("data-exclude-hash", "true");
  await expect(tracker).toHaveJSProperty("referrerPolicy", "no-referrer");
  await expect(page.locator("script:not([src])")).toHaveCount(0);
  expect(externalRequests).toEqual([]);
});

test("the internal visit exclusion survives reload and removing it restores tracker loading", async ({
  page,
  request,
}) => {
  const response = await request.get("/");
  const externalRequests = await visitBuild(
    page,
    "true",
    "https://ahammednibras.com/",
    response.headers()["content-security-policy"] ?? "",
  );
  const tracker = page.locator(
    'script[src="https://cloud.umami.is/script.js"]',
  );
  await expect(tracker).toHaveCount(1);

  // Use the documented console action, then exercise the persisted preference.
  await page.evaluate(() => window.localStorage.setItem("umami.disabled", "1"));
  await page.reload();
  await expect(tracker).toHaveCount(0);
  expect(
    await page.evaluate(() => window.localStorage.getItem("umami.disabled")),
  ).toBe("1");

  await page.evaluate(() => window.localStorage.removeItem("umami.disabled"));
  await page.reload();
  await expect(tracker).toHaveCount(1);
  expect(externalRequests).toEqual([]);
});

test("unreadable browser storage keeps analytics off without breaking contact", async ({
  page,
  request,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("Storage blocked", "SecurityError");
      },
    });
  });
  const response = await request.get("/");
  const externalRequests = await visitBuild(
    page,
    "true",
    "https://ahammednibras.com/",
    response.headers()["content-security-policy"] ?? "",
  );

  await expect(
    page.locator('script[src="https://cloud.umami.is/script.js"]'),
  ).toHaveCount(0);
  await expect(page.locator("[data-email-address]")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open email app" }),
  ).toHaveAttribute("href", "mailto:ahammednibras737@gmail.com");
  await expect(
    page.getByRole("link", { name: "Write in Gmail" }),
  ).toBeVisible();
  expect(pageErrors).toEqual([]);
  expect(externalRequests).toEqual([]);
});
