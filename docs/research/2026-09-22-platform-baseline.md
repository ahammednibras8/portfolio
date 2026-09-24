# Platform research — 2026-09-22

These notes explain why the project started with its current tools.

Package support, browser behavior, prices, and provider rules can change. Check the links again when they affect a new decision.

## What we found

- Astro can build complete HTML with little or no browser JavaScript.
- Local work and CI use Node.js 24.21.0 and pnpm 12.5.1.
- Production serves the built `dist/` folder and does not run Node.js.
- No Cloudflare adapter is needed for a static site.
- Cloudflare Pages is the planned host. Deployment waits until real pages exist.
- Chromium runs on every pull request. Firefox and WebKit run in the weekly audit.
- Automated checks help find problems, but they do not replace manual keyboard, zoom, screen-reader, or content review.
- Important content and navigation must be present in the HTML.

## Sources

- [Astro architecture](https://docs.astro.build/en/concepts/why-astro/)
- [Astro content collections](https://docs.astro.build/en/guides/content-collections/)
- [Node.js release schedule](https://nodejs.org/en/about/previous-releases)
- [pnpm design](https://pnpm.io/motivation)
- [Playwright accessibility guidance](https://playwright.dev/docs/accessibility-testing)
- [Cloudflare Pages Direct Upload](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/)
- [Google JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)

## Check the sources again when

- the Node.js version nears end of support;
- a main tool gets a major update;
- deployment is added;
- hosting prices or limits change;
- someone proposes a client framework, outside script, server function, database, analytics tool, or form service;
- browser support or performance limits change.
