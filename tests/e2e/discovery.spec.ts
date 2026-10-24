import { expect, test } from "@playwright/test";

const origin = "https://ahammednibras.com";
const expectedPerson = {
  type: "https://schema.org/Person",
  id: `${origin}/#person`,
  properties: {
    url: [`${origin}/`],
    name: ["Ahammed Nibras"],
    jobTitle: ["Software engineer"],
    homeLocation: [
      {
        type: "https://schema.org/Place",
        id: null,
        properties: { name: ["Kozhikode, Kerala, India"] },
      },
    ],
    alternateName: ["ahammednibras8"],
    email: ["mailto:ahammednibras737@gmail.com"],
    sameAs: [
      "https://github.com/ahammednibras8",
      "https://linkedin.com/in/ahammednibras8",
    ],
  },
};

for (const path of ["/", "/about/"]) {
  test(`${path} exposes the same factual identity without scripts`, async ({
    page,
  }) => {
    await page.goto(path);

    // Read each item's own properties, stopping at nested scopes. This catches
    // a location name leaking into Person.name or Person fields into WebSite.
    const items = await page.evaluate(() => {
      interface Item {
        type: string | null;
        id: string | null;
        properties: Record<string, (string | Item)[]>;
      }

      const readItem = (root: Element): Item => {
        const properties: Item["properties"] = {};

        for (const element of root.querySelectorAll("[itemprop]")) {
          if (element.parentElement?.closest("[itemscope]") !== root) {
            continue;
          }

          const value = element.hasAttribute("itemscope")
            ? readItem(element)
            : (element.getAttribute("content") ??
              element.getAttribute("href") ??
              element.textContent?.trim().replace(/\s+/g, " ") ??
              "");

          for (const name of element.getAttribute("itemprop")?.split(/\s+/) ??
            []) {
            (properties[name] ??= []).push(value);
          }
        }

        return {
          type: root.getAttribute("itemtype"),
          id: root.getAttribute("itemid"),
          properties,
        };
      };

      return [...document.querySelectorAll("[itemscope]")]
        .filter((element) => !element.parentElement?.closest("[itemscope]"))
        .map(readItem);
    });

    if (path === "/") {
      expect(items).toEqual([
        {
          type: "https://schema.org/WebSite",
          id: `${origin}/#website`,
          properties: { name: ["Ahammed Nibras"], url: [`${origin}/`] },
        },
        expectedPerson,
      ]);
    } else {
      expect(items).toEqual([
        {
          type: "https://schema.org/ProfilePage",
          id: `${origin}/about/#webpage`,
          properties: {
            url: [`${origin}/about/`],
            mainEntity: [expectedPerson],
          },
        },
      ]);
    }

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `${origin}${path}`,
    );
    await expect(page.locator("main [itemprop='name']").first()).toBeVisible();
    await expect(page.locator("[itemprop='alternateName']")).toBeVisible();
    await expect(page.locator("script")).toHaveCount(0);
  });
}

test("the About route and case-study path work at 320px without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 320, height: 800 },
  });
  const page = await context.newPage();
  await page.goto("/");

  await page
    .getByRole("navigation", { name: "Primary" })
    .getByRole("link", { name: "About", exact: true })
    .click();
  await expect(page).toHaveURL(/\/about\/$/);
  await expect(page).toHaveTitle("About Ahammed Nibras — Software engineer");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "About Ahammed Nibras",
  );
  await expect(
    page.getByRole("link", { name: "About", exact: true }),
  ).toHaveAttribute("aria-current", "page");

  const viewport = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(viewport.scrollWidth).toBe(viewport.width);

  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();

  await page.getByRole("link", { name: "Read the Cascade case study" }).click();
  await expect(page).toHaveURL(/\/#work$/);
  await expect(
    page.getByRole("heading", { name: "Cascade", exact: true }),
  ).toBeVisible();
  await context.close();
});

test("not-found responses do not describe an identity or canonical page", async ({
  page,
}) => {
  const response = await page.goto("/route-that-does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.locator("[itemscope]")).toHaveCount(0);
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
});
