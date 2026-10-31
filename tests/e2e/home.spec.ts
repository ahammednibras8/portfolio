import { expect, type Locator, type Page, test } from "@playwright/test";

const homepageTitle = "Ahammed Nibras — Software engineer";
const homepageDescription =
  "Ahammed Nibras is a software engineer who builds AI products and the systems that keep them running.";
const homepageSocialImageAlt =
  "The portfolio homepage with the heading “Hi, I’m Nibras.”, the role Software engineer, and a framed portrait.";
const productionOrigin = "https://ahammednibras.com";
const primaryLinks = ["/", "/#work", "/#about", "/#contact"];

const underlineHidden = "inset(0px 100% 0px 0px)";
const underlineDrawn = "inset(0px)";
const underlineClip = (element: Locator) =>
  element.evaluate((node) => getComputedStyle(node, "::after").clipPath);

// Hover assertions need the pointer to stay put, so scrolling must settle first.
const settleScrolling = (page: Page) =>
  page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";

    // Hover tests point at resting places, so nothing may still slide in.
    for (const piece of document.querySelectorAll(
      ".slide-from-start, .slide-from-end",
    )) {
      piece.classList.remove("slide-from-start", "slide-from-end");
    }
  });

test("the whole portfolio reads as one continuous page", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(homepageTitle);
  await expect(
    page.getByRole("heading", { level: 1, name: "Hi, I’m Nibras." }),
  ).toBeVisible();
  expect(
    await page
      .getByRole("heading", { level: 2 })
      .evaluateAll((headings) =>
        headings.map((heading) => heading.textContent?.trim()),
      ),
  ).toEqual([
    "Selected work",
    "Cascade",
    "How this site runs.",
    "About",
    "Contact",
  ]);

  await expect(page.getByRole("link", { name: "See my work" })).toHaveAttribute(
    "href",
    "#work",
  );
  await expect(
    page.getByRole("link", { name: "Get in touch" }),
  ).toHaveAttribute("href", "#contact");

  await expect(page.locator('a[href^="/work"]')).toHaveCount(0);
  await expect(page.locator('a[href^="/architecture"]')).toHaveCount(0);
  await expect(page.locator('a[href="/contact/"]')).toHaveCount(0);
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(page.getByText("TypeScript · PostgreSQL · Redis")).toBeVisible();
  await expect(page.locator("footer")).toContainText(
    "Ahammed Nibras · Kozhikode, Kerala, India",
  );
});

test("the page runs from work through about to contact without clicks", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const layout = await page.evaluate(() => {
    const top = (selector: string) => {
      const element = document.querySelector(selector);

      if (!element) {
        throw new Error(`Expected ${selector}.`);
      }

      return element.getBoundingClientRect().top;
    };

    return {
      order: ["#work", "#cascade", "#architecture", "#about", "#contact"].map(
        top,
      ),
      viewportHeight: window.innerHeight,
      documentHeight: document.documentElement.scrollHeight,
    };
  });

  expect(layout.order).toEqual([...layout.order].sort((a, b) => a - b));
  expect(layout.documentHeight).toBeGreaterThan(layout.viewportHeight * 4);

  await page
    .getByRole("navigation", { name: "Primary" })
    .getByRole("link", { name: "About" })
    .click();
  await expect(page).toHaveURL(/#about$/);
  await expect(
    page.getByRole("heading", { level: 2, name: "About" }),
  ).toBeInViewport();
});

test("the homepage publishes canonical, social, and favicon metadata", async ({
  page,
  request,
}) => {
  await page.goto("/");

  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    homepageDescription,
  );
  await expect(page.locator('meta[name="author"]')).toHaveAttribute(
    "content",
    "Ahammed Nibras",
  );
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    "content",
    "#dff3f4",
  );

  const canonicalLink = page.locator('link[rel="canonical"]');
  const canonicalHref = await canonicalLink.getAttribute("href");

  if (!canonicalHref) {
    throw new Error("Expected the homepage to publish a canonical URL.");
  }

  const canonical = new URL(canonicalHref);
  expect(canonical.href).toBe(`${productionOrigin}/`);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    "content",
    canonical.href,
  );
  await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute(
    "content",
    "Ahammed Nibras",
  );
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute(
    "content",
    "website",
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    homepageTitle,
  );
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
    "content",
    homepageDescription,
  );

  const socialImageContent = await page
    .locator('meta[property="og:image"]')
    .getAttribute("content");

  if (!socialImageContent) {
    throw new Error("Expected the homepage to publish a social image URL.");
  }

  const socialImage = new URL(socialImageContent);

  expect(socialImage.origin).toBe(productionOrigin);
  expect(socialImage.pathname).toBe("/social/home.png");
  await expect(page.locator('meta[property="og:image:type"]')).toHaveAttribute(
    "content",
    "image/png",
  );
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute(
    "content",
    "1200",
  );
  await expect(
    page.locator('meta[property="og:image:height"]'),
  ).toHaveAttribute("content", "630");
  await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute(
    "content",
    homepageSocialImageAlt,
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary_large_image",
  );
  await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute(
    "content",
    homepageTitle,
  );
  await expect(
    page.locator('meta[name="twitter:description"]'),
  ).toHaveAttribute("content", homepageDescription);
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
    "content",
    socialImage.href,
  );
  await expect(page.locator('meta[name="twitter:image:alt"]')).toHaveAttribute(
    "content",
    homepageSocialImageAlt,
  );

  const socialImageResponse = await request.get("/social/home.png");
  expect(socialImageResponse.ok()).toBe(true);

  const socialImageBody = await socialImageResponse.body();
  expect(socialImageBody.readUInt32BE(16)).toBe(1200);
  expect(socialImageBody.readUInt32BE(20)).toBe(630);

  const icons = page.locator('link[rel="icon"]');
  await expect(icons).toHaveCount(2);
  expect(
    await icons.evaluateAll((items) =>
      items.map((item) => ({
        href: item.getAttribute("href"),
        sizes: item.getAttribute("sizes"),
        type: item.getAttribute("type"),
      })),
    ),
  ).toEqual([
    {
      href: "/favicon.ico",
      sizes: "16x16 32x32 64x64",
      type: "image/x-icon",
    },
    {
      href: "/favicon.svg",
      sizes: "any",
      type: "image/svg+xml",
    },
  ]);

  for (const path of ["/favicon.ico", "/favicon.svg"]) {
    const response = await request.get(path);

    expect(response.ok()).toBe(true);
    expect((await response.body()).byteLength).toBeGreaterThan(0);
  }
});

