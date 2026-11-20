import { expect, test } from "@playwright/test";
import { pressTab } from "../helpers/keyboard";

const homepageTitle = "Ahammed Nibras — Software developer";
const homepageDescription =
  "Ahammed Nibras is a software developer who builds AI products and the systems that keep them running.";
const siteOrigin = new URL(process.env.SITE_URL ?? "").origin;

test("the homepage introduces Nibras, experience, and contact", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page).toHaveTitle(homepageTitle);
  await expect(
    page.getByRole("heading", { level: 1, name: "Hi, I’m Ahammed Nibras." }),
  ).toBeVisible();
  await expect(page.locator("main > section > h2")).toHaveText([
    "Experience",
    "Contact",
  ]);
  await expect(page.locator(".experience-list h3")).toHaveText([
    "Developer · Insource Data",
    "Intern · NysaClan",
  ]);
  await expect(page.locator(".experience-dates")).toHaveText([
    "Jan 2026 — Present",
    "Jun 2025 — Sep 2025",
  ]);
  await expect(page.getByRole("contentinfo")).toHaveText(
    "Ahammed Nibras · Kozhikode, Kerala, India",
  );
});

test("the homepage publishes canonical, social, and favicon metadata", async ({
  page,
  request,
}) => {
  await page.goto("/");

  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    homepageDescription,
  );
  await expect(page.locator('meta[name="author"]')).toHaveAttribute(
    "content",
    "Ahammed Nibras",
  );

  const canonicalLink = page.locator('link[rel="canonical"]');
  await expect(canonicalLink).toHaveCount(1);

  await expect(canonicalLink).toHaveAttribute("href", `${siteOrigin}/`);

  await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute(
    "content",
    "Ahammed Nibras",
  );
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute(
    "content",
    "website",
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    homepageTitle,
  );
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
    "content",
    homepageDescription,
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    "content",
    `${siteOrigin}/`,
  );

  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary",
  );
  await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute(
    "content",
    homepageTitle,
  );
  await expect(
    page.locator('meta[name="twitter:description"]'),
  ).toHaveAttribute("content", homepageDescription);

  for (const path of ["/favicon.ico", "/favicon.svg"]) {
    await expect(page.locator(`link[rel="icon"][href="${path}"]`)).toHaveCount(
      1,
    );
    const response = await request.get(path);

    expect(response.ok()).toBe(true);
    expect((await response.body()).byteLength).toBeGreaterThan(0);
  }
});

test("the 320px layout keeps profile and contact paths usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/");
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBe(0);
  await expect(
    page.getByRole("link", { name: "GitHub", exact: true }),
  ).toBeInViewport();
  await expect(
    page.getByRole("link", { name: "LinkedIn", exact: true }),
  ).toBeInViewport();
  await expect(page.locator("[itemprop='email']")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Copy email address" }),
  ).toBeVisible();
});

test("the homepage exposes a complete keyboard path", async ({
  browserName,
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Copy email address" }),
  ).toBeVisible();
  const focusOrder = [
    page.getByRole("link", { name: "GitHub", exact: true }),
    page.getByRole("link", { name: "LinkedIn", exact: true }),
    page.getByRole("link", { name: "Insource Data", exact: true }),
    page.getByRole("link", { name: "NysaClan", exact: true }),
    page.getByRole("button", { name: "Copy email address" }),
    page.getByRole("link", { name: "Write in Gmail" }),
    page.getByRole("link", { name: "Open email app" }),
  ];
  await expect(page.locator("main a, main button:not([hidden])")).toHaveCount(
    focusOrder.length,
  );
  for (const control of focusOrder) {
    await pressTab(page, browserName);
    await expect(control).toBeFocused();
  }
});

test("reduced motion removes link and control animations", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const reducedMotion = await page.locator("a, button").evaluateAll((links) =>
    links.map((link) => ({
      animationName: getComputedStyle(link).animationName,
      transitionDuration: getComputedStyle(link).transitionDuration,
    })),
  );

  expect(
    new Set(reducedMotion.map(({ animationName }) => animationName)),
  ).toEqual(new Set(["none"]));
  expect(
    new Set(reducedMotion.map(({ transitionDuration }) => transitionDuration)),
  ).toEqual(new Set(["0s"]));
});

test("forced colors preserve link and keyboard-focus visibility", async ({
  browserName,
  page,
}) => {
  test.skip(
    browserName !== "chromium",
    "Forced-colors emulation is Chromium-only.",
  );

  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/");
  await page.keyboard.press("Tab");

  const firstLink = page.getByRole("link", { name: "GitHub", exact: true });
  const contactLink = page.getByRole("link", { name: "Open email app" });
  await expect(firstLink).toBeFocused();
  await expect(firstLink).toHaveCSS("outline-style", "solid");
  expect(
    await firstLink.evaluate((link) =>
      Number.parseFloat(getComputedStyle(link).outlineWidth),
    ),
  ).toBeGreaterThan(0);

  const bodyColor = await page.evaluate(
    () => getComputedStyle(document.body).color,
  );
  await expect(contactLink).not.toHaveCSS("color", bodyColor);
});

test("the contact links expose their real destinations", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("link", { name: "Open email app" }),
  ).toHaveAttribute("href", "mailto:ahammednibras737@gmail.com");
  await expect(page.getByRole("link", { name: "GitHub" })).toHaveAttribute(
    "href",
    "https://github.com/ahammednibras8",
  );
  await expect(page.getByRole("link", { name: "LinkedIn" })).toHaveAttribute(
    "href",
    "https://linkedin.com/in/ahammednibras8",
  );
});
