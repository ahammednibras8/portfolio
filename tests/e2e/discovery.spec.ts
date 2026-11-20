import { expect, test } from "@playwright/test";

const origin = new URL(process.env.SITE_URL ?? "").origin;
const expectedPerson = {
  type: "https://schema.org/Person",
  id: `${origin}/#person`,
  properties: {
    url: [`${origin}/`],
    name: ["Ahammed Nibras"],
    jobTitle: ["Software developer"],
    homeLocation: [
      {
        type: "https://schema.org/Place",
        id: null,
        properties: { name: ["Kozhikode, Kerala, India"] },
      },
    ],
    email: ["ahammednibras737@gmail.com"],
    sameAs: [
      "https://github.com/ahammednibras8",
      "https://linkedin.com/in/ahammednibras8",
    ],
  },
};

test("the homepage exposes the factual identity without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");

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

  expect(items).toEqual([
    {
      type: "https://schema.org/WebSite",
      id: `${origin}/#website`,
      properties: { name: ["Ahammed Nibras"], url: [`${origin}/`] },
    },
    expectedPerson,
  ]);

  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    `${origin}/`,
  );
  await expect(page.locator("main [itemprop='name']").first()).toBeVisible();
  await context.close();
});

test("the removed About route returns 404 without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  const response = await page.goto("/about/");

  expect(response?.status()).toBe(404);
  await expect(page).toHaveTitle("Page not found — Ahammed Nibras");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "I haven’t published a page at this address.",
  );
  await expect(page.getByRole("link", { name: /Homepage/ })).toHaveAttribute(
    "href",
    "/",
  );
  await expect(
    page.locator('[itemtype="https://schema.org/Person"]'),
  ).toHaveCount(0);
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  await context.close();
});
