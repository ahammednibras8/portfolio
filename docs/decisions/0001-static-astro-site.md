# 0001: Build a static Astro site

- Status: Accepted
- Date: 2026-09-22

## Decision

Use Astro with static output and strict TypeScript.

## Reason

The portfolio needs reusable pages, checked content, and optimized images. It does not need an application server or database.

Static HTML keeps the site fast, accessible without JavaScript, and easy to move between hosts.

## Evidence or source

- The current homepage and navigation work as complete HTML.
- The product has no server-only feature or persistent application state.
- The build, HTML validation, browser tests, accessibility tests, and Lighthouse checks run against the generated site.

## Constraints

- Important content and navigation must remain available without JavaScript.
- Browser JavaScript is added only when HTML and CSS cannot provide the required behavior.
- A client framework, server code, or database requires a replacement decision record.

## Where it is used

- `astro.config.mjs` keeps Astro in static-output mode.
- `src/pages/` contains the route entry points.
- CI tests the generated `dist/` output that will be deployed.

## Reconsider when

Replace this decision only when an approved product requirement cannot be delivered as a static site. The replacement must account for accessibility, performance, security, deployment, and host portability.
