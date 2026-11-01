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

test("project cards stay level and release their press for focus and reduced motion", async ({
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
  await expect(card).toHaveCSS("transform", "none");
  await card.hover({ position: { x: 120, y: 120 } });
  await expect(card).toHaveCSS("transform", "none");

  // Keep a normal press/release without following this test's destination.
  await card.evaluate((link) => {
    link.addEventListener("click", (event) => event.preventDefault(), {
      once: true,
    });
  });
  await page.mouse.down();
  await expect(card).toHaveClass(/is-pressed/);
  await expect(card).toHaveCSS("scale", "0.985");
  await page.mouse.up();
  await page.mouse.move(0, 0);
  await expect(card).not.toHaveClass(/is-pressed/);
  await expect(card).toHaveCSS("scale", "none");
  await expect(card).toHaveCSS("transform", "none");

  await page.keyboard.press("Tab");
  await card.focus();
  await expect(card).toHaveCSS("outline-style", "solid");
  await expect(card).toHaveCSS("translate", "-4px -4px");

  await page.mouse.move(0, 0);
  await card.hover({ position: { x: 60, y: 60 } });
  await expect(card).toHaveCSS("transform", "none");
  await card.dispatchEvent("pointerdown", {
    pointerType: "touch",
    button: 0,
    buttons: 1,
  });
  await expect(card).toHaveClass(/is-pressed/);
  await card.dispatchEvent("pointercancel");
  await expect(card).not.toHaveClass(/is-pressed/);
  await card.dispatchEvent("pointerdown", {
    pointerType: "touch",
    button: 0,
    buttons: 1,
  });
  await expect(card).toHaveClass(/is-pressed/);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(card).not.toHaveClass(/is-pressed/);
  await expect(card).toHaveCSS("transform", "none");
  await expect(card).toHaveCSS("transition-duration", "0s");
  await card.dispatchEvent("pointerdown", { pointerType: "touch", buttons: 1 });
  await expect(card).not.toHaveClass(/is-pressed/);
});

test("icon gestures use attached hinges, separated layers, and one clockwise turn", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    document.querySelectorAll(".zoom-ready").forEach((piece) => {
      piece.classList.remove("zoom-ready");
    });
  });

  const sample = async (selector: string, progress: number) => {
    const part = page.locator(selector).first();

    // Each sample starts a fresh one-shot, even for another part of the same SVG.
    await page.mouse.move(0, 0);
    await expect(part.locator("..")).not.toHaveClass(/is-playing/);
    await part.locator("..").hover();
    return part.evaluate((element, fraction) => {
      const animation = element.getAnimations()[0];

      if (!animation?.effect) throw new Error("Expected an icon gesture.");

      animation.pause();
      const { delay, duration } = animation.effect.getTiming();

      animation.currentTime = Number(delay ?? 0) + Number(duration) * fraction;
      const style = getComputedStyle(element);
      const result = {
        origin: style.transformOrigin,
        scale: style.scale.split(" ").map(Number),
        translate: style.translate.split(" ").map(parseFloat),
      };

      animation.finish();
      return result;
    }, progress);
  };

  const flap = await sample("#contact .lucide-mail > path", 0.44);
  expect(flap.origin).toBe("12px 7px");
  expect(flap.scale[1]).toBeCloseTo(-0.3);
  await expect(page.locator(".lucide-mail > rect")).toHaveCSS(
    "animation-name",
    "none",
  );

  const handle = await sample(".lucide-briefcase > path", 0.34);
  expect(handle.origin).toBe("12px 20px");
  expect(handle.scale[1]).toBeCloseTo(1.07);

  const top = await sample(".lucide-layers > path:first-child", 0.32);
  const bottom = await sample(".lucide-layers > path:last-child", 0.32);
  expect(top.translate[1]).toBeCloseTo(-2);
  expect(bottom.translate[1]).toBeCloseTo(1.5);
  await expect(
    page.locator(".lucide-layers > path:nth-child(2)").first(),
  ).toHaveCSS("animation-name", "none");

  const arrow = page.locator(".lucide-rotate-cw");
  await arrow.hover();
  const turns = await arrow.evaluate((element) =>
    [...element.children].map((part) => {
      const animation = part.getAnimations()[0];

      if (!animation?.effect) throw new Error("Expected both arrow parts.");

      animation.pause();
      animation.currentTime =
        Number(animation.effect.getTiming().duration) * 0.72;
      const turn = parseFloat(getComputedStyle(part).rotate);

      animation.finish();
      return turn;
    }),
  );
  expect(turns).toEqual([330, 330]);
});

test("tactile icon surfaces stay static with reduced motion and simplify in forced colors", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const badge = page.locator(".project-list .sticker").first();
  await expect(badge).toHaveCSS("background-color", "rgb(143, 216, 220)");
  await expect(badge).toHaveCSS("border-top-width", "2px");
  expect(
    await badge.evaluate((element) => getComputedStyle(element).boxShadow),
  ).toContain("inset");
  await expect(badge.locator("svg")).toHaveCSS("color", "rgb(1, 58, 99)");
  await expect(badge.locator("path").first()).toHaveCSS("fill-opacity", "0.38");
  await expect(badge.locator("path").last()).toHaveCSS("fill", "none");
  await badge.hover();
  await expect(badge.locator("svg")).not.toHaveClass(/is-playing/);

  await page.emulateMedia({ forcedColors: "active" });
  await expect(badge).toHaveCSS("box-shadow", "none");
  await expect(badge.locator("path").first()).toHaveCSS("fill", "none");
});
