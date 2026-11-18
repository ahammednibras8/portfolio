import { expect, test } from "@playwright/test";

for (const path of ["/", "/about/", "/404.html"]) {
  test(`${path} gives every link native new-tab behavior with advance hints`, async ({
    page,
  }) => {
    await page.goto(path);
    const links = await page.locator("a").evaluateAll((anchors) =>
      anchors.map((anchor) => ({
        href: anchor.getAttribute("href"),
        target: anchor.getAttribute("target"),
        rel: (anchor.getAttribute("rel") ?? "").split(/\s+/),
        title: anchor.getAttribute("title") ?? "",
        description: (anchor.getAttribute("aria-describedby") ?? "")
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent ?? "")
          .join(" "),
      })),
    );
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link.target, link.href ?? "missing href").toBe("_blank");
      expect(link.rel).toEqual(
        expect.arrayContaining(["noopener", "noreferrer"]),
      );
      expect(link.title).toMatch(/new tab/);
      expect(link.description).toMatch(/new tab/);
    }
  });
}

test("Gmail opens a separate compose destination with only the encoded recipient", async ({
  page,
  context,
}) => {
  // Intercept the popup's first navigation: never log in or send a message.
  await context.route("https://mail.google.com/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><html lang='en'><head><title>Gmail destination</title></head><body>Compose destination intercepted.</body></html>",
    }),
  );
  await page.goto("/");
  const originalUrl = page.url();
  const link = page.getByRole("link", { name: "Write in Gmail", exact: true });
  const href = await link.getAttribute("href");
  expect(href).not.toBeNull();
  const url = new URL(href ?? "");
  expect(url.origin).toBe("https://mail.google.com");
  expect(url.pathname).toBe("/mail/");
  expect(url.searchParams.get("view")).toBe("cm");
  expect(url.searchParams.get("fs")).toBe("1");
  expect(url.searchParams.getAll("to")).toEqual(["ahammednibras737@gmail.com"]);
  expect(url.searchParams.get("authuser")).toBeNull();
  expect(href).toContain("to=ahammednibras737%40gmail.com");
  const popupPromise = context.waitForEvent("page");
  await link.click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL(url.href);
  await expect(popup).toHaveTitle("Gmail destination");
  expect(await popup.evaluate(() => window.opener)).toBeNull();
  await expect(page).toHaveURL(originalUrl);
  await popup.close();
});
