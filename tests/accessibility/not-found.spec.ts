import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const notFoundArtifact = resolve("dist/404.html");

test("the built 404 artifact has no detectable WCAG violations", async ({
  page,
}) => {
  await readFile(notFoundArtifact, "utf8");

  await page.goto("/404.html");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "I haven’t published a page at this address.",
    }),
  ).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();

  expect(results.violations).toEqual([]);
});

test("the not-found response has no detectable WCAG violations", async ({
  page,
}) => {
  const response = await page.goto("/route-that-does-not-exist");

  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "I haven’t published a page at this address.",
    }),
  ).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();

  expect(results.violations).toEqual([]);
});
