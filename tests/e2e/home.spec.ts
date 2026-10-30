import { expect, test } from "@playwright/test";

const homepageTitle = "Ahammed Nibras — Software engineer";
const homepageDescription =
  "Ahammed Nibras is a software engineer who builds AI products and the systems that keep them running.";
const homepageSocialImageAlt =
  "The portfolio homepage with the heading “Hi, I’m Nibras.” and the selected Cascade project.";
const productionOrigin = "https://ahammednibras.com";
const navigationRoutes = ["/", "/work/cascade/", "/architecture/", "/contact/"];

test("the homepage is an index of real portfolio routes", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(homepageTitle);
  await expect(
    page.getByRole("heading", { level: 1, name: "Hi, I’m Nibras." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Follow the work" }),
  ).toBeVisible();

  const routes = page.getByRole("navigation", { name: "Portfolio routes" });
  const links = routes.getByRole("link");

  await expect(links).toHaveCount(3);
  expect(
    await links.evaluateAll((items) =>
      items.map((item) => item.getAttribute("href")),
    ),
  ).toEqual(navigationRoutes.slice(1));
  await expect(
    routes.getByRole("heading", { level: 3, name: "Cascade" }),
  ).toBeVisible();
  await expect(
    routes.getByRole("heading", { level: 3, name: "How this site runs" }),
  ).toBeVisible();
  await expect(
    routes.getByRole("heading", { level: 3, name: "Start a conversation" }),
  ).toBeVisible();

  await expect(page.getByRole("article")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Run lifecycle" }),
  ).toHaveCount(0);
  await expect(page.locator("footer")).toContainText(
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
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    "content",
    "#f3f1ed",
  );

  const canonicalLink = page.locator('link[rel="canonical"]');
  const canonicalHref = await canonicalLink.getAttribute("href");

  if (!canonicalHref) {
    throw new Error("Expected the homepage to publish a canonical URL.");
  }

  const canonical = new URL(canonicalHref);
  expect(canonical.href).toBe(`${productionOrigin}/`);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    "content",
    canonical.href,
  );
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

  const socialImageContent = await page
    .locator('meta[property="og:image"]')
    .getAttribute("content");

  if (!socialImageContent) {
    throw new Error("Expected the homepage to publish a social image URL.");
  }

  const socialImage = new URL(socialImageContent);

  expect(socialImage.origin).toBe(productionOrigin);
  expect(socialImage.pathname).toBe("/social/home.png");
  await expect(page.locator('meta[property="og:image:type"]')).toHaveAttribute(
    "content",
    "image/png",
  );
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute(
    "content",
    "1200",
  );
  await expect(
    page.locator('meta[property="og:image:height"]'),
  ).toHaveAttribute("content", "630");
  await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute(
    "content",
    homepageSocialImageAlt,
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary_large_image",
  );
  await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute(
    "content",
    homepageTitle,
  );
  await expect(
    page.locator('meta[name="twitter:description"]'),
  ).toHaveAttribute("content", homepageDescription);
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
    "content",
    socialImage.href,
  );
  await expect(page.locator('meta[name="twitter:image:alt"]')).toHaveAttribute(
    "content",
    homepageSocialImageAlt,
  );

  const socialImageResponse = await request.get("/social/home.png");
  expect(socialImageResponse.ok()).toBe(true);

  const socialImageBody = await socialImageResponse.body();
  expect(socialImageBody.readUInt32BE(16)).toBe(1200);
  expect(socialImageBody.readUInt32BE(20)).toBe(630);

  const icons = page.locator('link[rel="icon"]');
  await expect(icons).toHaveCount(2);
  expect(
    await icons.evaluateAll((items) =>
      items.map((item) => ({
        href: item.getAttribute("href"),
        sizes: item.getAttribute("sizes"),
        type: item.getAttribute("type"),
      })),
    ),
  ).toEqual([
    {
      href: "/favicon.ico",
      sizes: "16x16 32x32 64x64",
      type: "image/x-icon",
    },
    {
      href: "/favicon.svg",
      sizes: "any",
      type: "image/svg+xml",
    },
  ]);

  for (const path of ["/favicon.ico", "/favicon.svg"]) {
    const response = await request.get(path);

    expect(response.ok()).toBe(true);
    expect((await response.body()).byteLength).toBeGreaterThan(0);
  }
});

test("the shared navigation points to real routes and marks the current page", async ({
  page,
}) => {
  for (const route of navigationRoutes) {
    await page.goto(route);

    const navigation = page.getByRole("navigation", { name: "Primary" });
    const links = navigation.getByRole("link");

    await expect(links).toHaveCount(4);
    expect(
      await links.evaluateAll((items) =>
        items.map((item) => item.getAttribute("href")),
      ),
    ).toEqual(navigationRoutes);

    const current = navigation.locator('[aria-current="page"]');
    await expect(current).toHaveCount(1);
    await expect(current).toHaveAttribute("href", route);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `${productionOrigin}${route}`,
    );
  }
});

