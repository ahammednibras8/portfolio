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
const settleEase = "cubic-bezier(0.16, 1, 0.3, 1)";
const gestureEase = "cubic-bezier(0.4, 0, 0.2, 1)";
const underlineClip = (element: Locator) =>
  element.evaluate((node) => getComputedStyle(node, "::after").clipPath);

// Hover assertions need the pointer to stay put, so scrolling must settle first.
const settleScrolling = (page: Page) =>
  page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";

    // Hover tests point at resting places, so nothing may still zoom in.
    for (const piece of document.querySelectorAll(".zoom-ready")) {
      piece.classList.remove("zoom-ready");
    }
  });

// Hold finite gestures before assertions can consume their lifetime. The
// controller still owns activation and the finished-promise cleanup.
const freezeGestures = (page: Page) =>
  page.addInitScript(() => {
    new MutationObserver((records) => {
      for (const { target } of records) {
        if (
          !(target instanceof SVGElement) ||
          !target.matches("svg.lucide.icon-active")
        )
          continue;

        for (const animation of target.getAnimations({ subtree: true })) {
          if (
            animation instanceof CSSAnimation &&
            animation.animationName.startsWith("icon-") &&
            (animation.effect as KeyframeEffect | null)?.target?.parentNode ===
              target
          )
            animation.pause();
        }
      }
    }).observe(document, {
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
  });

const finishGesture = async (icon: Locator) => {
  await icon.evaluate(async (element) => {
    const animations = element
      .getAnimations({ subtree: true })
      .filter(
        (animation) =>
          animation instanceof CSSAnimation &&
          animation.animationName.startsWith("icon-") &&
          (animation.effect as KeyframeEffect | null)?.target?.parentNode ===
            element,
      );

    if (!animations.length) throw new Error("Expected an active icon gesture.");
    const finished = animations.map((animation) => animation.finished);
    for (const animation of animations) animation.finish();
    await Promise.all(finished);
  });
  await expect(icon).not.toHaveClass(/\bicon-active\b/);
  expect(
    await icon.evaluate((element: SVGElement) =>
      element.style.getPropertyValue("--icon-arrival-delay"),
    ),
  ).toBe("");
};

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
    "What I work with",
    "About",
    "How this site runs.",
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
  await expect(
    page.locator("#cascade").getByText("TypeScript · PostgreSQL · Redis"),
  ).toBeVisible();
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
      order: [
        "#work",
        "#cascade",
        "#toolbox",
        "#about",
        "#architecture",
        "#contact",
      ].map(top),
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
  // The browser bar matches the navy header that stays on screen.
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    "content",
    "#013a63",
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

test("notes and labels stay still while reading or hovering", async ({
  page,
}) => {
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

  await expect
    .poll(() => read(bubble))
    .toEqual({ animation: "none", scale: "none" });

  await page.locator("#about").evaluate((section) => {
    section.scrollIntoView({ block: "center" });
  });
  await page.mouse.move(0, 0);
  await expect
    .poll(() => read(bubble))
    .toEqual({ animation: "none", scale: "none" });

  await bubble.hover();
  expect(await read(bubble)).toEqual({ animation: "none", scale: "none" });

  await label.hover();
  expect(await read(label)).toEqual({ animation: "none", scale: "none" });

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

  const keyframes = await page.evaluate(() => {
    const collect = (rules: CSSRuleList): CSSKeyframesRule[] =>
      [...rules].flatMap((rule) =>
        rule instanceof CSSKeyframesRule
          ? [rule]
          : rule instanceof CSSGroupingRule
            ? collect(rule.cssRules)
            : [],
      );

    return [...document.styleSheets]
      .flatMap((sheet) => collect(sheet.cssRules))
      .map((rule) =>
        [...rule.cssRules].flatMap((frame) =>
          (frame as CSSKeyframeRule).keyText.split(/,\s*/),
        ),
      );
  });

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

  expect(atRest.property).toBe(
    "background-size, translate, rotate, box-shadow",
  );
  expect(atRest.duration).toBe("0.36s, 0.24s, 0.24s, 0.18s");
  expect(atRest.timing).toBe(
    [gestureEase, ...Array(3).fill(settleEase)].join(", "),
  );

  const title = plate.getByRole("heading", { name: "Email" });

  expect(await underlineClip(title)).toBe(underlineHidden);

  await plate.hover();
  await expect.poll(() => underlineClip(title)).toBe(underlineDrawn);
  await expect(plate).toHaveCSS("translate", "-2px -2px");
  expect((await plateTiming()).timing).toBe(
    [gestureEase, ...Array(3).fill(settleEase)].join(", "),
  );

  await page.mouse.move(0, 0);
  await expect.poll(() => underlineClip(title)).toBe(underlineHidden);
});

test("printing gives a clean three-page document", async ({
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

  // Six projects and a toolbox need three pages, and no heading may be left
  // at the foot of one page with its words on the next.
  expect(pages).toHaveLength(3);

  const breaks = await page.evaluate(() => {
    const heading = document.querySelector("#architecture");

    return heading ? getComputedStyle(heading).breakInside : "missing";
  });

  expect(breaks).toBe("avoid");
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

test("the headline stays solid while its highlight draws once", async ({
  browserName,
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    const holdHighlight = () => {
      const animation = document
        .querySelector(".hero-name")
        ?.getAnimations()
        .find(
          (item) =>
            item instanceof CSSAnimation &&
            item.animationName === "ink-highlight",
        );

      if (animation) animation.pause();
      else requestAnimationFrame(holdHighlight);
    };
    requestAnimationFrame(holdHighlight);
  });
  await page.goto("/");

  const headline = page.getByRole("heading", { level: 1 });
  const highlight = headline.locator(".hero-name");
  const introduction = await highlight.evaluate((element) => {
    const animation = element
      .getAnimations()
      .find(
        (item) =>
          item instanceof CSSAnimation &&
          item.animationName === "ink-highlight",
      );
    if (!animation) throw new Error("Expected the highlight introduction.");
    animation.pause();
    const effect = animation.effect as KeyframeEffect;

    return {
      keyframes: effect.getKeyframes().map((frame) => frame.backgroundSize),
      easing: getComputedStyle(element).animationTimingFunction,
      timing: effect.getTiming(),
    };
  });

  expect(introduction.keyframes).toEqual(["0% 100%", "100% 100%"]);
  expect(introduction.easing).toBe(settleEase);
  expect(introduction.timing).toMatchObject({
    delay: 120,
    duration: 460,
    iterations: 1,
  });

  const style = () =>
    headline.evaluate((element) => {
      const computed = getComputedStyle(element);

      return {
        animation: computed.animationName,
        clip: computed.backgroundClip,
        color: computed.color,
        scale: computed.scale,
        rotate: computed.rotate,
        translate: computed.translate,
      };
    });
  const ended = () =>
    highlight.evaluate((element) =>
      element
        .getAnimations()
        .every(
          (animation) =>
            !(animation instanceof CSSAnimation) ||
            animation.playState === "finished",
        ),
    );

  const ordinaryText = {
    animation: "none",
    clip: "border-box",
    color: "rgb(23, 25, 26)",
    scale: "none",
    rotate: "none",
    translate: "none",
  };

  expect(await style()).toEqual(ordinaryText);

  await highlight.evaluate(async (element) => {
    const animation = element
      .getAnimations()
      .find(
        (item) =>
          item instanceof CSSAnimation &&
          item.animationName === "ink-highlight",
      );
    if (!animation) throw new Error("Expected the held highlight animation.");
    const finished = animation.finished;
    animation.finish();
    await finished;
  });
  expect(await ended()).toBe(true);
  await expect(highlight).toHaveCSS("background-size", "100% 100%");

  await headline.hover();
  expect(await style()).toEqual(ordinaryText);
  expect(await ended()).toBe(true);

  await page.mouse.move(0, 700);
  expect(await style()).toEqual(ordinaryText);

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

test("links stay readable on dark surfaces while hovered, focused, and pressed", async ({
  page,
}) => {
  await page.setViewportSize({ height: 800, width: 1280 });
  await page.emulateMedia({ reducedMotion: "reduce" });

  // Text color against the surface behind it, blending every translucent layer.
  const contrast = (link: Locator) =>
    link.evaluate((anchorElement) => {
      const channel = (value: number) => {
        const unit = value / 255;

        return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
      };
      const light = (rgb: number[]) =>
        0.2126 * channel(rgb[0] ?? 0) +
        0.7152 * channel(rgb[1] ?? 0) +
        0.0722 * channel(rgb[2] ?? 0);
      const parse = (css: string) => {
        const numbers = css.match(/[\d.]+/g)?.map(Number) ?? [];

        return { alpha: numbers[3] ?? 1, rgb: numbers.slice(0, 3) };
      };
      const layers: string[] = [];

      for (
        let node: Element | null = anchorElement;
        node;
        node = node.parentElement
      ) {
        layers.push(getComputedStyle(node).backgroundColor);
      }

      let behind = [255, 255, 255];

      for (const layer of layers.reverse()) {
        const { alpha, rgb } = parse(layer);

        if (alpha === 0) continue;

        behind = rgb.map(
          (value, index) => value * alpha + (behind[index] ?? 0) * (1 - alpha),
        );
      }

      const text = parse(getComputedStyle(anchorElement).color).rgb;
      const [lighter = 0, darker = 0] = [light(text), light(behind)].sort(
        (a, b) => b - a,
      );

      return (lighter + 0.05) / (darker + 0.05);
    });

  for (const route of ["/", "/offline/"]) {
    await page.goto(route);
    await page.evaluate(() => document.fonts.ready);

    const links = [
      ...(await page.locator(".primary-navigation a").all()),
      ...(await page.locator(".hero-actions a, .page .hero-action").all()),
      ...(await page.locator(".site-footer a").all()),
    ];

    for (const link of links) {
      const name = (await link.textContent())?.trim() ?? "";

      await link.scrollIntoViewIfNeeded();

      const box = await link.boundingBox();

      if (!box) continue;

      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      expect(await contrast(link), `${route} ${name} hovered`).toBeGreaterThan(
        4.5,
      );

      await page.mouse.down();
      expect(await contrast(link), `${route} ${name} pressed`).toBeGreaterThan(
        4.5,
      );

      // Let go away from the link, so no click follows.
      await page.mouse.move(2, 790);
      await page.mouse.up();

      await page.keyboard.press("Tab");
      await link.focus();
      expect(await contrast(link), `${route} ${name} focused`).toBeGreaterThan(
        4.5,
      );
    }
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
      projects: bounds("#work .route-link"),
      routes: bounds("#contact .route-link"),
    };
  });

  expect(layout.scrollWidth).toBe(layout.clientWidth);
  expect(layout.navigation).toHaveLength(4);
  expect(new Set(layout.navigation.map(({ top }) => top)).size).toBe(1);
  expect(layout.projects).toHaveLength(6);
  expect(layout.routes).toHaveLength(4);

  for (const item of [
    ...layout.navigation,
    ...layout.projects,
    ...layout.routes,
  ]) {
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
  await expect.poll(transform("#contact .route-link h3")).toBe("none");
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
  await freezeGestures(page);

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

  await expect(hand).toHaveClass(/\bicon-active\b/);
  await expect(hand).toHaveCSS("animation-name", "none");
  await expect(hand.locator("path").first()).toHaveCSS(
    "animation-name",
    "icon-hand-wave",
  );
  await expect(hand.locator("path").first()).toHaveCSS(
    "animation-iteration-count",
    "1",
  );
  await expect(hand.locator("path").first()).toHaveCSS(
    "animation-duration",
    "0.76s",
  );
  await expect(hand.locator("path").first()).toHaveCSS(
    "animation-delay",
    "0.4s",
  );
  await settleScrolling(page);
  await portrait.hover();
  await expect(hand).toHaveCSS("animation-name", "none");
  await page.mouse.move(0, 0);
  await expect(hand.locator("path").first()).toHaveCSS(
    "animation-name",
    "icon-hand-wave",
  );

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(hand).not.toHaveClass(/\bicon-active\b/);
  expect(
    await hand
      .locator("*")
      .evaluateAll((parts) =>
        parts.every((part) => getComputedStyle(part).animationName === "none"),
      ),
  ).toBe(true);
});

test("icon details make one gesture while the SVG and its outline stay still", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await freezeGestures(page);
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

    const icon = page.locator(`main svg.${type}`).first();
    await page.mouse.move(0, 0);
    await icon.hover();
    await expect(icon).toHaveClass(/\bicon-active\b/);
    const state = await icon.evaluate((element) => {
      const milliseconds = (value: string) =>
        parseFloat(value) * (value.trim().endsWith("ms") ? 1 : 1000);
      const gestures = element
        .getAnimations({ subtree: true })
        .filter(
          (animation) =>
            animation instanceof CSSAnimation &&
            animation.animationName.startsWith("icon-") &&
            (animation.effect as KeyframeEffect | null)?.target?.parentNode ===
              element,
        );

      for (const animation of gestures) {
        const timing = (animation.effect as KeyframeEffect).getTiming();
        animation.pause();
        animation.currentTime =
          Number(timing.delay) + Number(timing.duration) / 2;
      }

      return {
        count: gestures.length,
        animation: getComputedStyle(element).animationName,
        transform: getComputedStyle(element).transform,
        arrivalDelay: milliseconds(
          getComputedStyle(element).getPropertyValue("--icon-arrival-delay"),
        ),
        details: [...element.children].map((part) => {
          const style = getComputedStyle(part);

          return {
            animation: style.animationName,
            duration: style.animationDuration,
            delay: Number.parseFloat(style.animationDelay) * 1000,
            partDelay: milliseconds(
              style.getPropertyValue("--icon-part-delay") || "0ms",
            ),
            iterations: style.animationIterationCount,
            timing: style.animationTimingFunction,
          };
        }),
      };
    });

    expect(state.animation, type).toBe("none");
    expect(state.transform, type).toBe("none");
    const moving = state.details.filter((part) => part.animation !== "none");
    expect(moving.length, type).toBeGreaterThan(0);
    expect(state.count, type).toBe(moving.length);
    for (const part of moving) {
      expect(part, type).toMatchObject({
        duration: "0.76s",
        iterations: "1",
        timing: gestureEase,
      });
      expect(part.partDelay, type).toBeGreaterThanOrEqual(0);
      expect(part.partDelay, type).toBeLessThanOrEqual(180);
      expect(part.delay, type).toBeCloseTo(state.arrivalDelay + part.partDelay);
    }
    await finishGesture(icon);
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
    const icon = outline.locator("..");
    await page.mouse.move(0, 0);
    await icon.hover();
    await expect(icon).toHaveClass(/\bicon-active\b/);
    expect(
      await icon.evaluate((element) =>
        element
          .getAnimations({ subtree: true })
          .some(
            (animation) =>
              animation instanceof CSSAnimation &&
              animation.animationName.startsWith("icon-"),
          ),
      ),
      selector,
    ).toBe(true);
    for (const property of [
      "animation-name",
      "transform",
      "scale",
      "rotate",
      "translate",
    ]) {
      await expect(outline, selector).toHaveCSS(property, "none");
    }
    await finishGesture(icon);
  }

  // Keyboard focus triggers the same internal detail, keeping the card legible.
  await page.mouse.move(0, 0);
  const email = page.locator('#contact a[href^="mailto:"]');
  const envelope = email.locator(".lucide-mail");
  await email.scrollIntoViewIfNeeded();
  await expect(envelope).not.toHaveClass(/\bicon-active\b/);
  await page.keyboard.press("Tab");
  await email.focus();
  await expect(email).toHaveCSS("outline-style", "solid");
  await expect(envelope).toHaveClass(/\bicon-active\b/);
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

  test("phone icons greet once and cancel when fully offscreen", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await freezeGestures(page);
    const blocked: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") blocked.push(message.text());
    });
    await page.goto("/");
    await settleScrolling(page);
    await expect(page.locator("html")).not.toHaveClass(/is-touch/);
    await expect(page.locator(".exhibit-hero-portrait")).toHaveCSS(
      "animation-name",
      "none",
    );
    const arrow = page.locator(".hero-contact .action-arrow");
    const flap = page.locator("#contact .lucide-mail > path");
    const envelope = flap.locator("..");
    await expect(arrow).not.toHaveClass(/\bicon-active\b/);
    await expect(arrow.locator("path").first()).toHaveCSS(
      "animation-name",
      "none",
    );
    await expect(flap).toHaveCSS("animation-name", "none");
    await flap.scrollIntoViewIfNeeded();
    await expect(envelope).toHaveClass(/\bicon-active\b/);
    await expect(flap).toHaveCSS("animation-name", "icon-mail-flap");
    await expect(flap).toHaveCSS("animation-duration", "0.62s");
    await expect(flap).toHaveCSS("animation-iteration-count", "1");
    await expect(envelope).toHaveCSS("animation-name", "none");
    await finishGesture(envelope);
    await expect(flap).toHaveCSS("animation-name", "none");
    await page
      .locator("#intro")
      .evaluate((element) => element.scrollIntoView({ behavior: "instant" }));
    await expect(envelope).not.toBeInViewport();
    await flap.scrollIntoViewIfNeeded();
    await expect(envelope).toBeInViewport();
    // Let the observer deliver reentry before checking that the greeting is spent.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    await expect(envelope).not.toHaveClass(/\bicon-active\b/);
    await expect(flap).toHaveCSS("animation-name", "none");

    await page
      .locator('#contact a[href^="mailto:"]')
      .dispatchEvent("pointerdown", {
        pointerType: "touch",
        button: 0,
      });
    await expect(envelope).toHaveClass(/\bicon-active\b/);
    await page
      .locator("#intro")
      .evaluate((element) => element.scrollIntoView({ behavior: "instant" }));
    await expect(envelope).not.toBeInViewport();
    await expect(envelope).not.toHaveClass(/\bicon-active\b/);
    await expect(flap).toHaveCSS("animation-name", "none");
    expect(blocked).toEqual([]);
  });

  test("a phone that claims it can hover still starts on the first touch", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await freezeGestures(page);
    await page.addInitScript(() => {
      const realMatchMedia = window.matchMedia.bind(window);

      window.matchMedia = (query) => {
        const result = realMatchMedia(query);
        if (
          query === "(hover: hover)" ||
          query === "(hover: hover) and (pointer: fine)"
        )
          Object.defineProperty(result, "matches", { value: true });
        return result;
      };
      // Observe the real tap after the document's handlers, before its native
      // hash navigation moves the arrow offscreen and cancels the gesture.
      window.addEventListener("pointerdown", (event) => {
        if (!(event.target instanceof Element) || event.pointerType !== "touch")
          return;
        const link = event.target.closest(".hero-cta");
        if (!link) return;
        document.documentElement.dataset.touchGesture = String(
          link.querySelector("svg")?.classList.contains("icon-active"),
        );
        document.documentElement.dataset.touchPrevented = String(
          event.defaultPrevented,
        );
      });
    });
    await page.goto("/");
    await settleScrolling(page);

    await expect(page.locator("html")).not.toHaveClass(/is-touch/);
    await page.getByRole("link", { name: "See my work" }).tap();
    await expect(page).toHaveURL(/#work$/);
    await expect(page.locator("#work-heading")).toBeInViewport();
    await expect(page.locator("html")).toHaveAttribute(
      "data-touch-gesture",
      "true",
    );
    await expect(page.locator("html")).toHaveAttribute(
      "data-touch-prevented",
      "false",
    );
    await expect(page.locator("html")).not.toHaveClass(/is-touch/);
    await expect(page.locator(".exhibit-hero-portrait")).toHaveCSS(
      "animation-name",
      "none",
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

  test("taps navigate without vibration or portrait tilt", async ({ page }) => {
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

    await tiltPhone(page);
    expect(await portraitLean(page)).toBe("none");

    await page.getByRole("link", { name: "See my work" }).tap();
    await expect(page).toHaveURL(/#work$/);
    await expect(page.locator("#work-heading")).toBeInViewport();
    await expect(page.locator("html")).not.toHaveAttribute("data-buzzed");
    await tiltPhone(page);
    expect(await portraitLean(page)).toBe("none");
  });

  test("a portrait tap never requests sensor permission", async ({ page }) => {
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
    await expect(page.locator("html")).not.toHaveAttribute("data-asked");
    await tiltPhone(page);
    expect(await portraitLean(page)).toBe("none");
  });

  test("reduced motion keeps the page still", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await settleScrolling(page);
    await tiltPhone(page);
    expect(await portraitLean(page)).toBe("none");
    await page.getByRole("link", { name: "Get in touch" }).tap();
    await expect(page).toHaveURL(/#contact$/);
    await expect(page.locator("#contact-heading")).toBeInViewport();

    expect(
      await page
        .locator("main svg.lucide > *")
        .evaluateAll((parts) =>
          parts.every(
            (part) => getComputedStyle(part).animationName === "none",
          ),
        ),
    ).toBe(true);
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
  // Parts below the fold start slightly scaled, so measure them at rest.
  await page.emulateMedia({ reducedMotion: "reduce" });

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

test("hero headings keep their halftone backgrounds still", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await settleScrolling(page);

  const background = (section: Locator) =>
    section.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        animation: style.animationName,
        layers: style.backgroundImage.split("radial-gradient").length - 1,
        position: style.backgroundPosition,
        scale: style.scale,
      };
    });

  for (const heading of [
    "#introduction-heading",
    "#cascade-heading",
    "#architecture-heading",
  ]) {
    const section = page.locator(`section:has(> ${heading})`);

    await section.locator(".speech-bubble").hover();
    const resting = await background(section);
    expect(resting, heading).toMatchObject({
      animation: "none",
      layers: 1,
      scale: "none",
    });

    await page.locator(heading).hover();
    expect(await background(section)).toEqual(resting);

    await page.mouse.move(0, 0);
    expect(await background(section)).toEqual(resting);
  }

  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await background(page.locator(".exhibit-hero-portrait")),
  ).toMatchObject({
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
    const route = document.querySelector<HTMLElement>("#contact .route-link");
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

test("the work section shows every project with a working link", async ({
  page,
}) => {
  await page.goto("/");

  const cards = page
    .getByRole("navigation", { name: "Projects" })
    .getByRole("link");

  await expect(cards).toHaveCount(6);

  const projects = await cards.evaluateAll((links) =>
    links.map((link) => ({
      href: link.getAttribute("href"),
      name: link.querySelector("h3")?.textContent?.trim(),
      summary: link.querySelector("p")?.textContent?.trim() ?? "",
      stack: link.querySelector(".project-stack")?.textContent?.trim() ?? "",
    })),
  );

  expect(projects.map(({ name }) => name)).toEqual([
    "Cascade",
    "Rivet",
    "Secure MCP Database Bridge",
    "llama.cpp inference server",
    "Organic KV",
    "Apple Music Discord Bridge",
  ]);

  // Cascade opens its case study on this page. The rest open their repository.
  expect(projects[0]?.href).toBe("#cascade");

  for (const { href, stack, summary } of projects.slice(1)) {
    expect(href).toMatch(/^https:\/\/github\.com\/ahammednibras8\/[\w.-]+$/);
    expect(summary.length).toBeGreaterThan(40);
    expect(stack).not.toBe("");
  }

  expect(new Set(projects.map(({ href }) => href)).size).toBe(6);

  // Boasts are the project's own words, and the site does not repeat them.
  const text = projects.map(({ summary }) => summary).join(" ");

  expect(text).not.toMatch(/high-performance|ultra-lightweight|blazing/i);
});

test("the toolbox is plain text rows, not logos or meters", async ({
  page,
}) => {
  await page.goto("/");

  const rows = page.locator("#toolbox dl > div");

  await expect(rows).toHaveCount(5);
  expect(await rows.locator("dt").allTextContents()).toEqual([
    "Languages",
    "AI",
    "Backend",
    "Cloud and infrastructure",
    "Testing",
  ]);
  await expect(page.locator("#toolbox img, #toolbox svg.lucide")).toHaveCount(
    1,
  );
  await expect(
    page.locator("#toolbox [role='progressbar'], #toolbox meter"),
  ).toHaveCount(0);
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
  await expect(page.locator(".signature-band")).toHaveCount(5);
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
  const context = await browser.newContext({
    javaScriptEnabled: false,
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  const iconsAreStill = () =>
    page
      .locator("main svg.lucide, main svg.lucide > *")
      .evaluateAll(
        (parts) =>
          parts.length > 0 &&
          parts.every(
            (part) => getComputedStyle(part).animationName === "none",
          ),
      );

  await page.goto("/");
  // Keep hover sampling independent of a long native anchor scroll.
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
  });
  await expect(page.locator("h1")).toBeVisible();
  // The security policy blocks inline scripts, so one would silently never run.
  await expect(page.locator("script:not([src])")).toHaveCount(0);
  expect(await iconsAreStill()).toBe(true);
  await expect(page.locator("main .icon-active")).toHaveCount(0);

  const navigation = page.getByRole("navigation", { name: "Primary" });

  await expect(navigation).toBeVisible();
  await navigation.getByRole("link", { name: "Contact" }).click();
  await expect(page).toHaveURL(/#contact$/);
  await expect(
    page.getByRole("navigation", { name: "Contact options" }),
  ).toBeVisible();

  const email = page.locator('#contact a[href^="mailto:"]');
  const envelope = email.locator(".lucide-mail");
  await email.hover();
  await expect(envelope).toHaveCSS("scale", "1.06");
  await expect(envelope).toHaveCSS("rotate", "0deg");
  expect(await iconsAreStill()).toBe(true);

  await page.mouse.move(0, 0);
  await page.keyboard.press("Tab");
  await email.focus();
  await expect(email).toHaveCSS("outline-style", "solid");
  await expect(envelope).toHaveCSS("scale", "1.06");
  expect(await iconsAreStill()).toBe(true);

  await context.close();
});
