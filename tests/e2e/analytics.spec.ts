import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { promisify } from "node:util";
import { expect, test, type Page, type Route } from "@playwright/test";

const run = promisify(execFile);
let buildDirectory = "";

type AnalyticsWindow = Window & {
  portfolioAnalyticsBeforeSend?: (
    type: string,
    input: unknown,
  ) => Record<string, unknown> | false;
  umami?: { track: (payload: Record<string, unknown>) => unknown };
  testPageviews?: Record<string, unknown>[];
  testPolicyViolations?: { directive: string; url: string }[];
};

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
  respondToExternal?: (route: Route) => Promise<void>,
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
  const documents: Record<string, string> = {
    "/": "index.html",
    "/privacy/": "privacy/index.html",
  };

  // Serve actual build files at each origin without visiting the live website.
  // Preserve the deployed policy and prevent every external request escaping.
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) {
      externalRequests.push(url.href);
      if (respondToExternal) await respondToExternal(route);
      else await route.abort();
      return;
    }

    const isDocument = route.request().resourceType() === "document";
    const filename = isDocument
      ? (documents[url.pathname] ?? "404.html")
      : url.pathname.slice(1);
    await route.fulfill({
      status: isDocument && !documents[url.pathname] ? 404 : 200,
      contentType:
        contentTypes[extname(filename)] ?? "application/octet-stream",
      headers: { "content-security-policy": policy },
      body: await readFile(join(buildDirectory, enabled, filename)),
    });
  });

  await page.goto(destination);
  return externalRequests;
}

for (const enabled of ["false", "true"] as const) {
  test(`the privacy notice reflects analytics ${enabled} without loading the tracker`, async ({
    page,
    request,
  }) => {
    const response = await request.get("/");
    const externalRequests = await visitBuild(
      page,
      enabled,
      "https://ahammednibras.com/privacy/?private=value#questions",
      response.headers()["content-security-policy"] ?? "",
    );
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Privacy");
    await expect(page.locator(".introduction > p").first()).toHaveText(
      enabled === "true"
        ? "Optional analytics is configured for the production homepage."
        : "Analytics collection is currently disabled.",
    );
    await expect(
      page.locator('script[src="https://cloud.umami.is/script.js"]'),
    ).toHaveCount(0);
    expect(externalRequests).toEqual([]);
  });
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

test("the enabled production homepage configures manual tracking at the permitted URLs", async ({
  page,
  request,
}) => {
  const response = await request.get("/");
  const policy = response.headers()["content-security-policy"];
  expect(policy).toContain(
    "script-src 'self' https://cloud.umami.is/script.js;",
  );
  expect(policy).toContain(
    "connect-src 'self' https://gateway.umami.is/api/send;",
  );
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
  await expect(tracker).toHaveAttribute(
    "data-host-url",
    "https://gateway.umami.is",
  );
  await expect(tracker).toHaveAttribute("data-domains", "ahammednibras.com");
  await expect(tracker).toHaveAttribute("data-exclude-search", "true");
  await expect(tracker).toHaveAttribute("data-exclude-hash", "true");
  await expect(tracker).toHaveAttribute(
    "data-before-send",
    "portfolioAnalyticsBeforeSend",
  );
  await expect(tracker).toHaveJSProperty("referrerPolicy", "no-referrer");
  await expect(page.locator("script:not([src])")).toHaveCount(0);
  expect(externalRequests).toEqual(["https://cloud.umami.is/script.js"]);
});

test("the permitted SDK load sends filtered pageviews and successful copies through the collector", async ({
  page,
  request,
}) => {
  const collected: unknown[] = [];
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: () => Promise.resolve() },
    });
  });
  const response = await request.get("/");
  const externalRequests = await visitBuild(
    page,
    "true",
    "https://ahammednibras.com/?private=value#contact",
    response.headers()["content-security-policy"] ?? "",
    async (route) => {
      const url = route.request().url();
      if (url === "https://cloud.umami.is/script.js") {
        expect(route.request().headers().referer).toBeUndefined();
        // Replace only the third-party SDK. The product must initiate tracking
        // after the browser's real load event and use native fetch under CSP.
        await route.fulfill({
          contentType: "application/javascript",
          body: `
            const collector = document.currentScript.dataset.hostUrl + "/api/send";
            window.umami = {
              track: (payload) => fetch(collector, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "event", payload }),
              }).then((response) => {
                if (!response.ok) throw new Error("Collection failed");
              }),
            };
          `,
        });
      } else if (url === "https://gateway.umami.is/api/send") {
        if (route.request().method() === "POST") {
          collected.push(route.request().postDataJSON());
        }
        await route.fulfill({
          contentType: "application/json",
          headers: {
            "access-control-allow-origin": "https://ahammednibras.com",
            "access-control-allow-methods": "POST, OPTIONS",
            "access-control-allow-headers": "content-type",
          },
          body: "{}",
        });
      } else {
        await route.abort();
      }
    },
  );
  const payload = {
    website: "994f1189-2ae4-48b0-9b15-6b8c6f5c785f",
    hostname: "ahammednibras.com",
    url: "/",
    title: "Portfolio",
    referrer: "",
  };
  await expect.poll(() => collected).toEqual([{ type: "event", payload }]);
  await page.getByRole("button", { name: "Copy email address" }).click();
  await expect(page.getByRole("status")).toHaveText("Email address copied.");
  await expect
    .poll(() => collected)
    .toEqual([
      { type: "event", payload },
      { type: "event", payload: { ...payload, name: "contact_email_copied" } },
    ]);
  expect(
    externalRequests.every((url) =>
      [
        "https://cloud.umami.is/script.js",
        "https://gateway.umami.is/api/send",
      ].includes(url),
    ),
  ).toBe(true);
  expect(pageErrors).toEqual([]);
});