test("the 320px index keeps navigation and route choices usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/");

  const layout = await page.evaluate(() => {
    const bounds = (selector: string) =>
      [...document.querySelectorAll<HTMLElement>(selector)].map((element) => {
        const rectangle = element.getBoundingClientRect();

        return {
          top: Math.round(rectangle.top),
          left: Math.round(rectangle.left),
          right: Math.round(rectangle.right),
          height: Math.round(rectangle.height),
        };
      });

    return {
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      navigation: bounds(".primary-navigation a"),
      routes: bounds(".route-link"),
    };
  });

  expect(layout.scrollWidth).toBe(layout.clientWidth);
  expect(layout.navigation).toHaveLength(4);
  expect(new Set(layout.navigation.map(({ top }) => top)).size).toBe(1);
  expect(layout.routes).toHaveLength(3);

  for (const item of [...layout.navigation, ...layout.routes]) {
    expect(item.left).toBeGreaterThanOrEqual(0);
    expect(item.right).toBeLessThanOrEqual(layout.clientWidth);
  }

  for (const item of layout.navigation) {
    expect(item.height).toBeGreaterThanOrEqual(44);
  }

  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();

  for (let index = 0; index < 5; index += 1) {
    await page.keyboard.press("Tab");
  }

  await expect(
    page
      .getByRole("navigation", { name: "Portfolio routes" })
      .getByRole("link", { name: /Cascade/ }),
  ).toBeFocused();
});

test("the desktop index hangs the routes as a gallery wall to scroll through", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const layout = await page.evaluate(() => {
    const links = [...document.querySelectorAll<HTMLElement>(".route-link")];

    if (links.length !== 3) {
      throw new Error("Expected the homepage route index.");
    }

    return {
      viewportHeight: window.innerHeight,
      documentHeight: document.documentElement.scrollHeight,
      links: links.map((link) => {
        const bounds = link.getBoundingClientRect();
        const title = link.querySelector("h3");
        const placard = link.querySelector(".route-placard");

        if (!title || !placard) {
          throw new Error("Expected every plate to have a title and placard.");
        }

        return {
          top: Math.round(bounds.top),
          width: Math.round(bounds.width),
          height: Math.round(bounds.height),
          background: getComputedStyle(link).backgroundColor,
          border: getComputedStyle(link).borderBlockStartWidth,
          titleAbovePlacard:
            title.getBoundingClientRect().bottom <=
            placard.getBoundingClientRect().top,
        };
      }),
    };
  });

  const [first, second, third] = layout.links;

  if (!first || !second || !third) {
    throw new Error("Expected three gallery plates.");
  }

  expect(layout.documentHeight).toBeGreaterThan(layout.viewportHeight * 2);
  expect(second.top).toBeGreaterThan(first.top + first.height - 1);
  expect(third.top).toBe(second.top);
  expect(first.width).toBeGreaterThan(second.width);
  expect(second.width).toBeGreaterThan(third.width);
  expect(third.height).toBe(second.height);

  for (const plate of layout.links) {
    expect(plate.height).toBeGreaterThanOrEqual(540);
    expect(plate.background).toBe("rgb(255, 255, 255)");
    expect(plate.border).toBe("4px");
    expect(plate.titleAbovePlacard).toBe(true);
  }
});

test("the index preserves the typography, color, spacing, and depth contracts", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);

  const presentation = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const body = getComputedStyle(document.body);
    const introduction = document.querySelector<HTMLElement>(".introduction");
    const route = document.querySelector<HTMLElement>(".route-link");
    const label = document.querySelector<HTMLElement>(".route-label");

    if (!introduction || !route || !label) {
      throw new Error("Expected homepage presentation targets.");
    }

    return {
      tokens: {
        interface: root.getPropertyValue("--space-interface").trim(),
        component: root.getPropertyValue("--space-component").trim(),
        editorial: root.getPropertyValue("--space-editorial").trim(),
        section: root.getPropertyValue("--space-section").trim(),
        action: root.getPropertyValue("--color-action").trim(),
        focus: root.getPropertyValue("--color-focus").trim(),
      },
      bodyUsesReadingFont: body.fontFamily.includes("IBM Plex Sans"),
      bodySize: body.fontSize,
      bodyBackground: body.backgroundColor,
      introductionBackground: getComputedStyle(introduction).backgroundColor,
      introductionBorder: getComputedStyle(introduction).borderBlockStartWidth,
      routePadding: getComputedStyle(route).paddingBlockStart,
      routeShadow: getComputedStyle(route).boxShadow,
      labelUsesTechnicalFont:
        getComputedStyle(label).fontFamily.includes("IBM Plex Mono"),
      labelColor: getComputedStyle(label).color,
    };
  });

  expect(presentation).toEqual({
    tokens: {
      interface: ".5rem",
      component: "1rem",
      editorial: "1.5rem",
      section: "3rem",
      action: "#a11f35",
      focus: "#007a73",
    },
    bodyUsesReadingFont: true,
    bodySize: "16px",
    bodyBackground: "rgb(243, 241, 237)",
    introductionBackground: "rgba(0, 0, 0, 0)",
    introductionBorder: "0px",
    routePadding: "48px",
    routeShadow: "none",
    labelUsesTechnicalFont: true,
    labelColor: "rgb(161, 31, 53)",
  });
});