test("pop-outs slide in, settle, then answer hover", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await settleScrolling(page);

  const bubble = page.locator("#about .speech-bubble");
  const label = page.locator("article > section > h4").first();
  const read = (element: typeof bubble) =>
    element.evaluate((node) => {
      const style = getComputedStyle(node);

      return { animation: style.animationName, scale: style.scale };
    });

  expect(await read(bubble)).toEqual({ animation: "none", scale: "none" });

  await page.locator("#about").evaluate((section) => {
    section.scrollIntoView({ block: "center" });
  });
  await page.mouse.move(0, 0);
  await expect
    .poll(() => read(bubble))
    .toEqual({ animation: "none", scale: "none" });

  await bubble.hover();
  await expect.poll(async () => (await read(bubble)).scale).toBe("1.05");

  await label.hover();
  await expect.poll(async () => (await read(label)).scale).toBe("1.05");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.mouse.move(0, 0);
  await bubble.hover();
  expect((await read(bubble)).scale).toBe("none");
});

test("every animation starts and ends cleanly", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await settleScrolling(page);

  const keyframes = await page.evaluate(() =>
    [...document.styleSheets]
      .flatMap((sheet) => [...sheet.cssRules])
      .flatMap((rule) =>
        rule instanceof CSSMediaRule ? [...rule.cssRules] : [rule],
      )
      .filter((rule) => rule instanceof CSSKeyframesRule)
      .map((rule) =>
        [...(rule as CSSKeyframesRule).cssRules].flatMap((frame) =>
          (frame as CSSKeyframeRule).keyText.split(/,\s*/),
        ),
      ),
  );

  expect(keyframes.length).toBeGreaterThan(0);

  for (const stops of keyframes) {
    expect(stops).toContain("0%");
    expect(stops).toContain("100%");
  }

  const sticker = page.locator("#cascade .sticker");
  const stickerStyle = (name: "animationName" | "rotate") =>
    sticker.evaluate((element, key) => getComputedStyle(element)[key], name);

  await sticker.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await sticker.hover();
  await expect.poll(() => stickerStyle("rotate")).toBe("-6deg");
  await expect.poll(() => stickerStyle("animationName")).toBe("none");

  await page.mouse.move(0, 0);
  await expect.poll(() => stickerStyle("rotate")).toBe("-6deg");

  const plate = page
    .getByRole("navigation", { name: "Contact options" })
    .getByRole("link", { name: /Email/ });
  const plateTiming = () =>
    plate.evaluate((element) => {
      const style = getComputedStyle(element);

      return {
        duration: style.transitionDuration,
        property: style.transitionProperty,
        timing: style.transitionTimingFunction,
      };
    });

  const atRest = await plateTiming();

  expect(atRest.property).toBe("translate, rotate, box-shadow");
  expect(atRest.duration).toBe("0.36s, 0.36s, 0.18s");
  expect(atRest.timing).toContain("cubic-bezier(0.2, 0, 0, 1)");

  const title = plate.getByRole("heading", { name: "Email" });

  expect(await underlineClip(title)).toBe(underlineHidden);

  await plate.hover();
  await expect.poll(() => underlineClip(title)).toBe(underlineDrawn);
  expect((await plateTiming()).timing).toContain(
    "cubic-bezier(0.34, 1.56, 0.64, 1)",
  );

  await page.mouse.move(0, 0);
  await expect.poll(() => underlineClip(title)).toBe(underlineHidden);
});

test("printing gives a clean two-page document", async ({
  browserName,
  page,
}) => {
  test.skip(browserName !== "chromium", "PDF output is Chromium-only.");

  await page.goto("/");

  const printContact = page.locator(".print-contact");

  await expect(printContact).toBeHidden();

  await page.emulateMedia({ media: "print" });

  await expect(page.locator(".site-header")).toBeHidden();
  await expect(page.locator(".site-footer")).toBeHidden();
  await expect(page.locator("#contact")).toBeHidden();
  await expect(page.locator(".hero-actions")).toBeHidden();
  await expect(page.locator(".sticker").first()).toBeHidden();
  await expect(page.locator(".hero-portrait")).toBeHidden();
  await expect(printContact).toBeVisible();
  await expect(printContact.getByRole("link")).toHaveCount(3);
  await expect(
    printContact.getByRole("link", { name: "ahammednibras737@gmail.com" }),
  ).toHaveAttribute("href", "mailto:ahammednibras737@gmail.com");
  await expect(page.getByRole("article")).toBeVisible();
  await expect(page.locator(".architecture-diagram")).toBeVisible();
  await expect(page.locator("#about")).toBeVisible();
  await expect(page.locator(".speech-bubble").first()).toHaveCSS(
    "box-shadow",
    "none",
  );

  const pdf = await page.pdf({ format: "A4", preferCSSPageSize: true });
  const pages = pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? [];

  expect(pages).toHaveLength(2);
});

