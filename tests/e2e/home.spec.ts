import { expect, test } from "@playwright/test";

test("the homepage explains the work in document order", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Ahammed Nibras — Software engineer");
  await expect(
    page.getByRole("heading", { level: 1, name: "Hi, I’m Nibras." }),
  ).toBeVisible();

  await expect(page.locator("main > section > h2")).toHaveText([
    "What that looks like",
    "Selected work",
    "How I work",
    "What I’m working on now",
    "About me",
    "Contact",
  ]);

  await expect(
    page.getByRole("heading", { level: 3, name: "Cascade" }),
  ).toBeVisible();
  await expect(
    page.getByText("Most of my professional work is private."),
  ).toBeVisible();
  await expect(
    page.getByText("AI is a major part of my daily development process."),
  ).toBeVisible();
});

test("the primary navigation points to real homepage sections", async ({
  page,
}) => {
  await page.goto("/");

  const navigation = page.getByRole("navigation", { name: "Primary" });
  const links = navigation.getByRole("link");

  await expect(links).toHaveCount(5);
  expect(
    await links.evaluateAll((items) =>
      items.map((item) => item.getAttribute("href")),
    ),
  ).toEqual(["#work", "#approach", "#now", "#about", "#contact"]);

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

  expect(linkBounds).toHaveLength(5);
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

test("the evidence and contact links expose their real destinations", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("link", { name: "Read the architecture" }),
  ).toHaveAttribute(
    "href",
    "https://github.com/ahammednibras8/cascade/blob/main/docs/concepts/architecture.mdx",
  );
  await expect(
    page.getByRole("link", { name: "See the real SDK-to-worker test path" }),
  ).toHaveAttribute(
    "href",
    "https://github.com/ahammednibras8/cascade/pull/59",
  );
  await expect(
    page.getByRole("link", { name: "ahammednibras737@gmail.com" }),
  ).toHaveAttribute("href", "mailto:ahammednibras737@gmail.com");
});

test("the complete homepage remains available without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto("http://127.0.0.1:4321/");

  await expect(
    page.getByRole("heading", { level: 1, name: "Hi, I’m Nibras." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 3, name: "Cascade" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Contact" }),
  ).toBeVisible();
  await expect(page.locator("script")).toHaveCount(0);

  await context.close();
});
