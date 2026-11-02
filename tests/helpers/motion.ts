import type { Page } from "@playwright/test";

// Pause in the served stylesheet, before first paint. DOMContentLoaded can
// arrive after a short CSS entrance has finished on a busy browser worker.
// Only the clock changes: production keyframes, timing, and cleanup stay intact.
export const freezeCssMotion = (page: Page, selector: string) =>
  page.route("**/_astro/*.css", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: `${await response.text()}\n${selector} { animation-play-state: paused !important; }`,
    });
  });

export const freezeHero = (page: Page) =>
  freezeCssMotion(
    page,
    "#intro > .hero-portrait, #intro > .speech-bubble, .hero-name",
  );
