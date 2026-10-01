import { expect, test } from "@playwright/test";

const homepageTitle = "Ahammed Nibras — Software engineer";
const homepageDescription =
  "Ahammed Nibras is a software engineer who builds AI products and the systems that keep them running.";
const homepageSocialImageAlt =
  "The portfolio homepage with the heading “Hi, I’m Nibras.” and the selected Cascade project.";
const productionOrigin = "https://ahammednibras.com";

test("the homepage explains the work in document order", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(homepageTitle);
  await expect(
    page.getByRole("heading", { level: 1, name: "Hi, I’m Nibras." }),
  ).toBeVisible();

  await expect(page.locator("main > section > h2")).toHaveText([
    "Selected work",
    "Contact",
  ]);

  await expect(
    page.getByRole("heading", { level: 3, name: "Cascade" }),
  ).toBeVisible();
  await expect(page.locator("article > header")).toContainText(
    "Cascade runs background tasks and keeps a durable record of each run. I started the project and maintain it.",
  );
  await expect(
    page.getByRole("heading", { level: 4, name: "My role" }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Most of my work for employers cannot be shown publicly."),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 4, name: "Run lifecycle" }),
  ).toBeVisible();
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
  await expect(canonicalLink).toHaveCount(1);

  const canonicalHref = await canonicalLink.getAttribute("href");
  if (!canonicalHref) {
    throw new Error("Expected the homepage to publish a canonical URL.");
  }

  const canonical = new URL(canonicalHref);
  expect(canonical.protocol).toBe("https:");
  expect(canonical.origin).toBe(productionOrigin);
  expect(canonical.pathname).toBe("/");
  expect(canonical.search).toBe("");
  expect(canonical.hash).toBe("");

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
    canonical.href,
  );

  const socialImageContent = await page
    .locator('meta[property="og:image"]')
    .getAttribute("content");
  if (!socialImageContent) {
    throw new Error("Expected the homepage to publish a social image URL.");
  }

  const socialImageUrl = new URL(socialImageContent);
  expect(socialImageUrl.protocol).toBe("https:");
  expect(socialImageUrl.pathname).toBe("/social/home.png");
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
    socialImageUrl.href,
  );
  await expect(page.locator('meta[name="twitter:image:alt"]')).toHaveAttribute(
    "content",
    homepageSocialImageAlt,
  );

  const socialImageResponse = await request.get("/social/home.png");
  expect(socialImageResponse.ok()).toBe(true);
  expect(socialImageResponse.headers()["content-type"]).toContain("image/png");

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