test("the policy blocks other script and collection paths, other hosts, and inline scripts", async ({
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
  await page.evaluate(async () => {
    const violations: { directive: string; url: string }[] = [];
    (window as AnalyticsWindow).testPolicyViolations = violations;
    document.addEventListener("securitypolicyviolation", (event) => {
      violations.push({
        directive: event.effectiveDirective.startsWith("script-src")
          ? "script-src"
          : event.effectiveDirective,
        url:
          event.blockedURI === "inline"
            ? "inline"
            : new URL(event.blockedURI).origin,
      });
    });
    for (const src of [
      "https://cloud.umami.is/other.js",
      "https://unapproved.example/script.js",
    ]) {
      const script = document.createElement("script");
      script.src = src;
      document.head.append(script);
    }
    const inline = document.createElement("script");
    inline.textContent =
      "document.documentElement.dataset.inlineExecuted = 'true'";
    document.head.append(inline);
    await Promise.allSettled([
      fetch("https://gateway.umami.is/api/other", { method: "POST" }),
      fetch("https://unapproved.example/api/send", { method: "POST" }),
    ]);
  });
  await expect
    .poll(() =>
      page.evaluate(() => (window as AnalyticsWindow).testPolicyViolations),
    )
    .toEqual(
      expect.arrayContaining([
        { directive: "script-src", url: "https://cloud.umami.is" },
        { directive: "script-src", url: "https://unapproved.example" },
        { directive: "script-src", url: "inline" },
        { directive: "connect-src", url: "https://gateway.umami.is" },
        { directive: "connect-src", url: "https://unapproved.example" },
      ]),
    );
  await expect(page.locator("html")).not.toHaveAttribute(
    "data-inline-executed",
  );
  expect(externalRequests).toEqual(["https://cloud.umami.is/script.js"]);
});

test.describe("analytics payload filter", () => {
  test.beforeEach(async ({ page, request }) => {
    const response = await request.get("/");
    await visitBuild(
      page,
      "true",
      "https://ahammednibras.com/?private=value#contact",
      response.headers()["content-security-policy"] ?? "",
    );
  });

  test("pageviews and approved contact events contain only allowed fields", async ({
    page,
  }) => {
    const results = await page.evaluate(() => {
      const filter = (window as AnalyticsWindow).portfolioAnalyticsBeforeSend;
      if (!filter) throw new Error("Analytics filter was not registered.");
      return [
        undefined,
        "contact_gmail_clicked",
        "contact_email_app_clicked",
        "contact_email_copied",
      ].map((name) =>
        filter("event", {
          website: "994f1189-2ae4-48b0-9b15-6b8c6f5c785f",
          hostname: "unexpected.example",
          url: "/private?email=visitor@example.invalid#private",
          title: "Unapproved title",
          referrer: "https://github.com/private?source=private#private",
          name,
          id: "visitor-id",
          data: { email: "visitor@example.invalid", message: "Private text" },
          timestamp: 1,
          screen: "1920x1080",
          language: "en-US",
        }),
      );
    });

    const base = {
      website: "994f1189-2ae4-48b0-9b15-6b8c6f5c785f",
      hostname: "ahammednibras.com",
      url: "/",
      title: "Portfolio",
      referrer: "https://github.com",
    };
    expect(results).toEqual([
      base,
      { ...base, name: "contact_gmail_clicked" },
      { ...base, name: "contact_email_app_clicked" },
      { ...base, name: "contact_email_copied" },
    ]);
  });

  test("malformed payloads, other websites, unknown names, and other record types are rejected", async ({
    page,
  }) => {
    const results = await page.evaluate(() => {
      const filter = (window as AnalyticsWindow).portfolioAnalyticsBeforeSend;
      if (!filter) throw new Error("Analytics filter was not registered.");
      const valid = { website: "994f1189-2ae4-48b0-9b15-6b8c6f5c785f" };
      return {
        malformed: [null, undefined, [], "text", 5, {}].map((input) =>
          filter("event", input),
        ),
        otherWebsite: filter("event", { website: "other-website" }),
        names: ["unknown_event", "", null, 5].map((name) =>
          filter("event", { ...valid, name }),
        ),
        types: ["identify", "performance", "error"].map((type) =>
          filter(type, valid),
        ),
      };
    });

    expect(results).toEqual({
      malformed: [false, false, false, false, false, false],
      otherWebsite: false,
      names: [false, false, false, false],
      types: [false, false, false],
    });
  });

  test("referrers retain only external HTTPS origins", async ({ page }) => {
    const results = await page.evaluate(() => {
      const filter = (window as AnalyticsWindow).portfolioAnalyticsBeforeSend;
      if (!filter) throw new Error("Analytics filter was not registered.");
      return [
        "https://visitor:placeholder@example.org:8443/private?email=ignored#private",
        "https://ahammednibras.com/private?email=ignored#private",
        "/private?email=ignored",
        "not a URL",
        "http://example.org/private",
        "file:///private",
        "",
        null,
        5,
      ].map((referrer) => {
        const result = filter("event", {
          website: "994f1189-2ae4-48b0-9b15-6b8c6f5c785f",
          referrer,
        });
        return result && result.referrer;
      });
    });

    expect(results).toEqual([
      "https://example.org:8443",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ]);
  });

  test("exclusion, route changes, and storage failures are checked again before sending", async ({
    page,
  }) => {
    const results = await page.evaluate(() => {
      const filter = (window as AnalyticsWindow).portfolioAnalyticsBeforeSend;
      if (!filter) throw new Error("Analytics filter was not registered.");
      const input = { website: "994f1189-2ae4-48b0-9b15-6b8c6f5c785f" };
      const initial = filter("event", input);
      window.localStorage.setItem("umami.disabled", "1");
      const excluded = filter("event", input);
      window.localStorage.removeItem("umami.disabled");
      const restored = filter("event", input);
      window.history.pushState({}, "", "/404.html");
      const otherRoute = filter("event", input);
      window.history.replaceState({}, "", "/");
      const homeAgain = filter("event", input);
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new DOMException("Storage blocked", "SecurityError");
        },
      });
      return {
        initial,
        excluded,
        restored,
        otherRoute,
        homeAgain,
        storageBlocked: filter("event", input),
      };
    });

    const pageview = {
      website: "994f1189-2ae4-48b0-9b15-6b8c6f5c785f",
      hostname: "ahammednibras.com",
      url: "/",
      title: "Portfolio",
      referrer: "",
    };
    expect(results).toEqual({
      initial: pageview,
      excluded: false,
      restored: pageview,
      otherRoute: false,
      homeAgain: pageview,
      storageBlocked: false,
    });
  });
});

