import { expect, test, type Page } from "@playwright/test";
import { pressTab } from "../helpers/keyboard";

const origin = new URL(process.env.SITE_URL ?? "").origin;

test("the privacy route publishes its notice and metadata without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    const response = await page.goto("/privacy/");
    expect(response?.status()).toBe(200);
    // Inspect source bytes: browsers can repair a script placed after </html>.
    const html = (await response?.text()) ?? "";
    const documentEnd = html.search(/<\/html>/i);
    expect(documentEnd).toBeGreaterThan(0);
    for (const script of html.matchAll(/<script\b/gi)) {
      expect(script.index).toBeLessThan(documentEnd);
    }
    await expect(page).toHaveTitle("Privacy — Ahammed Nibras");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Privacy");
    await expect(page.getByRole("heading", { level: 2 })).toHaveText([
      "Analytics",
      "Your choice",
      "Questions",
    ]);
    await expect(page.getByRole("checkbox")).toHaveCount(0);
    // Match the rendered paragraph; text matching skips the noscript wrapper.
    const fallback = page.locator("noscript p");
    await expect(fallback).toBeVisible();
    await expect(fallback).toHaveText(
      "Analytics does not run when JavaScript is disabled.",
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `${origin}/privacy/`,
    );
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      "content",
      `${origin}/privacy/`,
    );
    await expect(page.locator("[itemscope]")).toHaveCount(0);
    const providerLink = page.getByRole("link", {
      name: "Umami’s privacy notice",
    });
    await expect(providerLink).toHaveAttribute(
      "href",
      "https://umami.is/privacy",
    );
    await expect(page.locator("p").filter({ has: providerLink })).toContainText(
      "Read Umami’s privacy notice for provider information.",
    );
    const emailLink = page.getByRole("link", {
      name: "ahammednibras737@gmail.com",
    });
    await expect(emailLink).toHaveAttribute(
      "href",
      "mailto:ahammednibras737@gmail.com",
    );
    await expect(page.locator("p").filter({ has: emailLink })).toContainText(
      "email ahammednibras737@gmail.com.",
    );
  } finally {
    await context.close();
  }
});

type PreferenceTestWindow = Window & { restorePreferenceStorage?: () => void };

async function failPreferenceStorage(
  page: Page,
  operation: "getItem" | "setItem" | "removeItem",
) {
  await page.evaluate((methodName) => {
    const original = Storage.prototype[methodName];
    Object.defineProperty(Storage.prototype, methodName, {
      value: () => {
        throw new DOMException("Storage unavailable", "SecurityError");
      },
    });
    (window as PreferenceTestWindow).restorePreferenceStorage = () => {
      Object.defineProperty(Storage.prototype, methodName, { value: original });
    };
  }, operation);
}

test("the browser exclusion can be changed by keyboard and survives reload", async ({
  page,
  browserName,
}) => {
  await page.goto("/privacy/");
  const checkbox = page.getByRole("checkbox", {
    name: "Exclude this browser from analytics",
  });
  const status = page.getByRole("status");
  await expect(checkbox).not.toBeChecked();
  await expect(status).toBeEmpty();
  await pressTab(page, browserName);
  await expect(
    page.getByRole("link", { name: "Umami’s privacy notice" }),
  ).toBeFocused();
  await pressTab(page, browserName);
  await expect(checkbox).toBeFocused();
  await page.keyboard.press("Space");
  await expect(checkbox).toBeChecked();
  expect(
    await page.evaluate(() => window.localStorage.getItem("umami.disabled")),
  ).toBe("1");
  await page.reload();
  await expect(checkbox).toBeChecked();
  await expect(status).toHaveText("This browser is excluded from analytics.");

  // Clicking the label exercises its native association with the input.
  await page.locator("label.analytics-exclusion").click();
  await expect(checkbox).not.toBeChecked();
  await expect(status).toBeEmpty();
  expect(
    await page.evaluate(() => window.localStorage.getItem("umami.disabled")),
  ).toBeNull();
  await page.reload();
  await expect(checkbox).not.toBeChecked();
  await expect(status).toBeEmpty();
});