test("the primary navigation points to real homepage sections", async ({
  page,
}) => {
  await page.goto("/");

  const navigation = page.getByRole("navigation", { name: "Primary" });
  const links = navigation.getByRole("link");

  await expect(links).toHaveCount(3);
  expect(
    await links.evaluateAll((items) =>
      items.map((item) => item.getAttribute("href")),
    ),
  ).toEqual(["#work", "#evidence", "#contact"]);

  await navigation.getByRole("link", { name: "Work", exact: true }).click();
  await expect(page).toHaveURL(/#work$/);
  await expect(page.locator("#work")).toBeVisible();
});

test("the 320px layout keeps navigation and recovery paths usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/");

  const viewport = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(viewport.scrollWidth).toBe(viewport.clientWidth);

  const navigationLinks = page
    .getByRole("navigation", { name: "Primary" })
    .getByRole("link");
  const linkBounds = await navigationLinks.evaluateAll((links) =>
    links.map((link) => {
      const bounds = link.getBoundingClientRect();

      return {
        top: Math.round(bounds.top),
        left: bounds.left,
        right: bounds.right,
      };
    }),
  );

  expect(linkBounds).toHaveLength(3);
  expect(new Set(linkBounds.map(({ top }) => top)).size).toBe(1);

  for (const bounds of linkBounds) {
    expect(bounds.left).toBeGreaterThanOrEqual(0);
    expect(bounds.right).toBeLessThanOrEqual(viewport.clientWidth);
  }

  await page.keyboard.press("Tab");

  const skipLink = page.getByRole("link", { name: "Skip to content" });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeInViewport();

  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();

  const contact = page.locator("#contact");
  await contact.scrollIntoViewIfNeeded();
  await expect(contact).toBeInViewport();
  await expect(contact.getByRole("link", { name: "GitHub" })).toBeVisible();
  await expect(contact.getByRole("link", { name: "LinkedIn" })).toBeVisible();
  await expect(
    contact.getByRole("link", { name: "ahammednibras737@gmail.com" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to top" })).toBeVisible();
});

test("the vertical slice exposes one artifact and a complete keyboard path", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/");

  await expect(page.getByRole("article")).toHaveCount(1);

  const lifecycle = page.getByRole("list", {
    name: "Cascade task run lifecycle",
  });
  await expect(lifecycle.getByRole("listitem")).toHaveCount(5);
  await expect(lifecycle.locator("strong")).toHaveText([
    "TypeScript SDK",
    "API + PostgreSQL",
    "Redis",
    "Worker",
    "Dashboard",
  ]);
  await expect(lifecycle).toHaveCSS("grid-template-columns", /\d+(\.\d+)?px/);

  const focusOrder = [
    page.getByRole("link", { name: "Skip to content" }),
    page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Work", exact: true }),
    page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Evidence", exact: true }),
    page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Contact", exact: true }),
    page.getByRole("link", { name: "Read the source documentation" }),
    page.getByRole("link", { name: "ahammednibras737@gmail.com" }),
    page.getByRole("link", { name: "GitHub" }),
    page.getByRole("link", { name: "LinkedIn" }),
    page.getByRole("link", { name: "Back to top" }),
  ];

  for (const link of focusOrder) {
    await page.keyboard.press("Tab");
    await expect(link).toBeFocused();
  }

  await page.setViewportSize({ width: 1152, height: 900 });
  expect(
    await lifecycle.evaluate(
      (list) => getComputedStyle(list).gridTemplateColumns.split(" ").length,
    ),
  ).toBe(5);

  const backToTop = page.getByRole("link", { name: "Back to top" });
  await backToTop.click();
  await expect(page).toHaveURL(/#main-content$/);
  await expect(page.locator("#main-content")).toBeFocused();
});

test("the responsive grid keeps a deliberate rule hierarchy", async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto("/");

  const mediumLayout = await page.evaluate(() => {
    const pageSection = document.querySelector<HTMLElement>(".page > section");
    const article = document.querySelector<HTMLElement>("article");
    const evidence = document.querySelector<HTMLElement>(".project-evidence");

    if (!pageSection || !article || !evidence) {
      throw new Error("Expected homepage grid elements were not found.");
    }

    const pageBounds = pageSection.getBoundingClientRect();
    const articleBounds = article.getBoundingClientRect();
    const evidenceBounds = evidence.getBoundingClientRect();

    return {
      pageColumns:
        getComputedStyle(pageSection).gridTemplateColumns.split(" ").length,
      articleColumns:
        getComputedStyle(article).gridTemplateColumns.split(" ").length,
      pageBounds: {
        left: Math.round(pageBounds.left),
        right: Math.round(pageBounds.right),
      },
      articleBounds: {
        left: Math.round(articleBounds.left),
        right: Math.round(articleBounds.right),
      },
      evidenceBounds: {
        left: Math.round(evidenceBounds.left),
        right: Math.round(evidenceBounds.right),
      },
    };
  });

  expect(mediumLayout.pageColumns).toBe(6);
  expect(mediumLayout.articleColumns).toBe(6);
  expect(mediumLayout.evidenceBounds).toEqual(mediumLayout.pageBounds);
  expect(mediumLayout.articleBounds.left).toBeGreaterThan(
    mediumLayout.pageBounds.left,
  );
  expect(mediumLayout.articleBounds.right).toBeLessThan(
    mediumLayout.pageBounds.right,
  );

  await page.setViewportSize({ width: 1152, height: 900 });

  const largeLayout = await page.evaluate(() => {
    const pageSection = document.querySelector<HTMLElement>(".page > section");
    const article = document.querySelector<HTMLElement>("article");
    const evidence = document.querySelector<HTMLElement>(".project-evidence");
    const internalSections = [
      ...document.querySelectorAll<HTMLElement>(
        "article > section:not(.project-evidence)",
      ),
    ];
    const firstInternalSection = internalSections[0];
    const sectionHeadings = [
      ...document.querySelectorAll<HTMLElement>(
        ".page > section:not(.introduction) > h2",
      ),
    ];
    const firstSectionHeading = sectionHeadings[0];
    const navigationList = document.querySelector<HTMLElement>(
      ".primary-navigation ul",
    );

    if (
      !pageSection ||
      !article ||
      !evidence ||
      !firstInternalSection ||
      !firstSectionHeading ||
      !navigationList
    ) {
      throw new Error("Expected homepage grid elements were not found.");
    }

    const pageBounds = pageSection.getBoundingClientRect();
    const articleBounds = article.getBoundingClientRect();
    const evidenceBounds = evidence.getBoundingClientRect();
    const internalBounds = internalSections.map((section) => {
      const bounds = section.getBoundingClientRect();

      return {
        left: Math.round(bounds.left),
        right: Math.round(bounds.right),
      };
    });
    const headingLeftEdges = sectionHeadings.map((heading) =>
      Math.round(heading.getBoundingClientRect().left),
    );

    return {
      pageColumns:
        getComputedStyle(pageSection).gridTemplateColumns.split(" ").length,
      articleColumns:
        getComputedStyle(article).gridTemplateColumns.split(" ").length,
      internalColumns:
        getComputedStyle(firstInternalSection).gridTemplateColumns.split(" ")
          .length,
      pageBounds: {
        left: Math.round(pageBounds.left),
        right: Math.round(pageBounds.right),
      },
      articleBounds: {
        left: Math.round(articleBounds.left),
        right: Math.round(articleBounds.right),
      },
      evidenceBounds: {
        left: Math.round(evidenceBounds.left),
        right: Math.round(evidenceBounds.right),
      },
      internalBounds,
      headingLeftEdges,
      headingAnchor: firstSectionHeading.getBoundingClientRect().left,
      navigationLeft: Math.round(navigationList.getBoundingClientRect().left),
    };
  });

  expect(largeLayout.pageColumns).toBe(12);
  expect(largeLayout.articleColumns).toBe(12);
  expect(largeLayout.internalColumns).toBe(9);
  expect(largeLayout.evidenceBounds).toEqual(largeLayout.pageBounds);
  expect(new Set(largeLayout.headingLeftEdges).size).toBe(1);
  expect(
    Math.abs(largeLayout.navigationLeft - largeLayout.headingAnchor),
  ).toBeLessThanOrEqual(1);

  for (const bounds of largeLayout.internalBounds) {
    expect(bounds).toEqual(largeLayout.internalBounds[0]);
    expect(bounds.left).toBeGreaterThan(largeLayout.articleBounds.left);
    expect(bounds.right).toBeLessThan(largeLayout.articleBounds.right);
  }
});

test("the page uses the named interface and editorial spacing rhythm", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/");

  const spacing = await page.evaluate(() => {
    const rootStyles = getComputedStyle(document.documentElement);
    const tokenValue = (name: string) =>
      Number.parseFloat(rootStyles.getPropertyValue(name));
    const introduction = document.querySelector<HTMLElement>(".introduction");
    const introductionCopy = introduction?.querySelector<HTMLElement>("p");
    const article = document.querySelector<HTMLElement>("article");
    const articleSummary = article?.querySelector<HTMLElement>("header p");
    const articleList = article?.querySelector<HTMLElement>("ul");
    const articleSection = article?.querySelector<HTMLElement>("section");

    if (
      !introduction ||
      !introductionCopy ||
      !article ||
      !articleSummary ||
      !articleList ||
      !articleSection
    ) {
      throw new Error("Expected homepage spacing targets were not found.");
    }

    return {
      tokens: {
        interface: tokenValue("--space-interface"),
        component: tokenValue("--space-component"),
        editorial: tokenValue("--space-editorial"),
        section: tokenValue("--space-section"),
      },
      introductionPadding: getComputedStyle(introduction).paddingBlockStart,
      introductionCopyMargin:
        getComputedStyle(introductionCopy).marginBlockStart,
      articleMargin: getComputedStyle(article).marginBlockStart,
      articleSummaryMargin: getComputedStyle(articleSummary).marginBlockStart,
      articleListMargin: getComputedStyle(articleList).marginBlockStart,
      articleSectionPadding: getComputedStyle(articleSection).paddingBlockStart,
    };
  });

  expect(spacing).toEqual({
    tokens: {
      interface: 0.5,
      component: 1,
      editorial: 1.5,
      section: 3,
    },
    introductionPadding: "48px",
    introductionCopyMargin: "24px",
    articleMargin: "24px",
    articleSummaryMargin: "8px",
    articleListMargin: "16px",
    articleSectionPadding: "24px",
  });
});

