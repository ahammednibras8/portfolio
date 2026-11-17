import { expect, test } from "@playwright/test";

const homepageTitle = "Ahammed Nibras — Software engineer";
const homepageDescription =
  "Ahammed Nibras is a software engineer who builds AI products and the systems that keep them running.";
const productionOrigin = "https://ahammednibras.com";

test("the homepage introduces Nibras and contact options in document order", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page).toHaveTitle(homepageTitle);
  await expect(
    page.getByRole("heading", { level: 1, name: "Hi, I’m Ahammed Nibras." }),
  ).toBeVisible();
  await expect(page.locator("main > section > h2")).toHaveText(["Contact"]);
  await expect(page.getByRole("article")).toHaveCount(0);
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
  await expect(page.locator('meta[property="og:image"]')).toHaveCount(0);

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
  await expect(page.locator('meta[name="twitter:image"]')).toHaveCount(0);

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

test("the primary navigation points to real destinations", async ({ page }) => {
  await page.goto("/");

  const navigation = page.getByRole("navigation", { name: "Primary" });
  const links = navigation.getByRole("link");

  await expect(links).toHaveCount(2);
  expect(
    await links.evaluateAll((items) =>
      items.map((item) => item.getAttribute("href")),
    ),
  ).toEqual(["#contact", "/about/"]);

  await navigation.getByRole("link", { name: "Contact", exact: true }).click();
  await expect(page).toHaveURL(/#contact$/);
  await expect(page.locator("#contact")).toBeVisible();
});

test("the 320px layout keeps navigation and contact paths usable", async ({
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

  expect(linkBounds).toHaveLength(2);
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

test("the homepage exposes a complete keyboard path", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/");

  const focusOrder = [
    page.getByRole("link", { name: "Skip to content" }),
    page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Contact", exact: true }),
    page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "About", exact: true }),
    page.getByRole("link", { name: "ahammednibras737@gmail.com" }),
    page.getByRole("link", { name: "GitHub" }),
    page.getByRole("link", { name: "LinkedIn" }),
    page.getByRole("link", { name: "Back to top" }),
  ];

  for (const link of focusOrder) {
    await page.keyboard.press("Tab");
    await expect(link).toBeFocused();
  }

  const backToTop = page.getByRole("link", { name: "Back to top" });
  await backToTop.click();
  await expect(page).toHaveURL(/#main-content$/);
  await expect(page.locator("#main-content")).toBeFocused();
});

test("the responsive grid preserves section and navigation alignment", async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto("/");

  const mediumColumns = await page
    .locator(".page > section")
    .first()
    .evaluate(
      (section) =>
        getComputedStyle(section).gridTemplateColumns.split(" ").length,
    );
  expect(mediumColumns).toBe(6);

  await page.setViewportSize({ width: 1152, height: 900 });

  const layout = await page.evaluate(() => {
    const section = document.querySelector<HTMLElement>(".page > section");
    const sectionHeading = document.querySelector<HTMLElement>(
      ".page > section:not(.introduction) > h2",
    );
    const navigationList = document.querySelector<HTMLElement>(
      ".primary-navigation ul",
    );

    if (!section || !sectionHeading || !navigationList) {
      throw new Error("Expected homepage grid elements were not found.");
    }

    return {
      columns: getComputedStyle(section).gridTemplateColumns.split(" ").length,
      headingLeft: Math.round(sectionHeading.getBoundingClientRect().left),
      navigationLeft: Math.round(navigationList.getBoundingClientRect().left),
    };
  });

  expect(layout.columns).toBe(12);
  expect(
    Math.abs(layout.navigationLeft - layout.headingLeft),
  ).toBeLessThanOrEqual(1);
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
    const contact = document.querySelector<HTMLElement>("#contact");
    const contactCopy = contact?.querySelector<HTMLElement>("p");

    if (!introduction || !introductionCopy || !contact || !contactCopy) {
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
      contactPadding: getComputedStyle(contact).paddingBlockStart,
      contactCopyMargin: getComputedStyle(contactCopy).marginBlockStart,
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
    contactPadding: "48px",
    contactCopyMargin: "24px",
  });
});

test("typography keeps reading and navigation roles consistent", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);

  const typography = await page.evaluate(() => {
    const navigationLink = document.querySelector<HTMLElement>(
      ".primary-navigation a",
    );

    if (!navigationLink) {
      throw new Error("Expected a homepage navigation link.");
    }

    return {
      bodyFamily: getComputedStyle(document.body).fontFamily,
      bodySize: getComputedStyle(document.body).fontSize,
      navigationFamily: getComputedStyle(navigationLink).fontFamily,
      origin: location.origin,
      fontResources: performance
        .getEntriesByType("resource")
        .map(({ name }) => name)
        .filter((name) => name.endsWith(".woff2")),
    };
  });

  expect(typography.bodyFamily).toContain("IBM Plex Sans");
  expect(typography.bodySize).toBe("16px");
  expect(typography.navigationFamily).toContain("IBM Plex Sans");
  expect(typography.fontResources).toHaveLength(2);

  for (const resource of typography.fontResources) {
    expect(new URL(resource).origin).toBe(typography.origin);
  }
});

