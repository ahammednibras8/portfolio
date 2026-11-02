import { expect, test } from "@playwright/test";

const selectionBackground = "rgb(0, 122, 115)";
const selectionText = "rgb(255, 255, 255)";

test.use({ reducedMotion: "reduce" });

test("text selection uses the same readable accent across light and dark surfaces", async ({
  page,
}) => {
  await page.goto("/");
  const samples = await page
    .locator(
      ".hero-name, .site-header a, .site-footer a, #about-heading, #cascade-heading, .project-evidence h4, .run-path figcaption, .speech-bubble p",
    )
    .evaluateAll((elements) =>
      elements.map((element) => {
        const selection = getComputedStyle(element, "::selection");
        return {
          background: selection.backgroundColor,
          color: selection.color,
          shadow: selection.textShadow,
        };
      }),
    );
  expect(samples.length).toBeGreaterThan(10);
  for (const sample of samples) {
    expect(sample).toEqual({
      background: selectionBackground,
      color: selectionText,
      shadow: "none",
    });
  }
  await page.locator(".hero-name").dblclick();
  expect(await page.evaluate(() => getSelection()?.toString())).toContain(
    "Nibras",
  );
});

test.describe("native selection without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("double-click still selects readable text", async ({ page }) => {
    await page.goto("/");
    await page.locator(".hero-name").dblclick();
    expect(await page.evaluate(() => getSelection()?.toString())).toContain(
      "Nibras",
    );
    expect(
      await page
        .locator(".hero-name")
        .evaluate(
          (element) => getComputedStyle(element, "::selection").backgroundColor,
        ),
    ).toBe(selectionBackground);
  });
});

test("print leaves selection styling to the browser", async ({ page }) => {
  await page.goto("/");
  await page.emulateMedia({ media: "print" });
  expect(
    await page
      .locator(".hero-name")
      .evaluate(
        (element) => getComputedStyle(element, "::selection").backgroundColor,
      ),
  ).not.toBe(selectionBackground);
});

test("high contrast leaves selection styling to the operating system", async ({
  browserName,
  page,
}) => {
  test.skip(
    browserName !== "chromium",
    "Forced-colors emulation is Chromium-only.",
  );
  await page.goto("/");
  await page.emulateMedia({ forcedColors: "active" });
  expect(
    await page
      .locator(".hero-name")
      .evaluate(
        (element) => getComputedStyle(element, "::selection").backgroundColor,
      ),
  ).not.toBe(selectionBackground);
});