test("route links preserve pointer, keyboard, reduced-motion, and forced-color states", async ({
  browserName,
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");

  const route = page
    .getByRole("navigation", { name: "Portfolio routes" })
    .getByRole("link", { name: /Cascade/ });

  await route.hover();
  await expect(route.getByRole("heading", { name: "Cascade" })).toHaveCSS(
    "text-decoration-line",
    "underline",
  );

  await route.focus();
  await expect(route).toHaveCSS("outline-style", "solid");
  await expect(route).toHaveCSS("outline-color", "rgb(0, 122, 115)");

  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page
      .locator("a")
      .evaluateAll((links) =>
        links.every(
          (link) =>
            getComputedStyle(link).transitionDuration === "0s" &&
            getComputedStyle(link).animationName === "none",
        ),
      ),
  ).toBe(true);

  test.skip(
    browserName !== "chromium",
    "Forced-colors emulation is Chromium-only.",
  );
  await page.emulateMedia({ forcedColors: "active" });
  await expect(page.locator(".route-label").first()).not.toHaveCSS(
    "color",
    await page.locator("body").evaluate((body) => getComputedStyle(body).color),
  );
});

test("Cascade keeps the complete case study and public evidence", async ({
  page,
}) => {
  await page.goto("/work/cascade/");

  await expect(page).toHaveTitle("Cascade — Ahammed Nibras");
  await expect(
    page.getByRole("heading", { level: 1, name: "Cascade" }),
  ).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(
    page.getByRole("list", { name: "Cascade task run lifecycle" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Read the source documentation" }),
  ).toHaveAttribute(
    "href",
    "https://github.com/ahammednibras8/cascade/blob/main/docs/concepts/architecture.mdx",
  );
  await expect(page.locator(".signature-band")).toHaveCount(2);
});

test("Cascade gives its case study and lifecycle room on desktop", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/work/cascade/");

  const layout = await page.evaluate(() => {
    const steps = [...document.querySelectorAll(".run-path li")];
    const widest = (selector: string) =>
      Math.max(
        ...[...document.querySelectorAll(selector)].map(
          (element) => element.getBoundingClientRect().width,
        ),
      );

    return {
      stepWidths: steps.map((step) => step.getBoundingClientRect().width),
      stepNames: steps.map(
        (step) => step.querySelector("strong")?.getClientRects().length,
      ),
      article: widest("article"),
    };
  });

  expect(layout.article).toBeGreaterThan(900);
  expect(layout.stepWidths).toHaveLength(5);
  expect(layout.stepWidths.every((width) => width >= 150)).toBe(true);
  await expect(page.locator(".run-path figcaption")).toContainText(
    "runtime path. Read the source documentation",
  );
});

test("the infrastructure and contact routes expose their real content", async ({
  page,
}) => {
  await page.goto("/architecture/");
  const buildPath = page.getByRole("list", {
    name: "Build path",
  });
  await expect(buildPath.getByRole("listitem")).toHaveCount(3);
  await expect(buildPath.getByRole("listitem")).toContainText([
    "Protected main",
    "Verify and build",
    "portfolio-dist-<SHA>",
  ]);
  await expect(buildPath.locator(".architecture-relation")).toHaveText([
    "starts",
    "uploads once",
  ]);

  const feedbackPath = page.getByRole("list", {
    name: "Feedback and approval path",
  });
  await expect(feedbackPath.getByRole("listitem")).toContainText([
    "Feedback deploy",
    "Preview verified",
    "Production approval",
  ]);
  await expect(feedbackPath.locator(".architecture-relation")).toHaveText([
    "checks both URLs",
    "allows review",
  ]);

  const productionPath = page.getByRole("list", {
    name: "Production deployment path",
  });
  await expect(productionPath.getByRole("listitem")).toContainText([
    "Production deploy",
    "ahammednibras.com",
  ]);
  await expect(
    page.getByText("Production approval unlocks this job."),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Cloudflare rollback reference" }),
  ).toHaveAttribute(
    "href",
    "https://developers.cloudflare.com/pages/configuration/rollbacks/",
  );
  await expect(
    page.getByText("This diagram describes the system; it is not live"),
  ).toBeVisible();
  await expect(page.locator(".architecture-node-link").first()).toHaveCSS(
    "animation-name",
    "none",
  );

  await page.goto("/contact/");
  await expect(
    page.getByRole("link", { name: "ahammednibras737@gmail.com" }),
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

test("the complete route system works without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  for (const route of navigationRoutes) {
    await page.goto(route);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("script")).toHaveCount(0);
    await expect(
      page.getByRole("navigation", { name: "Primary" }),
    ).toBeVisible();
  }

  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Portfolio routes" })
    .getByRole("link", { name: /Cascade/ })
    .click();
  await expect(page).toHaveURL(/\/work\/cascade\/$/);

  await context.close();
});