test("the personal color system keeps content roles distinct", async ({
  page,
}) => {
  await page.goto("/");

  const colors = await page.evaluate(() => {
    const rootStyles = getComputedStyle(document.documentElement);
    const pageFrame = document.querySelector<HTMLElement>(".page");
    const signatureBand = document.querySelector<HTMLElement>(
      ".page > .signature-band",
    );
    const contactLink = document.querySelector<HTMLElement>("#contact a");
    const footerLocation = document.querySelector<HTMLElement>(
      ".site-footer-location",
    );

    if (!pageFrame || !signatureBand || !contactLink || !footerLocation) {
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
        focus: rootStyles.getPropertyValue("--color-focus").trim(),
      },
      canvas: getComputedStyle(document.body).backgroundColor,
      primaryInk: getComputedStyle(document.body).color,
      secondaryInk: getComputedStyle(footerLocation).color,
      action: getComputedStyle(contactLink).color,
      frameAlpha: alphaFrom(getComputedStyle(pageFrame).borderInlineStartColor),
      signatureSurface: getComputedStyle(signatureBand).backgroundColor,
      signatureRule: getComputedStyle(signatureBand).borderBlockStartColor,
    };
  });

  expect(colors).toEqual({
    tokens: {
      canvas: "#f3f1ed",
      surface: "#fff",
      primaryInk: "#17191a",
      secondaryInk: "#51565a",
      action: "#a11f35",
      focus: "#007a73",
    },
    canvas: "rgb(243, 241, 237)",
    primaryInk: "rgb(23, 25, 26)",
    secondaryInk: "rgb(81, 86, 90)",
    action: "rgb(161, 31, 53)",
    frameAlpha: 0.08,
    signatureSurface: "rgb(255, 255, 255)",
    signatureRule: "rgb(161, 31, 53)",
  });
});

test("links expose deliberate pointer and reduced-motion states", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");

  const contactLink = page.getByRole("link", {
    name: "ahammednibras737@gmail.com",
  });
  const navigationLink = page
    .getByRole("navigation", { name: "Primary" })
    .getByRole("link", { name: "Contact", exact: true });
  const skipLink = page.getByRole("link", { name: "Skip to content" });

  await expect(contactLink).toHaveCSS(
    "transition-property",
    "color, text-decoration-thickness",
  );
  await expect(contactLink).toHaveCSS("transition-duration", "0.18s, 0.18s");
  await expect(skipLink).toHaveCSS("transition-property", "transform");
  await expect(skipLink).toHaveCSS("transition-duration", "0.22s");

  await contactLink.hover();
  await expect(contactLink).toHaveCSS("text-decoration-thickness", "2.08px");

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

  const skipLink = page.getByRole("link", { name: "Skip to content" });
  const contactLink = page.getByRole("link", {
    name: "ahammednibras737@gmail.com",
  });

  await expect(skipLink).toBeFocused();
  await expect(skipLink).toHaveCSS("outline-style", "solid");
  await expect(skipLink).toHaveCSS("outline-width", "3px");

  const bodyColor = await page.evaluate(
    () => getComputedStyle(document.body).color,
  );
  await expect(contactLink).not.toHaveCSS("color", bodyColor);
});

test("two surfaces and two border widths create depth without shadows", async ({
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
    const signatureBand = document.querySelector<HTMLElement>(
      ".page > .signature-band",
    );

    if (!siteHeader || !pageFrame || !signatureBand) {
      throw new Error("Expected homepage depth targets were not found.");
    }

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

    const bodyStyles = getComputedStyle(document.body);
    const headerStyles = getComputedStyle(siteHeader);
    const signatureStyles = getComputedStyle(signatureBand);

    return {
      borderWidths: {
        default: tokenValue("--border-width-default"),
        emphasis: tokenValue("--border-width-emphasis"),
        frame: getComputedStyle(pageFrame).borderInlineStartWidth,
        signature: signatureStyles.borderBlockStartWidth,
        rendered: [...renderedBorderWidths].sort(),
      },
      surfaces: new Set([
        bodyStyles.backgroundColor,
        headerStyles.backgroundColor,
        signatureStyles.backgroundColor,
      ]).size,
      headerPosition: headerStyles.position,
      headerTop: siteHeader.getBoundingClientRect().top,
      shadows: [headerStyles.boxShadow, signatureStyles.boxShadow],
    };
  });

  expect(depth).toEqual({
    borderWidths: {
      default: 1,
      emphasis: 0.25,
      frame: "1px",
      signature: "4px",
      rendered: ["1px", "4px"],
    },
    surfaces: 2,
    headerPosition: "sticky",
    headerTop: 0,
    shadows: ["none", "none"],
  });

  await page
    .getByRole("navigation", { name: "Primary" })
    .getByRole("link", { name: "Contact", exact: true })
    .click();
  await expect(page).toHaveURL(/#contact$/);

  const anchoredPosition = await page.evaluate(() => {
    const siteHeader = document.querySelector<HTMLElement>(".site-header");
    const target = document.querySelector<HTMLElement>("#contact");

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

test("signature bands mark identity and contact", async ({ page }) => {
  await page.goto("/");

  const bands = page.locator(".signature-band");

  await expect(bands).toHaveCount(2);
  await expect(bands.nth(0)).toHaveClass(/\bintroduction\b/);
  await expect(bands.nth(1)).toHaveAttribute("id", "contact");

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

test("the contact links expose their real destinations", async ({ page }) => {
  await page.goto("/");

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
    page.getByRole("heading", { level: 1, name: "Hi, I’m Ahammed Nibras." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Contact" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to top" })).toBeVisible();
  await expect(page.locator("script")).toHaveCount(0);

  await context.close();
});