test("typography keeps reading and technical roles distinct", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);

  const typography = await page.evaluate(() => {
    const body = document.body;
    const label = document.querySelector<HTMLElement>("h4");
    const navigationLink = document.querySelector<HTMLElement>(
      ".primary-navigation a",
    );

    if (!label || !navigationLink) {
      throw new Error("Expected homepage typography targets were not found.");
    }

    const fontResources = performance
      .getEntriesByType("resource")
      .map(({ name }) => name)
      .filter((name) => name.endsWith(".woff2"));

    return {
      bodyFamily: getComputedStyle(body).fontFamily,
      bodySize: getComputedStyle(body).fontSize,
      labelFamily: getComputedStyle(label).fontFamily,
      labelWeight: getComputedStyle(label).fontWeight,
      navigationFamily: getComputedStyle(navigationLink).fontFamily,
      fontResources,
      origin: location.origin,
    };
  });

  expect(typography.bodyFamily).toContain("IBM Plex Sans");
  expect(typography.bodySize).toBe("16px");
  expect(typography.labelFamily).toContain("IBM Plex Mono");
  expect(typography.labelWeight).toBe("600");
  expect(typography.navigationFamily).toContain("IBM Plex Sans");
  expect(typography.fontResources).toHaveLength(3);

  for (const resource of typography.fontResources) {
    expect(new URL(resource).origin).toBe(typography.origin);
  }
});