test("the hero shows an optimized portrait in a cartoon frame", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await settleScrolling(page);

  const frame = page.locator(".hero-portrait");
  const portrait = frame.getByRole("img", {
    name: "Ahammed Nibras smiling in front of a carved stone wall.",
  });

  // Build output strips line breaks, which would run the two lines together.
  await expect(page.locator("#introduction-heading")).toHaveText(
    "Hi, I’m Nibras.",
    { useInnerText: false },
  );
  expect(
    await page
      .locator("#introduction-heading")
      .evaluate((heading) => heading.textContent),
  ).toBe("Hi, I’m Nibras.");
  await expect(portrait).toBeVisible();
  await expect(portrait).toHaveAttribute("src", /^\/_astro\/.*\.webp$/);
  await expect(portrait).toHaveCSS("border-top-width", "3px");
  expect(
    await portrait.evaluate((image: HTMLImageElement) => image.naturalWidth),
  ).toBeGreaterThan(0);

  const placement = () =>
    page.evaluate(() => {
      const box = (selector: string) => {
        const element = document.querySelector(selector);

        if (!element) {
          throw new Error(`Expected ${selector}.`);
        }

        return element.getBoundingClientRect();
      };
      const image = box(".hero-portrait img");
      const title = box("h1");
      const bubble = box(".exhibit-hero-portrait .speech-bubble");

      return {
        besideBubble: bubble.right < image.left,
        besideTitle: title.right <= image.left,
        belowTitle: image.top > title.bottom,
      };
    });

  expect(await placement()).toMatchObject({
    besideBubble: true,
    besideTitle: true,
  });

  const rotate = () =>
    frame.evaluate((element) => getComputedStyle(element).rotate);

  expect(await rotate()).toBe("2deg");

  await frame.hover();
  await expect.poll(rotate).toBe("0deg");

  await page.mouse.move(0, 0);
  await expect.poll(rotate).toBe("2deg");

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await placement()).toMatchObject({ belowTitle: true });
});

test("the headline sweeps on load and hover and stays readable", async ({
  browserName,
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");

  const headline = page.getByRole("heading", { level: 1 });
  const keyframes = await headline.evaluate((element) => {
    const effect = element.getAnimations()[0]?.effect as KeyframeEffect;

    return effect.getKeyframes().map((frame) => frame.backgroundPositionX);
  });

  // A falling position moves the band left to right across the text.
  expect(keyframes).toEqual(["100%", "0%"]);

  const style = () =>
    headline.evaluate((element) => {
      const computed = getComputedStyle(element);

      return {
        animation: computed.animationName,
        clip: computed.backgroundClip,
        color: computed.color,
        position: computed.backgroundPositionX,
      };
    });
  const ended = () =>
    headline.evaluate((element) =>
      element
        .getAnimations()
        .every(
          (animation) =>
            !(animation instanceof CSSAnimation) ||
            animation.playState === "finished",
        ),
    );

  expect(await style()).toMatchObject({
    animation: "title-sweep",
    clip: "text",
    color: "rgba(0, 0, 0, 0)",
  });

  await expect.poll(ended, { timeout: 4000 }).toBe(true);
  expect((await style()).position).toBe("100%");

  await headline.hover();
  await expect
    .poll(async () => (await style()).position, { timeout: 3000 })
    .toBe("0%");

  await page.mouse.move(0, 700);
  await expect
    .poll(async () => (await style()).position, { timeout: 3000 })
    .toBe("100%");

  const ordinaryText = {
    animation: "none",
    clip: "border-box",
    color: "rgb(23, 25, 26)",
  };

  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await style()).toMatchObject(ordinaryText);

  await page.emulateMedia({ reducedMotion: "no-preference", media: "print" });
  expect(await style()).toMatchObject(ordinaryText);

  test.skip(
    browserName !== "chromium",
    "Forced-colors emulation is Chromium-only.",
  );
  await page.emulateMedia({ media: "screen", forcedColors: "active" });
  expect(await style()).toMatchObject({
    animation: "none",
    clip: "border-box",
  });
});

test("hover underlines draw from the start and retract back to it", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await settleScrolling(page);

  const link = page.getByRole("link", {
    name: "Read the source documentation",
  });
  await link.scrollIntoViewIfNeeded();
  const line = () =>
    link.evaluate((element) => getComputedStyle(element).backgroundSize);
  const rightInset = () =>
    link.evaluate((element) => {
      const clip = getComputedStyle(element, "::after").clipPath;

      return Number.parseFloat(clip.split(" ")[1] ?? "0");
    });
  const watch = () =>
    link.evaluate(
      (element) =>
        new Promise<number[]>((resolve) => {
          const insets: number[] = [];
          const started = performance.now();
          const tick = () => {
            const clip = getComputedStyle(element, "::after").clipPath;

            insets.push(Number.parseFloat(clip.split(" ")[1] ?? "0"));

            if (performance.now() - started < 450) {
              requestAnimationFrame(tick);
            } else {
              resolve(insets);
            }
          };

          requestAnimationFrame(tick);
        }),
    );

  expect(await underlineClip(link)).toBe(underlineHidden);
  expect(await line()).toBe("100% 1px");

  const box = await link.boundingBox();

  if (!box) {
    throw new Error("Expected the link to have a box.");
  }

  const drawing = watch();

  await page.mouse.move(box.x + 8, box.y + 8);

  const drawn = await drawing;

  expect(drawn.at(-1)).toBeLessThan(1);
  expect(drawn.some((inset) => inset > 5 && inset < 95)).toBe(true);
  expect(drawn).toEqual([...drawn].sort((a, b) => b - a));
  expect(await line()).toBe("0% 1px");

  const retracting = watch();

  await page.mouse.move(0, 790);

  const retracted = await retracting;

  expect(retracted.at(-1)).toBeGreaterThan(99);
  expect(retracted.some((inset) => inset > 5 && inset < 95)).toBe(true);
  expect(retracted).toEqual([...retracted].sort((a, b) => a - b));
  expect(await line()).toBe("100% 1px");
  expect(await rightInset()).toBe(100);
});

