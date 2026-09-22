import { expect, test } from "@playwright/test";

test("unknown routes return an HTTP 404", async ({ page }) => {
  const response = await page.goto("/route-that-does-not-exist");

  expect(response).not.toBeNull();
  expect(response?.status()).toBe(404);
});