test("the personal color and depth systems keep their roles distinct", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/");

  const colors = await page.evaluate(() => {
    const rootStyles = getComputedStyle(document.documentElement);
    const siteHeader = document.querySelector<HTMLElement>(".site-header");
    const navigationLink = document.querySelector<HTMLElement>(
      ".primary-navigation a",
    );
    const pageFrame = document.querySelector<HTMLElement>(".page");
    const article = document.querySelector<HTMLElement>("article");
    const articleSection = document.querySelector<HTMLElement>(
      "article > section:not(.project-evidence)",
    );
    const evidence = document.querySelector<HTMLElement>(".project-evidence");
    const evidenceLink = evidence?.querySelector<HTMLElement>("a");
    const secondaryText = document.querySelector<HTMLElement>(
      ".run-path li > span:last-child",
    );

    if (
      !navigationLink ||
      !siteHeader ||
      !pageFrame ||
      !article ||
      !articleSection ||
      !evidence ||
      !evidenceLink ||
      !secondaryText
    ) {
      throw new Error("Expected homepage color targets were not found.");
    }

    const alphaFrom = (color: string) => {
      const match = color.match(/\/\s*([\d.]+)\)$/);

      if (!match) {
        throw new Error(`Expected an alpha channel in ${color}.`);
      }

      return Number(match[1]);
    };

    return {
      tokens: {
        canvas: rootStyles.getPropertyValue("--color-canvas").trim(),
        surface: rootStyles.getPropertyValue("--color-surface-raised").trim(),
        primaryInk: rootStyles.getPropertyValue("--color-ink-primary").trim(),
        secondaryInk: rootStyles
          .getPropertyValue("--color-ink-secondary")
          .trim(),
        action: rootStyles.getPropertyValue("--color-action").trim(),
        actionVisited: rootStyles
          .getPropertyValue("--color-action-visited")
          .trim(),
        actionActive: rootStyles
          .getPropertyValue("--color-action-active")
          .trim(),
        focus: rootStyles.getPropertyValue("--color-focus").trim(),
        atmosphereAlpha: rootStyles
          .getPropertyValue("--alpha-atmosphere")
          .trim(),
        gridAlpha: rootStyles.getPropertyValue("--alpha-grid").trim(),
        structureAlpha: rootStyles.getPropertyValue("--alpha-structure").trim(),
        emphasisAlpha: rootStyles.getPropertyValue("--alpha-emphasis").trim(),
      },
      canvas: getComputedStyle(document.body).backgroundColor,
      headerSurface: getComputedStyle(siteHeader).backgroundColor,
      recessedSurfaceAlpha: alphaFrom(
        getComputedStyle(article).backgroundColor,
      ),
      primaryInk: getComputedStyle(document.body).color,
      bodyOpacity: getComputedStyle(document.body).opacity,
      secondaryInk: getComputedStyle(secondaryText).color,
      secondaryOpacity: getComputedStyle(secondaryText).opacity,
      navigationInk: getComputedStyle(navigationLink).color,
      ruleAlphas: {
        grid: alphaFrom(getComputedStyle(pageFrame).borderInlineStartColor),
        structure: alphaFrom(
          getComputedStyle(articleSection).borderBlockStartColor,
        ),
        emphasis: alphaFrom(getComputedStyle(article).borderBlockStartColor),
      },
      evidenceSurface: getComputedStyle(evidence).backgroundColor,
      evidenceRule: getComputedStyle(evidence).borderBlockStartColor,
      action: getComputedStyle(evidenceLink).color,
    };
  });

  expect(colors).toEqual({
    tokens: {
      canvas: "#f3f1ed",
      surface: "#fff",
      primaryInk: "#17191a",
      secondaryInk: "#51565a",
      action: "#a11f35",
      actionVisited: "#6f4350",
      actionActive: "#641426",
      focus: "#007a73",
      atmosphereAlpha: "4%",
      gridAlpha: "8%",
      structureAlpha: "12%",
      emphasisAlpha: "20%",
    },
    canvas: "rgb(243, 241, 237)",
    headerSurface: "rgb(243, 241, 237)",
    recessedSurfaceAlpha: 0.04,
    primaryInk: "rgb(23, 25, 26)",
    bodyOpacity: "1",
    secondaryInk: "rgb(81, 86, 90)",
    secondaryOpacity: "1",
    navigationInk: "rgb(23, 25, 26)",
    ruleAlphas: {
      grid: 0.08,
      structure: 0.12,
      emphasis: 0.2,
    },
    evidenceSurface: "rgb(255, 255, 255)",
    evidenceRule: "rgb(161, 31, 53)",
    action: "rgb(161, 31, 53)",
  });

  const skipLink = page.getByRole("link", { name: "Skip to content" });
  await skipLink.focus();
  await expect(skipLink).toHaveCSS("outline-color", "rgb(0, 122, 115)");
  await expect(skipLink).toHaveCSS("outline-style", "solid");
});