test("diagram underlines stay between titles and descriptions at every width", async ({
  page,
}) => {
  await page.goto("/");

  for (const width of [320, 768, 1280]) {
    await page.setViewportSize({ width, height: 800 });

    const labels = await page
      .locator(".architecture-node-link")
      .evaluateAll((links) =>
        links.map((link) => {
          const title = link.querySelector("strong");
          const detail = link.querySelector(".architecture-node-detail");

          if (!title || !detail) {
            throw new Error("Expected a diagram title and description.");
          }

          const box = title.getBoundingClientRect();
          const line = getComputedStyle(title, "::after");
          const top = box.top + Number.parseFloat(line.top);

          return {
            text: title.textContent,
            titleBottom: box.bottom,
            lineTop: top,
            lineBottom: top + Number.parseFloat(line.height),
            detailTop: detail.getBoundingClientRect().top,
          };
        }),
      );

    for (const label of labels) {
      expect(label.lineTop, `${width}px: ${label.text}`).toBeGreaterThan(
        label.titleBottom,
      );
      expect(label.lineBottom, `${width}px: ${label.text}`).toBeLessThan(
        label.detailTop,
      );
    }
  }
});

test("the shared navigation points to real sections and marks the page", async ({
  page,
}) => {
  await page.goto("/");

  const navigation = page.getByRole("navigation", { name: "Primary" });
  const links = navigation.getByRole("link");

  await expect(links).toHaveCount(4);
  expect(
    await links.evaluateAll((items) =>
      items.map((item) => item.getAttribute("href")),
    ),
  ).toEqual(primaryLinks);

  const current = navigation.locator("[aria-current]");
  await expect(current).toHaveCount(1);
  await expect(current).toHaveAttribute("href", "/");
  await expect(current).toHaveAttribute("aria-current", "page");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    `${productionOrigin}/`,
  );

  for (const target of ["work", "about", "contact"]) {
    await expect(page.locator(`#${target}`)).toHaveCount(1);
  }
});

test("the 320px index keeps navigation and route choices usable", async ({
  browserName,
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const layout = await page.evaluate(() => {
    const bounds = (selector: string) =>
      [...document.querySelectorAll<HTMLElement>(selector)].map((element) => {
        const rectangle = element.getBoundingClientRect();

        return {
          top: Math.round(rectangle.top),
          left: Math.round(rectangle.left),
          right: Math.round(rectangle.right),
          height: Math.round(rectangle.height),
        };
      });

    return {
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      navigation: bounds(".primary-navigation a"),
      routes: bounds(".route-link"),
    };
  });

  expect(layout.scrollWidth).toBe(layout.clientWidth);
  expect(layout.navigation).toHaveLength(4);
  expect(new Set(layout.navigation.map(({ top }) => top)).size).toBe(1);
  expect(layout.routes).toHaveLength(4);

  for (const item of [...layout.navigation, ...layout.routes]) {
    expect(item.left).toBeGreaterThanOrEqual(0);
    expect(item.right).toBeLessThanOrEqual(layout.clientWidth);
  }

  for (const item of layout.navigation) {
    expect(item.height).toBeGreaterThanOrEqual(44);
  }

  const nextLink = browserName === "webkit" ? "Alt+Tab" : "Tab";
  await page.keyboard.press(nextLink);
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();

  for (let index = 0; index < 6; index += 1) {
    await page.keyboard.press(nextLink);
  }

  await expect(page.getByRole("link", { name: "Get in touch" })).toBeFocused();
});

test("every interactive element answers a hover without needing motion", async ({
  page,
}) => {
  const transform = (selector: string) => () =>
    page
      .locator(selector)
      .first()
      .evaluate((element) => getComputedStyle(element).transform);
  const work = page
    .getByRole("navigation", { name: "Primary" })
    .getByRole("link", { name: "Work" });
  const plate = page
    .getByRole("navigation", { name: "Contact options" })
    .getByRole("link", { name: /Email/ });

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await settleScrolling(page);

  await work.hover();
  await expect
    .poll(() => work.evaluate((link) => getComputedStyle(link).backgroundSize))
    .toBe("100% 2px");

  await page.getByRole("link", { name: "See my work" }).hover();
  await expect.poll(transform(".hero-action .action-arrow")).toBe("none");

  await plate.hover();
  await expect
    .poll(transform("#contact .route-link h3"))
    .toBe("matrix(1, 0, 0, 1, 8, 0)");
  await expect
    .poll(transform("#contact .route-link .action-arrow"))
    .toBe("none");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.mouse.move(0, 0);
  await plate.hover();
  expect(await transform("#contact .route-link h3")()).toBe("none");
  expect(
    await underlineClip(plate.getByRole("heading", { name: "Email" })),
  ).toBe(underlineDrawn);

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await settleScrolling(page);
  await page.locator(".architecture-node-link").first().hover();
  await expect.poll(transform(".architecture-node-icon")).toBe("none");
});

test("cartoon details stay decorative and respect reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });

  await page.goto("/");

  const stickers = page.locator(".sticker");

  expect(await stickers.count()).toBeGreaterThan(0);
  await expect(page.locator(".sticker:not([aria-hidden='true'])")).toHaveCount(
    0,
  );
  await expect(stickers.locator("svg").first()).toBeVisible();
  await expect(page.locator(".speech-bubble").first()).toBeVisible();

  const hand = page.locator(".sticker-wave svg");
  const portrait = page.locator(".hero-portrait");

  await expect(hand).toHaveCSS("animation-name", "none");
  await settleScrolling(page);
  await portrait.hover();
  await expect(hand).toHaveCSS("animation-name", "hand-wave");
  await expect(hand).toHaveCSS("animation-iteration-count", "1");
  await expect
    .poll(() => hand.evaluate((icon) => icon.getAnimations().length))
    .toBe(0);

  await page.mouse.move(0, 0);
  await expect(hand).toHaveCSS("animation-name", "none");
  await portrait.hover();
  await expect(hand).toHaveCSS("animation-name", "hand-wave");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".sticker-wave svg")).toHaveCSS(
    "animation-name",
    "none",
  );
});