test.describe("analytics signals", () => {
  test.beforeEach(async ({ page, request }) => {
    // Stub the SDK boundary; the product listener must make the track call.
    await page.addInitScript(() => {
      const browserWindow = window as AnalyticsWindow;
      const pageviews: Record<string, unknown>[] = [];
      browserWindow.testPageviews = pageviews;
      browserWindow.umami = {
        track: (payload) => pageviews.push(payload),
      };
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: () => Promise.resolve() },
      });
    });
    const response = await request.get("/");
    await visitBuild(
      page,
      "true",
      "https://ahammednibras.com/?private=value#contact",
      response.headers()["content-security-policy"] ?? "",
    );
  });

  test("SDK readiness sends one filtered pageview even if signaled twice", async ({
    page,
  }) => {
    expect(
      await page.evaluate(() => (window as AnalyticsWindow).testPageviews),
    ).toEqual([]);
    const tracker = page.locator(
      'script[src="https://cloud.umami.is/script.js"]',
    );
    // Supply the dependency's ready signal; do not write the expected pageview.
    await tracker.dispatchEvent("load");
    await tracker.dispatchEvent("load");

    expect(
      await page.evaluate(() => (window as AnalyticsWindow).testPageviews),
    ).toEqual([
      {
        website: "994f1189-2ae4-48b0-9b15-6b8c6f5c785f",
        hostname: "ahammednibras.com",
        url: "/",
        title: "Portfolio",
        referrer: "",
      },
    ]);
  });

  test("exclusion set before SDK readiness prevents the pageview", async ({
    page,
  }) => {
    await page.evaluate(() =>
      window.localStorage.setItem("umami.disabled", "1"),
    );
    await page
      .locator('script[src="https://cloud.umami.is/script.js"]')
      .dispatchEvent("load");

    expect(
      await page.evaluate(() => (window as AnalyticsWindow).testPageviews),
    ).toEqual([]);
  });

  test("native contact link activation emits once without waiting for analytics", async ({
    page,
    context,
  }) => {
    await page.evaluate(() => {
      // Invalid signals must not turn into pageviews or arbitrary event data.
      for (const detail of [undefined, null, 5, {}, "unknown_event"]) {
        document.dispatchEvent(
          new CustomEvent("portfolio-contact", { detail }),
        );
      }
      document.dispatchEvent(new Event("portfolio-contact"));
      const browserWindow = window as AnalyticsWindow;
      browserWindow.umami = {
        track: (payload) => {
          browserWindow.testPageviews?.push(payload);
          return new Promise<never>(() => {
            // Stay pending to prove that navigation does not await tracking.
          });
        },
      };
    });
    expect(
      await page.evaluate(() => (window as AnalyticsWindow).testPageviews),
    ).toEqual([]);

    await context.route("https://mail.google.com/**", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: "<!doctype html><html lang='en'><head><title>Compose destination</title></head><body>Compose destination intercepted.</body></html>",
      }),
    );
    const popupPromise = context.waitForEvent("page");
    await page.getByRole("link", { name: "Write in Gmail" }).click();
    const popup = await popupPromise;
    await expect(popup).toHaveTitle("Compose destination");
    await popup.close();

    const emailApp = page.getByRole("link", { name: "Open email app" });
    // Keep the operating system mail handler outside this browser test.
    await emailApp.evaluate((link) =>
      link.addEventListener("click", (event) => event.preventDefault(), {
        once: true,
      }),
    );
    await emailApp.focus();
    await page.keyboard.press("Enter");
    const base = {
      website: "994f1189-2ae4-48b0-9b15-6b8c6f5c785f",
      hostname: "ahammednibras.com",
      url: "/",
      title: "Portfolio",
      referrer: "",
    };
    expect(
      await page.evaluate(() => (window as AnalyticsWindow).testPageviews),
    ).toEqual([
      { ...base, name: "contact_gmail_clicked" },
      { ...base, name: "contact_email_app_clicked" },
    ]);
  });

  test("copy signals follow successful writes, ignore pending duplicates, and recover after failure", async ({
    page,
  }) => {
    await page.evaluate(() => {
      let writes = 0;
      Object.assign(navigator.clipboard, {
        writeText: () => {
          document.documentElement.dataset.copyWrites = String(++writes);
          return new Promise<void>((resolve) =>
            document.addEventListener("finish-copy", () => resolve(), {
              once: true,
            }),
          );
        },
      });
    });
    const copy = page.getByRole("button", { name: "Copy email address" });
    await copy.focus();
    await page.keyboard.press("Enter");
    await expect(copy).toBeDisabled();
    await page.keyboard.press("Enter");
    await expect(page.locator("html")).toHaveAttribute("data-copy-writes", "1");
    expect(
      await page.evaluate(() => (window as AnalyticsWindow).testPageviews),
    ).toEqual([]);

    await page.evaluate(() => document.dispatchEvent(new Event("finish-copy")));
    await expect(page.getByRole("status")).toHaveText("Email address copied.");
    const copied = {
      website: "994f1189-2ae4-48b0-9b15-6b8c6f5c785f",
      hostname: "ahammednibras.com",
      url: "/",
      title: "Portfolio",
      referrer: "",
      name: "contact_email_copied",
    };
    expect(
      await page.evaluate(() => (window as AnalyticsWindow).testPageviews),
    ).toEqual([copied]);

    await page.evaluate(() =>
      Object.assign(navigator.clipboard, {
        writeText: () => Promise.reject(new DOMException("Denied")),
      }),
    );
    await copy.click();
    await expect(page.getByRole("status")).toContainText("Couldn’t copy.");
    expect(
      await page.evaluate(() => (window as AnalyticsWindow).testPageviews),
    ).toEqual([copied]);

    await page.evaluate(() =>
      Object.assign(navigator.clipboard, {
        writeText: () => Promise.resolve(),
      }),
    );
    await copy.click();
    await expect(page.getByRole("status")).toHaveText("Email address copied.");
    await page.evaluate(() =>
      window.localStorage.setItem("umami.disabled", "1"),
    );
    await copy.click();
    await expect(page.getByRole("status")).toHaveText("Email address copied.");
    expect(
      await page.evaluate(() => (window as AnalyticsWindow).testPageviews),
    ).toEqual([copied, copied]);
  });

  for (const failure of ["missing", "throws", "rejects"] as const) {
    test(`a ${failure} SDK leaves email copying usable without an uncaught error`, async ({
      page,
    }) => {
      const pageErrors: string[] = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      await page.evaluate((mode) => {
        const browserWindow = window as AnalyticsWindow;
        if (mode === "missing") {
          delete browserWindow.umami;
        } else {
          browserWindow.umami = {
            track: () => {
              if (mode === "throws") throw new Error("SDK unavailable");
              return Promise.reject(new Error("Collection failed"));
            },
          };
        }
      }, failure);
      await page
        .locator('script[src="https://cloud.umami.is/script.js"]')
        .dispatchEvent("load");
      await page.getByRole("button", { name: "Copy email address" }).click();
      await expect(page.getByRole("status")).toHaveText(
        "Email address copied.",
      );
      expect(pageErrors).toEqual([]);
    });
  }
});