test("links expose deliberate pointer and reduced-motion states", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");

  const evidenceLink = page.getByRole("link", {
    name: "Read the source documentation",
  });
  const navigationLink = page
    .getByRole("navigation", { name: "Primary" })
    .getByRole("link", { name: "Work", exact: true });
  const skipLink = page.getByRole("link", { name: "Skip to content" });

  const motionGrammar = await page.evaluate(() => {
    const rootStyles = getComputedStyle(document.documentElement);

    return {
      short: rootStyles.getPropertyValue("--motion-short").trim(),
      standard: rootStyles.getPropertyValue("--motion-standard").trim(),
      deliberate: rootStyles.getPropertyValue("--motion-deliberate").trim(),
    };
  });

  expect(motionGrammar).toEqual({
    short: ".12s",
    standard: ".18s",
    deliberate: ".22s",
  });
  await expect(evidenceLink).toHaveCSS(
    "transition-property",
    "color, text-decoration-thickness",
  );
  await expect(evidenceLink).toHaveCSS("transition-duration", "0.18s, 0.18s");
  await expect(skipLink).toHaveCSS("transition-property", "transform");
  await expect(skipLink).toHaveCSS("transition-duration", "0.22s");

  await expect(evidenceLink).toHaveCSS("color", "rgb(161, 31, 53)");
  await expect(evidenceLink).toHaveCSS("text-decoration-thickness", "1.28px");

  await evidenceLink.hover();
  await expect(evidenceLink).toHaveCSS("text-decoration-thickness", "2.08px");

  await navigationLink.hover();
  await expect(navigationLink).toHaveCSS("color", "rgb(161, 31, 53)");
  await expect(navigationLink).toHaveCSS("text-decoration-line", "underline");

  await page.mouse.down();
  await expect(navigationLink).toHaveCSS("transition-duration", "0.12s");
  await expect(navigationLink).toHaveCSS("color", "rgb(100, 20, 38)");
  await expect(navigationLink).toHaveCSS("text-decoration-thickness", "1.69px");
  await page.mouse.up();

  await page.emulateMedia({ reducedMotion: "reduce" });

  const reducedMotion = await page.locator("a").evaluateAll((links) =>
    links.map((link) => {
      const styles = getComputedStyle(link);

      return {
        animationName: styles.animationName,
        transitionDuration: styles.transitionDuration,
      };
    }),
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

  const skipLink = page.getByRole("link", { name: "Skip to content" });
  const evidenceLink = page.getByRole("link", {
    name: "Read the source documentation",
  });

  await expect(skipLink).toBeFocused();
  await expect(skipLink).toHaveCSS("outline-style", "solid");
  await expect(skipLink).toHaveCSS("outline-width", "3px");

  const forcedColors = await page.evaluate(() => ({
    active: matchMedia("(forced-colors: active)").matches,
    body: getComputedStyle(document.body).color,
  }));

  expect(forcedColors.active).toBe(true);
  await expect(evidenceLink).not.toHaveCSS("color", forcedColors.body);
});