test("icon details animate once while the SVG and its outline stay still", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await settleScrolling(page);

  const types = await page
    .locator("main svg.lucide")
    .evaluateAll((icons) => [
      ...new Set(
        icons.map((icon) =>
          [...icon.classList].find((name) => name.startsWith("lucide-")),
        ),
      ),
    ]);

  for (const type of types) {
    if (!type) throw new Error("Expected a Lucide icon type.");
    if (type === "lucide-hand") continue;

    const icon = page.locator(`main svg.${type}`).first();
    await icon.hover();
    const state = await icon.evaluate((element) => ({
      animation: getComputedStyle(element).animationName,
      transform: getComputedStyle(element).transform,
      details: [...element.children].map((part) => ({
        animation: getComputedStyle(part).animationName,
        iterations: getComputedStyle(part).animationIterationCount,
      })),
    }));

    expect(state.animation, type).toBe("none");
    expect(state.transform, type).toBe("none");
    const moving = state.details.filter((part) => part.animation !== "none");
    expect(moving.length, type).toBeGreaterThan(0);
    expect(
      moving.every((part) => part.iterations === "1"),
      type,
    ).toBe(true);
  }

  const fixedOutlines = [
    ".lucide-mail > rect",
    ".lucide-cloud-upload > path:nth-child(2)",
    ".lucide-message-circle-more > path:first-child",
    ".lucide-server > rect",
    ".lucide-shield-check > path:first-child",
    ".lucide-eye > path",
    ".lucide-globe > circle",
    ".lucide-cpu > rect:first-of-type",
  ];

  for (const selector of fixedOutlines) {
    const outline = page.locator(`main ${selector}`).first();
    await outline.locator("..").hover();
    await expect(outline, selector).toHaveCSS("animation-name", "none");
    await expect(outline, selector).toHaveCSS("transform", "none");
  }

  // Keyboard focus triggers the same internal detail, keeping the card legible.
  await page.mouse.move(0, 0);
  await page.locator('#contact a[href^="mailto:"]').focus();
  await expect(page.locator(".lucide-mail > path")).not.toHaveCSS(
    "animation-name",
    "none",
  );
  await expect(page.locator(".lucide-mail > rect")).toHaveCSS(
    "animation-name",
    "none",
  );

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator('#contact a[href^="mailto:"]').hover();
  expect(
    await page
      .locator("main svg, main svg *")
      .evaluateAll((parts) =>
        parts.every((part) => getComputedStyle(part).animationName === "none"),
      ),
  ).toBe(true);
});

test.describe("on a phone-sized screen", () => {
  test.use({ deviceScaleFactor: 1.75, viewport: { height: 823, width: 412 } });

  test("the portrait downloads at the size it renders", async ({ page }) => {
    await page.goto("/");

    const portrait = page.locator(".hero-portrait img");
    const chosenWidth = () =>
      portrait.evaluate((image: HTMLImageElement) => {
        const chosen = new URL(image.currentSrc).pathname;
        const sources = image.parentElement?.querySelectorAll("source") ?? [];

        return [...sources, image]
          .flatMap((source) => source.srcset.split(","))
          .map((candidate) => candidate.trim().split(" "))
          .find(([url]) => url === chosen)?.[1];
      });

    await expect(page.locator(".hero-portrait source").first()).toHaveAttribute(
      "type",
      "image/avif",
    );
    await expect.poll(chosenWidth).toBe("520w");
  });
});

