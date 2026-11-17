import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("the About page has no detectable WCAG violations", async ({ page }) => {
  await page.goto("/about/");

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();

  expect(results.violations).toEqual([]);
});
