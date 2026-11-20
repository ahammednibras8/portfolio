import { expect, test } from "@playwright/test";
import { pressTab } from "../helpers/keyboard";

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

for (const path of ["/", "/about/"]) {
  test(`${path} exposes the same factual identity without JavaScript`, async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
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
    await context.close();
  });
}

test("the direct About route opens Home separately at 320px without JavaScript", async ({
  browser,
  browserName,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 320, height: 800 },
  });
  const page = await context.newPage();
  await page.goto("/about/");
  await expect(page).toHaveURL(/\/about\/$/);
  await expect(page).toHaveTitle("About Ahammed Nibras — Software developer");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "About Ahammed Nibras",
  );
  await expect(page.getByRole("contentinfo")).toHaveText(
    "Ahammed Nibras · Kozhikode, Kerala, India",
  );

  const viewport = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(viewport.scrollWidth).toBe(viewport.width);

  await expect(page.getByRole("heading", { name: "How I work" })).toBeVisible();
  await expect(page.getByRole("link", { name: "GitHub" })).toHaveAttribute(
    "href",
    "https://github.com/ahammednibras8",
  );
  await expect(page.getByRole("link", { name: "LinkedIn" })).toHaveAttribute(
    "href",
    "https://linkedin.com/in/ahammednibras8",
  );
  await pressTab(page, browserName);
  await expect(page.getByRole("link", { name: "Back to home" })).toBeFocused();
  const popupPromise = context.waitForEvent("page");
  await page.keyboard.press("Enter");
  const home = await popupPromise;
  await expect(home).toHaveURL(new URL("/", page.url()).href);
  await expect(home.locator("#contact [itemprop='email']")).toBeVisible();
  expect(await home.evaluate(() => window.opener)).toBeNull();
  await expect(page).toHaveURL(/\/about\/$/);
  await home.close();
  await context.close();
});
