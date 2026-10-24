# 0001: Build a static Astro site

- Status: Accepted
- Date: 2026-09-22
- Updated: 2026-10-23

## Decision

Use Astro with static output and strict TypeScript.

Describe the public identity with HTML microdata in the generated documents. Use a shared profile record for the name, role, location, account identifier, and public links. Keep the WebSite, Person, and ProfilePage scopes distinct, with stable identifiers derived from the configured canonical origin.

## Reason

The portfolio needs reusable pages, checked content, and optimized images. It does not need an application server or database.

Static HTML keeps the site fast, accessible without JavaScript, and easy to move between hosts.

Microdata describes the same identity that visitors can read while preserving the existing no-script content security policy. It does not require a client library, duplicate JSON payload, or crawler-specific version of the page. The About page provides an identity destination while the existing Cascade study remains at its authored homepage destination; a separate project route belongs to the broader navigation work in ADR 0002 rather than a duplicate page created for search.

## Evidence or source

- The current homepage and navigation work as complete HTML.
- The product has no server-only feature or persistent application state.
- The build, HTML validation, browser tests, accessibility tests, and Lighthouse checks run against the generated site.
- Google documents [microdata as a supported structured-data format](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data), [WebSite information for site names](https://developers.google.com/search/docs/appearance/site-names), and [ProfilePage information for an About page](https://developers.google.com/search/docs/appearance/structured-data/profile-page).
- The existing homepage already publishes the name, location, role, project evidence, and GitHub/LinkedIn links used by this identity record. No alternate spelling or new project claim is needed.

## Constraints

- Important content and navigation must remain available without JavaScript.
- Browser JavaScript is added only when HTML and CSS cannot provide the required behavior.
- A client framework, server code, or database requires a replacement decision record.
- Identity markup must match the visible content. Only actual public identifiers belong in alternate names; guessed typing mistakes and other people's profiles do not.

## Where it is used

- `astro.config.mjs` keeps Astro in static-output mode.
- `src/layouts/DocumentLayout.astro` owns the shared document shell and metadata used by route pages.
- `src/pages/` contains the route entry points.
- `src/data/profile.ts` and `src/data/navigation.ts` hold shared identity and navigation data.
- `src/pages/about.astro` describes the same Person as the homepage, using a ProfilePage relationship.
- CI tests the generated `dist/` output that will be deployed.

## Reconsider when

Replace this decision only when an approved product requirement cannot be delivered as a static site. The replacement must account for accessibility, performance, security, deployment, and host portability.

Reconsider the microdata format if required structured-data features cannot be expressed accurately with it, or if maintaining correct scopes becomes harder than another static format. A format change must preserve visible facts, stable identity, HTML validation, and the security policy.
