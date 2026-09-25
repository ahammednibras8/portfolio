import { expect, test } from "@playwright/test";

test("the homepage explains the work in document order", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Ahammed Nibras — Software engineer");
  await expect(
    page.getByRole("heading", { level: 1, name: "Hi, I’m Ahammed." }),
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
    page.getByRole("heading", { level: 1, name: "Hi, I’m Ahammed." }),
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