for (const operation of ["setItem", "removeItem"] as const) {
  test(`a failed ${operation} restores the saved preference and a later attempt succeeds`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/privacy/");
    const checkbox = page.getByRole("checkbox", {
      name: "Exclude this browser from analytics",
    });
    const initiallyExcluded = operation === "removeItem";
    if (initiallyExcluded) await checkbox.check();
    await failPreferenceStorage(page, operation);
    await checkbox.click();
    await expect(checkbox).toBeChecked({ checked: initiallyExcluded });
    await expect(page.getByRole("status")).toContainText(
      "Couldn’t save your change.",
    );
    expect(
      await page.evaluate(() => window.localStorage.getItem("umami.disabled")),
    ).toBe(initiallyExcluded ? "1" : null);

    await page.evaluate(() =>
      (window as PreferenceTestWindow).restorePreferenceStorage?.(),
    );
    await checkbox.click();
    await expect(checkbox).toBeChecked({ checked: !initiallyExcluded });
    await expect(page.getByRole("status")).not.toContainText("Couldn’t save");
    await page.reload();
    await expect(checkbox).toBeChecked({ checked: !initiallyExcluded });
    expect(errors).toEqual([]);
  });
}

test("other tabs update the preference and recover from unreadable storage", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/privacy/");
  const checkbox = page.getByRole("checkbox", {
    name: "Exclude this browser from analytics",
  });
  const other = await context.newPage();
  try {
    await other.goto("/privacy/");
    const otherCheckbox = other.getByRole("checkbox", {
      name: "Exclude this browser from analytics",
    });
    await checkbox.check();
    await expect(otherCheckbox).toBeChecked();
    await failPreferenceStorage(page, "getItem");
    await otherCheckbox.uncheck();
    await expect(page.locator("[data-analytics-exclusion]")).toBeHidden();
    await expect(page.getByRole("status")).toContainText(
      "Browser storage is unavailable.",
    );

    await page.evaluate(() =>
      (window as PreferenceTestWindow).restorePreferenceStorage?.(),
    );
    await otherCheckbox.check();
    await expect(checkbox).toBeVisible();
    await expect(checkbox).toBeChecked();
    await expect(page.getByRole("status")).toHaveText(
      "This browser is excluded from analytics.",
    );
    // Let the browser emit the real storage event for clearing site data.
    await other.evaluate(() => window.localStorage.clear());
    await expect(checkbox).not.toBeChecked();
    await expect(page.getByRole("status")).toBeEmpty();
    expect(errors).toEqual([]);
  } finally {
    await other.close();
  }
});

test("unreadable storage at startup hides the control while keeping the notice usable", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("Storage unavailable", "SecurityError");
      },
    });
  });
  await page.goto("/privacy/");
  await expect(page.locator("[data-analytics-exclusion]")).toHaveCount(1);
  await expect(page.locator("[data-analytics-exclusion]")).toBeHidden();
  await expect(page.getByRole("status")).toContainText(
    "Analytics stays off while storage cannot be read.",
  );
  await expect(
    page.getByRole("link", { name: "ahammednibras737@gmail.com" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

for (const width of [320, 1440]) {
  test(`the privacy notice reflows at ${width}px without clipping its links`, async ({
    page,
    browserName,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/privacy/");
    expect(
      await page.evaluate(() => ({
        content: document.documentElement.scrollWidth,
        viewport: document.documentElement.clientWidth,
      })),
    ).toEqual({ content: width, viewport: width });
    for (const link of await page.getByRole("link").all()) {
      await expect(link).toBeVisible();
      const bounds = await link.boundingBox();
      if (!bounds) throw new Error("Privacy link has no rendered bounds.");
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    }
    if (browserName === "chromium") {
      await page.screenshot({
        path: testInfo.outputPath(`privacy-${width}.png`),
        fullPage: true,
      });
    }
  });
}