test.describe("on a touch screen", () => {
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "Only Chromium emulates a touch-only pointer.",
  );
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { height: 915, width: 412 },
  });

  test("icons play once in view and the hero dots roll", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });

    const blocked: string[] = [];

    page.on("console", (message) => {
      if (message.type() === "error") blocked.push(message.text());
    });
    await page.goto("/");
    await settleScrolling(page);

    const hero = page.locator(".exhibit-hero-portrait");
    const flap = page.locator("#contact .lucide-mail > path");

    // The script must really run under the production security policy.
    await expect(hero).toHaveClass(/is-waving/);
    expect(blocked).toEqual([]);
    await expect(hero).not.toHaveClass(/is-waving/, { timeout: 11000 });
    await expect(flap).toHaveCSS("animation-name", "none");

    await flap.scrollIntoViewIfNeeded();
    await expect(flap).toHaveCSS("animation-name", "icon-mail-flap");
    await expect(flap).toHaveCSS("animation-name", "none");

    await page.locator("#introduction-heading").tap();
    await expect(hero).toHaveClass(/is-waving/);
  });

  test("a phone that claims it can hover still starts on the first touch", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.addInitScript(() => {
      const realMatchMedia = window.matchMedia.bind(window);

      window.matchMedia = (query) =>
        query === "(hover: hover)"
          ? ({ matches: true } as MediaQueryList)
          : realMatchMedia(query);
    });
    await page.goto("/");
    await settleScrolling(page);

    await expect(page.locator("html")).not.toHaveClass(/is-touch/);
    await page.touchscreen.tap(20, 300);
    await expect(page.locator("html")).toHaveClass(/is-touch/);
    await expect(page.locator(".exhibit-hero-portrait")).toHaveClass(
      /is-waving/,
    );
  });

  const tiltPhone = (page: Page) =>
    page.evaluate(() => {
      window.dispatchEvent(
        new DeviceOrientationEvent("deviceorientation", {
          beta: 75,
          gamma: 30,
        }),
      );
    });
  const portraitLean = (page: Page) =>
    page
      .locator(".hero-portrait")
      .evaluate((portrait) => getComputedStyle(portrait).translate);

  test("a tap buzzes and the portrait leans with the phone", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "vibrate", {
        value: (duration: number) => {
          document.documentElement.dataset.buzzed = String(duration);

          return true;
        },
      });
    });
    await page.goto("/");
    await settleScrolling(page);

    await expect
      .poll(async () => {
        await tiltPhone(page);

        return portraitLean(page);
      })
      .toBe("6px 6px");

    await page.locator("#introduction-heading").tap();
    await expect(page.locator("html")).toHaveAttribute("data-buzzed", "10");
  });

  test("the tilt sensor permission is only requested by a portrait tap", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.addInitScript(() => {
      Object.assign(DeviceOrientationEvent, {
        requestPermission: async () => {
          document.documentElement.dataset.asked = "true";

          return "granted";
        },
      });
    });
    await page.goto("/");
    await settleScrolling(page);

    await expect(page.locator("html")).not.toHaveAttribute(
      "data-asked",
      "true",
    );

    await page.locator(".hero-portrait img").tap();
    await expect(page.locator("html")).toHaveAttribute("data-asked", "true");
    await expect
      .poll(async () => {
        await tiltPhone(page);

        return portraitLean(page);
      })
      .toBe("6px 6px");
  });

  test("reduced motion keeps the page still", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await settleScrolling(page);
    await tiltPhone(page);
    expect(await portraitLean(page)).toBe("none");
    await page.locator("#contact").scrollIntoViewIfNeeded();
    await page.locator("#introduction-heading").tap();

    await expect(page.locator(".is-waving, .is-playing")).toHaveCount(0);
  });
});

test("page content shares one left and right edge at every width", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });

  for (const width of [390, 820, 1440, 2560]) {
    await page.setViewportSize({ height: 900, width });
    await page.goto("/");

    const edges = await page.evaluate(() => {
      const box = (selector: string) => {
        const element = document.querySelector(selector);

        if (!element) throw new Error(`Expected ${selector}.`);

        return element.getBoundingClientRect();
      };
      const leftEdge = [
        ".primary-navigation ul",
        "#introduction-heading",
        ".hero-greeting",
        "#work .routes-introduction",
        "#cascade-heading",
        "article > header",
        "article > p",
        "#evidence",
        "#architecture-heading",
        ".architecture-diagram",
        "#about-heading",
        ".route-list",
        ".site-footer-location",
      ];
      const rightEdge = [
        ".primary-navigation ul",
        "#work .routes-introduction",
        "#evidence",
        ".architecture-diagram",
        "#about .speech-bubble",
        ".route-list",
      ];

      return {
        lefts: leftEdge.map((selector) => Math.round(box(selector).left)),
        rights: rightEdge.map((selector) => Math.round(box(selector).right)),
      };
    });

    expect(new Set(edges.lefts).size, `left edges at ${width}`).toBe(1);
    expect(new Set(edges.rights).size, `right edges at ${width}`).toBe(1);
  }
});

test("color bands run edge to edge on any width", async ({ page }) => {
  for (const width of [390, 1440, 2560]) {
    await page.setViewportSize({ height: 900, width });
    await page.goto("/");

    const bands = await page
      .locator("#cascade, #about, #contact, .site-header, .site-footer")
      .evaluateAll((elements) =>
        elements.map((element) => {
          const { left, right } = element.getBoundingClientRect();

          return { left, right };
        }),
      );
    const edge = await page.evaluate(
      () => document.documentElement.clientWidth,
    );

    expect(bands).toHaveLength(5);

    for (const { left, right } of bands) {
      expect(left, `at ${width}`).toBe(0);
      expect(right, `at ${width}`).toBe(edge);
    }
  }

  await expect(page.locator("#cascade")).toHaveCSS(
    "background-color",
    "rgb(1, 58, 99)",
  );
  await expect(page.locator("#about")).toHaveCSS(
    "background-color",
    "rgb(143, 216, 220)",
  );
});

test("every screen size and large text fit without sideways scrolling", async ({
  page,
}) => {
  const fits = () =>
    page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    );
  const screens = [
    [240, 320],
    [280, 653],
    [320, 568],
    [568, 320],
    [667, 375],
    [844, 390],
    [768, 1024],
    [1280, 720],
    [2560, 1440],
    [3840, 2160],
  ] as const;

  for (const route of ["/", "/offline/", "/route-that-does-not-exist"]) {
    await page.goto(route);

    for (const [width, height] of screens) {
      await page.setViewportSize({ height, width });
      expect(await fits(), `${route} at ${width}x${height}`).toBe(true);
    }

    // People who set large text in their browser must not lose the layout.
    await page.setViewportSize({ height: 844, width: 390 });
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    expect(await fits(), `${route} with large text`).toBe(true);
  }
});

test("a phone on its side keeps the portrait beside the buttons", async ({
  page,
}) => {
  await page.setViewportSize({ height: 375, width: 667 });
  await page.goto("/");

  const action = await page.locator(".hero-action").boundingBox();
  const portrait = await page.locator(".hero-portrait img").boundingBox();

  if (!action || !portrait) throw new Error("Expected the hero to render.");

  expect(action.y + action.height).toBeLessThanOrEqual(375);
  expect(portrait.x).toBeGreaterThan(action.x + action.width);
});