test("three surfaces and two border widths create depth without shadows", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/");

  const depth = await page.evaluate(() => {
    const rootStyles = getComputedStyle(document.documentElement);
    const tokenValue = (name: string) =>
      Number.parseFloat(rootStyles.getPropertyValue(name));
    const siteHeader = document.querySelector<HTMLElement>(".site-header");
    const pageFrame = document.querySelector<HTMLElement>(".page");
    const article = document.querySelector<HTMLElement>("article");
    const evidence = document.querySelector<HTMLElement>(".project-evidence");

    if (!siteHeader || !pageFrame || !article || !evidence) {
      throw new Error("Expected homepage depth targets were not found.");
    }

    const bodyStyles = getComputedStyle(document.body);
    const headerStyles = getComputedStyle(siteHeader);
    const articleStyles = getComputedStyle(article);
    const evidenceStyles = getComputedStyle(evidence);
    const renderedBorderWidths = new Set<string>();

    for (const element of document.querySelectorAll<HTMLElement>("*")) {
      const styles = getComputedStyle(element);

      for (const border of [
        { style: styles.borderTopStyle, width: styles.borderTopWidth },
        { style: styles.borderRightStyle, width: styles.borderRightWidth },
        { style: styles.borderBottomStyle, width: styles.borderBottomWidth },
        { style: styles.borderLeftStyle, width: styles.borderLeftWidth },
      ]) {
        if (border.style !== "none" && border.width !== "0px") {
          renderedBorderWidths.add(border.width);
        }
      }
    }

    return {
      borderWidths: {
        default: tokenValue("--border-width-default"),
        emphasis: tokenValue("--border-width-emphasis"),
        frame: getComputedStyle(pageFrame).borderInlineStartWidth,
        article: articleStyles.borderBlockStartWidth,
        evidence: evidenceStyles.borderBlockStartWidth,
        rendered: [...renderedBorderWidths].sort(),
      },
      surfaces: new Set([
        bodyStyles.backgroundColor,
        headerStyles.backgroundColor,
        articleStyles.backgroundColor,
        evidenceStyles.backgroundColor,
      ]).size,
      headerPosition: headerStyles.position,
      headerTop: siteHeader.getBoundingClientRect().top,
      shadows: [
        headerStyles.boxShadow,
        articleStyles.boxShadow,
        evidenceStyles.boxShadow,
      ],
    };
  });

  expect(depth).toEqual({
    borderWidths: {
      default: 1,
      emphasis: 0.25,
      frame: "1px",
      article: "4px",
      evidence: "4px",
      rendered: ["1px", "4px"],
    },
    surfaces: 3,
    headerPosition: "sticky",
    headerTop: 0,
    shadows: ["none", "none", "none"],
  });

  await page
    .getByRole("navigation", { name: "Primary" })
    .getByRole("link", { name: "Evidence", exact: true })
    .click();
  await expect(page).toHaveURL(/#evidence$/);

  const anchoredPosition = await page.evaluate(() => {
    const siteHeader = document.querySelector<HTMLElement>(".site-header");
    const target = document.querySelector<HTMLElement>("#evidence");

    if (!siteHeader || !target) {
      throw new Error("Expected sticky navigation targets were not found.");
    }

    return {
      headerBottom: siteHeader.getBoundingClientRect().bottom,
      targetTop: target.getBoundingClientRect().top,
    };
  });

  expect(anchoredPosition.targetTop).toBeGreaterThan(
    anchoredPosition.headerBottom,
  );
});

