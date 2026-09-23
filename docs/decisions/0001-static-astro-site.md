# 0001: Build a static Astro site

- Status: Accepted
- Date: 2026-09-22

## Context

The portfolio must deliver useful content before JavaScript runs, remain crawlable and accessible, keep recurring infrastructure near zero, and make its build output portable between ordinary static hosts. The project needs reusable presentation, typed content, image optimization, and strong automated validation, but it does not need application state or a production server.

## Decision

Use Astro in static-output mode with strict TypeScript. Render primary content, navigation, and metadata during the build. Ship no client JavaScript by default.

Use an Astro island only when a documented user requirement cannot be met with semantic HTML, CSS, and a small framework-free DOM module. Such a change must include measurements, an accessibility plan, and a superseding or additional decision record.

Production consumes the portable `dist/` artifact. Hosting automation and provider configuration are deferred until real pages exist and the deployment path can be tested end to end.

## Consequences

- Pages remain useful without JavaScript and can be inspected as HTML.
- Content and component changes are validated at build time.
- There is no application server, database, session state, or server-rendering adapter to operate.
- Application-style interactions may require a later architecture review.
- Changing rendering mode, adding a client UI runtime, or introducing a runtime service requires a new decision record that explains the need and migration impact.