test("the verify and approval checks finish after the pointer leaves", async ({
  browserName,
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await settleScrolling(page);

  for (const node of ["verify", "approval"]) {
    const link = page.locator(
      `.architecture-node-${node} .architecture-node-link`,
    );
    const check = link.locator("svg.lucide > path").last();
    const playing = () =>
      check.evaluate((part) =>
        part
          .getAnimations()
          .some(
            (animation) =>
              animation instanceof CSSAnimation &&
              animation.playState === "running",
          ),
      );

    await link.hover();
    await expect.poll(playing, node).toBe(true);
    await page.mouse.move(0, 0);

    // Firefox cannot hold the style query, so its check ends with the hover.
    expect(await playing(), node).toBe(browserName !== "firefox");
    await expect(check).toHaveCSS("animation-name", "none");

    await link.hover();
    await expect.poll(playing, node).toBe(true);
    await page.mouse.move(0, 0);
  }

  // Every other icon keeps the standard ease and ends with the hover.
  const mail = page.locator('#contact a[href^="mailto:"]');
  const flap = mail.locator(".lucide-mail > path");

  await mail.hover();
  await expect(flap).toHaveCSS("animation-timing-function", "ease-in-out");
  await page.mouse.move(0, 0);
  expect(
    await flap.evaluate((part) => getComputedStyle(part).animationName),
  ).toBe("none");
});

test("hovering a hero heading rolls a wave through its dots", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await settleScrolling(page);

  const wave = (section: Locator) =>
    section.evaluate((element) => {
      const style = getComputedStyle(element);

      return {
        layers: style.backgroundImage.split("radial-gradient").length - 1,
        reach: Number.parseFloat(style.getPropertyValue("--wave-reach")),
        state: style.animationPlayState,
      };
    });

  for (const heading of ["#introduction-heading", "#cascade-heading"]) {
    const section = page.locator(`section:has(> ${heading})`);

    await section.locator(".speech-bubble").hover();
    expect(await wave(section), heading).toEqual({
      layers: 12,
      reach: 0,
      state: "paused",
    });

    await page.locator(heading).hover();
    await expect.poll(async () => (await wave(section)).state).toBe("running");
    await expect
      .poll(async () => (await wave(section)).reach)
      .toBeGreaterThan(0);

    await page.mouse.move(0, 0);
    await expect.poll(async () => (await wave(section)).state).toBe("paused");
    await expect.poll(async () => (await wave(section)).reach).toBe(0);
  }

  // The site diagram hero keeps still, and reduced motion keeps the plain dots.
  const still = page.locator(".exhibit-hero:not(.dot-wave)");

  await still.locator("h2").hover();
  expect((await wave(still)).layers).toBe(1);

  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await wave(page.locator(".exhibit-hero-portrait"))).toMatchObject({
    layers: 1,
  });
  await expect(page.locator(".exhibit-hero-portrait")).toHaveCSS(
    "animation-name",
    "none",
  );
});

test("the index preserves the typography, color, spacing, and depth contracts", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);

  const presentation = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const body = getComputedStyle(document.body);
    const introduction = document.querySelector<HTMLElement>(".introduction");
    const route = document.querySelector<HTMLElement>(".route-link");
    const label = document.querySelector<HTMLElement>(".route-label");

    if (!introduction || !route || !label) {
      throw new Error("Expected homepage presentation targets.");
    }

    return {
      tokens: {
        interface: root.getPropertyValue("--space-interface").trim(),
        component: root.getPropertyValue("--space-component").trim(),
        editorial: root.getPropertyValue("--space-editorial").trim(),
        section: root.getPropertyValue("--space-section").trim(),
        action: root.getPropertyValue("--color-action").trim(),
        focus: root.getPropertyValue("--color-focus").trim(),
      },
      bodyUsesReadingFont: body.fontFamily.includes("IBM Plex Sans"),
      bodySize: body.fontSize,
      bodyBackground: body.backgroundColor,
      introductionBackground: getComputedStyle(introduction).backgroundColor,
      introductionBorder: getComputedStyle(introduction).borderBlockStartWidth,
      routePadding: getComputedStyle(route).paddingBlockStart,
      routeShadow: getComputedStyle(route).boxShadow,
      labelUsesTechnicalFont:
        getComputedStyle(label).fontFamily.includes("IBM Plex Mono"),
      labelColor: getComputedStyle(label).color,
    };
  });

  expect(presentation).toEqual({
    tokens: {
      interface: ".5rem",
      component: "1rem",
      editorial: "1.5rem",
      section: "3rem",
      action: "#013a63",
      focus: "#007a73",
    },
    bodyUsesReadingFont: true,
    bodySize: "16px",
    bodyBackground: "rgb(223, 243, 244)",
    introductionBackground: "rgb(255, 255, 255)",
    introductionBorder: "4px",
    routePadding: "24px",
    routeShadow: "rgb(143, 216, 220) 4px 4px 0px 0px",
    labelUsesTechnicalFont: true,
    labelColor: "rgb(1, 58, 99)",
  });
});

test("route links preserve pointer, keyboard, reduced-motion, and forced-color states", async ({
  browserName,
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await settleScrolling(page);

  const route = page
    .getByRole("navigation", { name: "Contact options" })
    .getByRole("link", { name: /Email/ });

  await route.hover();
  await expect
    .poll(() => underlineClip(route.getByRole("heading", { name: "Email" })))
    .toBe(underlineDrawn);

  await page.mouse.move(0, 0);
  await route.focus();
  await expect(route).toHaveCSS("outline-style", "solid");
  // Contact sits on navy, where only the aqua focus ring stays visible.
  await expect(route).toHaveCSS("outline-color", "rgb(143, 216, 220)");

  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page
      .locator("a")
      .evaluateAll((links) =>
        links.every(
          (link) =>
            getComputedStyle(link).transitionDuration === "0s" &&
            getComputedStyle(link).animationName === "none",
        ),
      ),
  ).toBe(true);

  test.skip(
    browserName !== "chromium",
    "Forced-colors emulation is Chromium-only.",
  );
  await page.emulateMedia({ forcedColors: "active" });
  await expect(page.locator(".route-label").first()).not.toHaveCSS(
    "color",
    await page.locator("body").evaluate((body) => getComputedStyle(body).color),
  );
});