test("contact links still emit signals when the Clipboard API is unavailable", async ({
  page,
  request,
}) => {
  await page.addInitScript(() => {
    const browserWindow = window as AnalyticsWindow;
    const calls: Record<string, unknown>[] = [];
    browserWindow.testPageviews = calls;
    browserWindow.umami = { track: (payload) => calls.push(payload) };
    Object.defineProperty(navigator, "clipboard", { value: undefined });
  });
  const response = await request.get("/");
  await visitBuild(
    page,
    "true",
    "https://ahammednibras.com/",
    response.headers()["content-security-policy"] ?? "",
  );
  await expect(
    page.getByRole("button", { name: "Copy email address" }),
  ).toHaveCount(0);
  for (const label of ["Write in Gmail", "Open email app"]) {
    const link = page.getByRole("link", { name: label });
    await link.evaluate((anchor) =>
      anchor.addEventListener("click", (event) => event.preventDefault()),
    );
    await link.focus();
    await page.keyboard.press("Enter");
  }
  expect(
    await page.evaluate(() =>
      (window as AnalyticsWindow).testPageviews?.map((event) => event.name),
    ),
  ).toEqual(["contact_gmail_clicked", "contact_email_app_clicked"]);
});

test("the privacy control excludes production visits across reload and removing it restores tracker loading", async ({
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

  // Save the preference through the product UI, then test the actual loader.
  const footer = page.getByRole("contentinfo");
  await footer.getByRole("link", { name: "Privacy", exact: true }).click();
  await expect(page).toHaveURL("https://ahammednibras.com/privacy/");
  const checkbox = page.getByRole("checkbox", {
    name: "Exclude this browser from analytics",
  });
  await checkbox.check();
  await footer.getByRole("link", { name: "Home", exact: true }).click();
  await expect(page).toHaveURL("https://ahammednibras.com/");
  await expect(tracker).toHaveCount(0);
  await page.reload();
  await expect(tracker).toHaveCount(0);
  expect(
    await page.evaluate(() => window.localStorage.getItem("umami.disabled")),
  ).toBe("1");
  expect(externalRequests).toEqual(["https://cloud.umami.is/script.js"]);

  await footer.getByRole("link", { name: "Privacy", exact: true }).click();
  await expect(checkbox).toBeChecked();
  await checkbox.uncheck();
  await footer.getByRole("link", { name: "Home", exact: true }).click();
  await expect(tracker).toHaveCount(1);
  expect(externalRequests).toEqual([
    "https://cloud.umami.is/script.js",
    "https://cloud.umami.is/script.js",
  ]);
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
