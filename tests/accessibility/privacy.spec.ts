import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("the privacy notice has no detectable WCAG violations", async ({
  page,
}) => {
  const response = await page.goto("/privacy/");
  expect(response?.status()).toBe(200);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
