import { expect, test } from "@playwright/test";

test("folio marks follow the real page order and stay decorative", async ({
  page,
}) => {
  await page.goto("/");

  const folios = await page.locator(".part-rail a").evaluateAll((links) =>
    links.map((link) => {
      const target = document.querySelector(link.getAttribute("href") ?? "");
      const mark = target?.querySelector(":scope > .folio-mark");

      return {
        hidden: mark?.getAttribute("aria-hidden"),
        text: mark?.textContent?.trim(),
      };
    }),
  );

  expect(folios).toHaveLength(10);
  folios.forEach((mark, index) => {
    expect(mark).toEqual({
      hidden: "true",
      text: `${String(index + 1).padStart(2, "0")} / ${folios.length}`,
    });
  });

  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".folio-mark:visible")).toHaveCount(0);
});

test("project depth follows a mouse and releases for press, focus, and reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1440 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
  });

  const card = page.locator(".project-list .route-link").first();
  await card.scrollIntoViewIfNeeded();
  await expect(card.locator("..")).not.toHaveClass(/zoom-ready/);
  await card.hover({ position: { x: 30, y: 30 } });
  await expect(card).toHaveClass(/is-tilting/);
  await expect(card).not.toHaveCSS("transform", "none");

  const angles = await card.evaluate((element) => {
    const style = getComputedStyle(element);

    return ["--card-tilt-x", "--card-tilt-y"].map((name) =>
      Math.abs(parseFloat(style.getPropertyValue(name))),
    );
  });

  expect(angles.every((angle) => angle > 0 && angle <= 2.5)).toBe(true);

  // Keep a normal press/release without following this test's destination.
  await card.evaluate((link) => {
    link.addEventListener("click", (event) => event.preventDefault(), {
      once: true,
    });
  });
  await page.mouse.down();
  await expect(card).not.toHaveClass(/is-tilting/);
  await expect(card).toHaveClass(/is-pressed/);
  await expect(card).toHaveCSS("scale", "0.985");
  await page.mouse.up();
  await page.mouse.move(0, 0);
  await expect(card).not.toHaveClass(/is-pressed/);
  await expect(card).toHaveCSS("scale", "none");
  await expect(card).toHaveCSS("transform", "none");

  await page.keyboard.press("Tab");
  await card.focus();
  await expect(card).not.toHaveClass(/is-tilting/);
  await expect(card).toHaveCSS("outline-style", "solid");
  await expect(card).toHaveCSS("translate", "-4px -4px");

  await page.mouse.move(0, 0);
  await card.hover({ position: { x: 60, y: 60 } });
  await expect(card).toHaveClass(/is-tilting/);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(card).not.toHaveClass(/is-tilting/);
  await expect(card).toHaveCSS("transform", "none");
  await expect(card).toHaveCSS("transition-duration", "0s");
  await card.dispatchEvent("pointerdown", { pointerType: "touch", buttons: 1 });
  await expect(card).not.toHaveClass(/is-pressed/);
});
