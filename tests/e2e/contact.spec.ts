import { expect, test } from "@playwright/test";

const email = "ahammednibras737@gmail.com";

test("the homepage copies only the email address and waits for success", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: (text: string) =>
          new Promise<void>((resolve) => {
            document.documentElement.dataset.copiedText = text;
            document.documentElement.dataset.copyWrites = String(
              Number(document.documentElement.dataset.copyWrites ?? 0) + 1,
            );
            document.addEventListener("finish-copy", () => resolve(), {
              once: true,
            });
          }),
      },
    });
  });
  await page.goto("/");
  const button = page.getByRole("button", { name: "Copy email address" });
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(button).toBeDisabled();
  await expect(button).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-copy-writes", "1");
  await expect(page.getByRole("status")).toBeEmpty();
  await expect(page.locator("[data-copy-tooltip]")).toBeHidden();
  await expect(button).not.toHaveAttribute("data-copied");
  await expect(page.locator("html")).toHaveAttribute("data-copied-text", email);
  await page.evaluate(() => document.dispatchEvent(new Event("finish-copy")));
  await expect(page.getByRole("status")).toHaveText("Email address copied.");
  await expect(button).toBeEnabled();
  await expect(button).toBeFocused();
  await expect(page).toHaveURL(/\/$/);
});

test("the homepage leaves a manual fallback when clipboard permission is denied", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: () =>
          Promise.reject(new DOMException("Denied", "NotAllowedError")),
      },
    });
  });
  await page.goto("/");
  const button = page.getByRole("button", { name: "Copy email address" });
  await button.focus();
  await page.keyboard.press("Space");
  await expect(page.getByRole("status")).toHaveText(
    "Couldn’t copy. Select and copy the email address above.",
  );
  await expect(page.getByRole("status")).toHaveAttribute("data-error", "");
  await expect(page.getByRole("status")).toBeVisible();
  await expect(page.locator("[data-copy-tooltip]")).toBeHidden();
  await expect(button).not.toHaveAttribute("data-copied");
  await expect(page.locator("[itemprop='email']")).toHaveText(email);
  await expect(button).toBeEnabled();
  await expect(
    page.getByRole("link", { name: "Open email app" }),
  ).toHaveAttribute("href", `mailto:${email}`);
});

test("the homepage hides copying when the Clipboard API is unavailable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { value: undefined });
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Copy email address" }),
  ).toHaveCount(0);
  await expect(page.locator("[itemprop='email']")).toHaveText(email);
  await expect(
    page.getByRole("link", { name: "Open email app" }),
  ).toBeVisible();
});

test("the homepage keeps copying usable at narrow and enlarged text sizes", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: () => Promise.resolve() },
    });
  });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  const button = page.getByRole("button", {
    name: "Copy email address",
    exact: true,
  });
  await expect(button).toBeVisible();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const fontSize of ["100%", "200%"]) {
      await page.locator(".email-contact").evaluate((contact, size) => {
        contact.style.fontSize = size;
      }, fontSize);
      const geometry = await page
        .locator(".email-address-row")
        .evaluate((row) => {
          const copy = row.querySelector("button")?.getBoundingClientRect();
          if (!copy) throw new Error("Missing email actions.");
          return {
            width: copy.width,
            height: copy.height,
            right: copy.right,
            viewport: document.documentElement.clientWidth,
            overflow:
              document.documentElement.scrollWidth -
              document.documentElement.clientWidth,
          };
        });
      expect(geometry.width).toBeGreaterThanOrEqual(44);
      expect(geometry.height).toBeGreaterThanOrEqual(44);
      expect(geometry.right).toBeLessThanOrEqual(geometry.viewport);
      expect(geometry.overflow).toBe(0);
      await button.click();
      const tooltip = page.locator("[data-copy-tooltip]");
      await expect(tooltip).toBeVisible();
      const tip = await tooltip.boundingBox();
      expect(tip?.x).toBeGreaterThanOrEqual(0);
      expect((tip?.x ?? 0) + (tip?.width ?? 0)).toBeLessThanOrEqual(width);
      await page.keyboard.press("Escape");
    }
  }
});

test("the About page initializes its copy action", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: (text: string) => {
          document.documentElement.dataset.copiedText = text;
          return Promise.resolve();
        },
      },
    });
  });
  await page.goto("/about/");
  await page.getByRole("button", { name: "Copy email address" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-copied-text", email);
  await expect(page.getByRole("status")).toHaveText("Email address copied.");
});

for (const path of ["/", "/about/"]) {
  test(`${path} keeps profiles, experience, and contact usable without JavaScript`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 320, height: 800 },
    });
    const page = await context.newPage();
    await page.goto(path);
    await expect(page.locator("main > section > h2")).toHaveText(
      path === "/"
        ? ["Experience", "Contact"]
        : ["Experience", "How I work", "Contact"],
    );
    await expect(page.locator(".introduction .profile-links a")).toHaveText([
      "GitHub",
      "LinkedIn",
    ]);
    await expect(page.locator(".experience-list h3")).toHaveText([
      "Developer · Insource Data",
      "Intern · NysaClan",
    ]);
    for (const [name, url] of [
      ["Insource Data", "https://insourcedata.io/"],
      ["NysaClan", "https://nysaclan.com/"],
    ] as const) {
      const company = page.getByRole("link", { name, exact: true });
      await expect(company).toBeVisible();
      await expect(company).toHaveAttribute("href", url);
      await expect(company).toHaveAttribute("target", "_blank");
    }
    await expect(page.locator("[itemprop='email']")).toHaveText(email);
    await expect(
      page.getByRole("button", { name: "Copy email address" }),
    ).toHaveCount(0);
    await page.locator("[data-email-address]").evaluate((address) => {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(address);
      selection?.removeAllRanges();
      selection?.addRange(range);
    });
    expect(
      await page.evaluate(() => window.getSelection()?.toString().trim()),
    ).toBe(email);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBe(0);
    await context.close();
  });
}

test("the real clipboard write works under the deployed content security policy", async ({
  page,
  context,
  browserName,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  if (browserName === "chromium") {
    // Automated Chromium denies clipboard access without an explicit grant.
    await context.grantPermissions(["clipboard-read", "clipboard-write"], {
      origin: new URL(page.url()).origin,
    });
  }
  await expect(page.locator("script:not([src])")).toHaveCount(0);
  await page.getByRole("button", { name: "Copy email address" }).click();
  await expect(page.getByRole("status")).toHaveText("Email address copied.");
  if (browserName === "chromium") {
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      email,
    );
  }
  expect(errors).toEqual([]);
});

test("copying works with a touch tap", async ({ browser, browserName }) => {
  test.skip(
    browserName === "firefox",
    "Firefox does not support touch emulation.",
  );
  const context = await browser.newContext({
    hasTouch: true,
    viewport: { width: 320, height: 800 },
  });
  const page = await context.newPage();
  await page.goto("/");
  if (browserName === "chromium") {
    await context.grantPermissions(["clipboard-write"], {
      origin: new URL(page.url()).origin,
    });
  }
  await page.getByRole("button", { name: "Copy email address" }).tap();
  await expect(page.getByRole("status")).toHaveText("Email address copied.");
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBe(0);
  await context.close();
});