test("signature bands mark identity, proof, and contact", async ({ page }) => {
  await page.goto("/");

  const bands = page.locator(".signature-band");

  await expect(bands).toHaveCount(3);
  await expect(bands.nth(0)).toHaveClass(/\bintroduction\b/);
  await expect(bands.nth(1)).toHaveClass(/\bproject-evidence\b/);
  await expect(bands.nth(2)).toHaveAttribute("id", "contact");

  const presentation = await bands.evaluateAll((elements) =>
    elements.map((element) => {
      const styles = getComputedStyle(element);

      return {
        background: styles.backgroundColor,
        borderTopColor: styles.borderTopColor,
        borderTopWidth: styles.borderTopWidth,
        borderBottomColor: styles.borderBottomColor,
        borderBottomWidth: styles.borderBottomWidth,
      };
    }),
  );

  expect(new Set(presentation.map(({ background }) => background))).toEqual(
    new Set(["rgb(255, 255, 255)"]),
  );

  for (const band of presentation) {
    expect(band).toEqual({
      background: "rgb(255, 255, 255)",
      borderTopColor: "rgb(161, 31, 53)",
      borderTopWidth: "4px",
      borderBottomColor: "rgb(161, 31, 53)",
      borderBottomWidth: "4px",
    });
  }
});

test("the evidence and contact links expose their real destinations", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("link", { name: "Read the source documentation" }),
  ).toHaveAttribute(
    "href",
    "https://github.com/ahammednibras8/cascade/blob/main/docs/concepts/architecture.mdx",
  );
  await expect(
    page.getByRole("link", { name: "ahammednibras737@gmail.com" }),
  ).toHaveAttribute("href", "mailto:ahammednibras737@gmail.com");
  await expect(page.getByRole("link", { name: "Back to top" })).toHaveAttribute(
    "href",
    "#main-content",
  );
});

test("the complete homepage remains available without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 1, name: "Hi, I’m Nibras." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 3, name: "Cascade" }),
  ).toBeVisible();
  await expect(
    page.getByRole("list", { name: "Cascade task run lifecycle" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Contact" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to top" })).toBeVisible();
  await expect(page.locator("script")).toHaveCount(0);

  await context.close();
});
