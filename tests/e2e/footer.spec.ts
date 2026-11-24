import { expect, test, type Page } from "@playwright/test";
import { pressTab } from "../helpers/keyboard";

test("footer links navigate Home and Privacy in the same tab without JavaScript", async ({
  browser,
  browserName,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto("/");
    const origin = new URL(page.url()).origin;
    const footer = page.getByRole("contentinfo");
    await expect(footer.getByRole("link")).toHaveCount(1);
    const privacy = footer.getByRole("link", { name: "Privacy", exact: true });
    await expect(privacy).toHaveAttribute("href", "/privacy/");
    await expect(privacy).not.toHaveAttribute("target");
    await expect(privacy).not.toHaveAttribute("aria-describedby", /new-tab/);
    await expect(privacy).not.toHaveAttribute("title", /new tab/);
    await privacy.click();
    await expect(page).toHaveURL(`${origin}/privacy/`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Privacy");
    expect(context.pages()).toHaveLength(1);

    // Follow the full native keyboard order on the privacy page.
    for (const link of [
      page.getByRole("link", { name: "Umami’s privacy notice" }),
      page.getByRole("link", { name: "ahammednibras737@gmail.com" }),
      footer.getByRole("link", { name: "Home", exact: true }),
    ]) {
      await pressTab(page, browserName);
      await expect(link).toBeFocused();
    }
    const home = footer.getByRole("link", { name: "Home", exact: true });
    await expect(home).toHaveAttribute("href", "/");
    await expect(home).not.toHaveAttribute("target");
    await expect(home).not.toHaveAttribute("aria-describedby", /new-tab/);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(`${origin}/`);
    await expect(privacy).toBeVisible();
    expect(context.pages()).toHaveLength(1);
    await page.goBack();
    await expect(page).toHaveURL(`${origin}/privacy/`);
    await expect(home).toBeVisible();

    const missing = await page.goto("/route-that-does-not-exist");
    expect(missing?.status()).toBe(404);
    await expect(home).toBeVisible();
    await home.click();
    await expect(page).toHaveURL(`${origin}/`);
    expect(context.pages()).toHaveLength(1);
  } finally {
    await context.close();
  }
});

async function expectUsableFooter(page: Page) {
  const footer = page.getByRole("contentinfo");
  const identity = footer.locator(".site-footer-location");
  const link = footer.getByRole("link");
  await expect(link).toHaveCount(1);
  await expect(identity).toHaveText(
    "Ahammed Nibras · Kozhikode, Kerala, India",
  );
  await expect(identity.locator("a")).toHaveCount(0);
  await expect(link).toBeVisible();
  const [frame, name, action] = await Promise.all([
    footer.boundingBox(),
    identity.boundingBox(),
    link.boundingBox(),
  ]);
  if (!frame || !name || !action) throw new Error("Footer is not rendered.");
  expect(action.width).toBeGreaterThanOrEqual(44);
  expect(action.height).toBeGreaterThanOrEqual(44);
  expect(action.x).toBeGreaterThanOrEqual(frame.x + frame.width / 2);
  expect(action.x + action.width).toBeLessThanOrEqual(frame.x + frame.width);
  expect(
    name.x + name.width <= action.x ||
      action.x + action.width <= name.x ||
      name.y + name.height <= action.y ||
      action.y + action.height <= name.y,
  ).toBe(true);
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
}

for (const path of ["/", "/privacy/"]) {
  for (const width of [320, 1440]) {
    test(`the footer on ${path} stays on the right without overlapping at ${width}px`, async ({
      page,
      browserName,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      await expectUsableFooter(page);
      if (browserName === "chromium") {
        await page.screenshot({
          path: testInfo.outputPath(`footer-${width}.png`),
          fullPage: true,
        });
      }
      if (width === 320) {
        await page.evaluate(() => {
          document.documentElement.style.fontSize = "200%";
        });
        await expectUsableFooter(page);
      }
    });
  }
}

test("the footer link keeps visible keyboard focus in forced colors", async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "Forced-colors emulation is Chromium-only.",
  );
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/privacy/");
  const home = page
    .getByRole("contentinfo")
    .getByRole("link", { name: "Home" });
  const checkbox = page.getByRole("checkbox", {
    name: "Exclude this browser from analytics",
  });
  await expect(checkbox).toBeVisible();
  for (const control of [
    page.getByRole("link", { name: "Umami’s privacy notice" }),
    checkbox,
    page.getByRole("link", { name: "ahammednibras737@gmail.com" }),
    home,
  ]) {
    await pressTab(page, browserName);
    await expect(control).toBeFocused();
  }
  await expect(home).toBeFocused();
  await expect(home).toHaveCSS("outline-style", "solid");
  const colors = await home.evaluate((link) => ({
    link: getComputedStyle(link).color,
    body: getComputedStyle(document.body).color,
    outline: Number.parseFloat(getComputedStyle(link).outlineWidth),
  }));
  expect(colors.link).not.toBe(colors.body);
  expect(colors.outline).toBeGreaterThan(0);
});