test("Cascade keeps the complete case study and public evidence", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 2, name: "Cascade" }),
  ).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(
    page.getByRole("list", { name: "Cascade task run lifecycle" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Read the source documentation" }),
  ).toHaveAttribute(
    "href",
    "https://github.com/ahammednibras8/cascade/blob/main/docs/concepts/architecture.mdx",
  );
  await expect(page.locator(".signature-band")).toHaveCount(4);
});

test("Cascade gives its case study and lifecycle room on desktop", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const layout = await page.evaluate(() => {
    const steps = [...document.querySelectorAll(".run-path li")];
    const widest = (selector: string) =>
      Math.max(
        ...[...document.querySelectorAll(selector)].map(
          (element) => element.getBoundingClientRect().width,
        ),
      );

    return {
      stepWidths: steps.map((step) => step.getBoundingClientRect().width),
      stepNames: steps.map(
        (step) => step.querySelector("strong")?.getClientRects().length,
      ),
      article: widest("article"),
    };
  });

  expect(layout.article).toBeGreaterThan(900);
  expect(layout.stepWidths).toHaveLength(5);
  expect(layout.stepWidths.every((width) => width >= 150)).toBe(true);
  await expect(page.locator(".run-path figcaption")).toContainText(
    "runtime path. Read the source documentation",
  );
});

test("every major section hangs its title as an exhibit", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const heroes = await page.locator(".exhibit-hero").evaluateAll((sections) =>
    sections.map((section) => {
      const title = section.querySelector("h1, h2");
      const placard = section.querySelector(".route-placard");

      if (!title || !placard) {
        throw new Error("Expected an exhibit hero with a title and placard.");
      }

      return {
        height: section.getBoundingClientRect().height,
        size: Number.parseFloat(getComputedStyle(title).fontSize),
        titleAbovePlacard:
          title.getBoundingClientRect().bottom <=
          placard.getBoundingClientRect().top,
      };
    }),
  );

  expect(heroes).toHaveLength(3);

  for (const hero of heroes) {
    expect(hero.height).toBeGreaterThanOrEqual(430);
    expect(hero.size).toBe(88);
    expect(hero.titleAbovePlacard).toBe(true);
  }

  await expect(
    page.getByRole("navigation", { name: "Contact options" }).getByRole("link"),
  ).toHaveCount(4);
});

test("the infrastructure and contact sections expose their real content", async ({
  page,
}) => {
  await page.goto("/");
  const buildPath = page.getByRole("list", {
    name: "Build path",
  });
  await expect(buildPath.getByRole("listitem")).toHaveCount(3);
  await expect(buildPath.getByRole("listitem")).toContainText([
    "Protected main",
    "Verify and build",
    "portfolio-dist-<SHA>",
  ]);
  await expect(buildPath.locator(".architecture-relation")).toHaveText([
    "starts",
    "uploads once",
  ]);

  const feedbackPath = page.getByRole("list", {
    name: "Feedback and approval path",
  });
  await expect(feedbackPath.getByRole("listitem")).toContainText([
    "Feedback deploy",
    "Preview verified",
    "Production approval",
  ]);
  await expect(feedbackPath.locator(".architecture-relation")).toHaveText([
    "checks both URLs",
    "allows review",
  ]);

  const productionPath = page.getByRole("list", {
    name: "Production deployment path",
  });
  await expect(productionPath.getByRole("listitem")).toContainText([
    "Production deploy",
    "ahammednibras.com",
  ]);
  await expect(
    page.getByText("Production approval unlocks this job."),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Cloudflare rollback reference" }),
  ).toHaveAttribute(
    "href",
    "https://developers.cloudflare.com/pages/configuration/rollbacks/",
  );
  await expect(
    page.getByText("This diagram describes the system; it is not live"),
  ).toBeVisible();
  await expect(page.locator(".architecture-node-link").first()).toHaveCSS(
    "animation-name",
    "none",
  );

  const contact = page.getByRole("navigation", { name: "Contact options" });

  await expect(
    contact.getByRole("link", { name: "ahammednibras737@gmail.com" }),
  ).toHaveAttribute("href", "mailto:ahammednibras737@gmail.com");
  await expect(contact.getByRole("link", { name: "GitHub" })).toHaveAttribute(
    "href",
    "https://github.com/ahammednibras8",
  );
  await expect(contact.getByRole("link", { name: "LinkedIn" })).toHaveAttribute(
    "href",
    "https://linkedin.com/in/ahammednibras8",
  );
  await expect(contact.getByRole("link", { name: /Discord/ })).toHaveAttribute(
    "href",
    "https://discord.com/users/877244168009830481",
  );
});

test("the complete page works without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
  // The security policy blocks inline scripts, so one would silently never run.
  await expect(page.locator("script:not([src])")).toHaveCount(0);

  const navigation = page.getByRole("navigation", { name: "Primary" });

  await expect(navigation).toBeVisible();
  await navigation.getByRole("link", { name: "Contact" }).click();
  await expect(page).toHaveURL(/#contact$/);
  await expect(
    page.getByRole("navigation", { name: "Contact options" }),
  ).toBeVisible();

  await context.close();
});
