# Platform baseline — 2026-09-22

This record captures the platform findings used to define the initial repository. It is a dated input, not a permanent claim about provider pricing, browser behavior, or package support.

## Findings

- Astro's static-output model matches the requirement for complete build-time HTML and minimal browser JavaScript.
- Node.js 24.21.0 and pnpm 12.5.1 are pinned for local and CI reproducibility. Production remains a static artifact and does not run Node.js.
- The built `dist/` directory is the portability boundary. No provider-specific runtime adapter is installed.
- Cloudflare Pages Direct Upload is the planned host path, but deployment automation and project creation are intentionally deferred until real pages can be tested.
- Chromium is the pull-request and `main` browser gate. Firefox and WebKit provide cross-browser coverage during scheduled and manually dispatched audits.
- Automated axe scans, HTML validation, link checking, and Lighthouse budgets are complementary checks; none replaces keyboard, zoom, screen-reader, or content review by a person.
- Primary content must be present in semantic HTML. JavaScript may enhance a justified interaction but may not be the only path to content or navigation.

## Sources

- [Astro architecture](https://docs.astro.build/en/concepts/why-astro/)
- [Astro content collections](https://docs.astro.build/en/guides/content-collections/)
- [Node.js release schedule](https://nodejs.org/en/about/previous-releases)
- [pnpm design](https://pnpm.io/motivation)
- [Playwright accessibility guidance](https://playwright.dev/docs/accessibility-testing)
- [Cloudflare Pages Direct Upload](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/)
- [Google JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)

## Revalidation triggers

Recheck the relevant primary sources when:

- the pinned Node.js major approaches end of support;
- Astro, pnpm, Playwright, or a quality tool receives a major update;
- the first production deployment is implemented;
- provider pricing, limits, or terms affect the zero-bill target;
- a client runtime, external script, server function, database, analytics tool, or form processor is proposed;
- browser support or performance budgets change.
