# Ahammed Nibras — Portfolio

This repository contains my personal engineering portfolio. It explains what I built, what I owned, the decisions I made, and the evidence behind the work.

Current version: `v0.2.1`.

Production: [ahammednibras.com](https://ahammednibras.com/)

## How the site works

- [Astro](https://docs.astro.build/) builds the site as static HTML.
- A typed document layout owns shared metadata, local fonts, and the name/location footer.
- Shared profile and experience data keep the published name, role, location, and public links consistent.
- The homepage includes Person and WebSite microdata in static HTML.
- Important content and navigation work without JavaScript. A small same-origin script adds a copy icon beside the selectable email address where supported. Write in Gmail and Open email app remain ordinary links without JavaScript.
- Main-content links request a new tab with `noopener noreferrer` and advance hints. Footer navigation opens in the current tab. Native email handling remains browser-dependent.
- Copy success uses a brief tooltip and icon-only color flash on a transparent background, with a polite live announcement; failure keeps visible manual-copy guidance. A single optional touch vibration is requested on supporting browsers, never relied on for feedback.
- There is no application server, database, or client framework.
- GitHub/LinkedIn marks and the regular copy icon use [Font Awesome Free 7.3.1](https://github.com/FortAwesome/Font-Awesome/tree/7.3.1/svgs) by Fonticons, Inc., under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Source SVGs retain their attribution; the site sizes and colors them with CSS.
- Images are optimized during the build.
- GitHub Actions builds and tests the site after a change reaches `main`.
- Workflow action commits, including transitive actions, are recorded in `.github/workflows/actions.lock`. Pull-request CI verifies the lockfile before running the site checks.
- The same tested `dist/` directory is uploaded to Cloudflare Pages with the repository's pinned Wrangler version.
- Cloudflare serves static files only. The site has no Pages Functions, Worker, database, or storage service.

The main decisions are recorded in [ADR 0001](docs/decisions/0001-static-astro-site.md), [ADR 0002](docs/decisions/0002-personal-design-direction.md), [ADR 0003](docs/decisions/0003-cloudflare-pages-deployment.md), and [ADR 0004](docs/decisions/0004-workflow-dependency-lockfile.md).

## Analytics

An optional Umami Cloud Hobby integration measures homepage pageviews,
exposure to the Experience and Contact headings, activations of profile and
employer links, and three contact signals:
`contact_gmail_clicked`, `contact_email_app_clicked`, and `contact_email_copied`.
A copy signal requires a successful clipboard write. Use the contact signals
to measure intent and keep confirmed inquiries in separate private records.

Analytics requires `PUBLIC_ANALYTICS_ENABLED=true` at build time and an opted-in
page on `https://ahammednibras.com`. The homepage opts in through the shared
layout's `trackPage` prop. The production rollout is recorded in
[ADR 0005](docs/decisions/0005-hosted-portfolio-analytics.md). The privacy page
shows the setting built into the active deployment.

GitHub builds read the repository Actions variable
`PUBLIC_ANALYTICS_ENABLED`, defaulting to `false` when unset.
Changing this variable takes effect on the next build and deployment.

Event payloads include the page path and title, browser language, screen size,
and approved campaign labels. The tracker drops other query parameters,
fragments, custom identities, and free text.
External HTTPS referrers are reduced to their origin. Contact controls remain
usable when analytics is unavailable.

Visit `/privacy/` and check **Exclude this browser from analytics** to save
an exclusion for that browser profile and origin. Uncheck it to remove the
exclusion. Open privacy tabs synchronize the preference automatically.

Clearing site data resets the preference. It does not delete events already
sent. Analytics stays off when browser storage cannot be read, and does not
run without JavaScript.

See [analytics verification](CONTRIBUTING.md#verify-analytics) for contributor
testing, debugging, and rollout instructions.

Use the [campaign link CLI](CONTRIBUTING.md#create-campaign-links) to register
and generate links for profiles, events, and applications.

## Finding the work

- The [homepage](https://ahammednibras.com/) introduces Nibras with public profiles, experience, and contact options. The footer keeps plain identity text and a Privacy link. The `/privacy/` page explains analytics and provides a browser-specific exclusion control, with Home in its footer.
- The former About route is removed and returns the authored 404 page with Home and contact recovery links.
- Follow the [search discovery runbook](docs/search-discovery.md) for profile links, Search Console, crawler access, and spelling-aware measurement after deployment.

## Deployment

- Pull requests run the quality checks but do not create public preview deployments.
- A push to `main` runs the full verification suite and stores the exact build as a short-lived artifact. After the feedback deployment passes its smoke test, that same artifact is automatically uploaded to the `ahammed-nibras` Pages project. There is no separate production approval step.
- Each deployment is identified by its Git commit SHA. Deploying a change does not require a version bump, tag, or GitHub release; named releases remain manually chosen milestones.
- The production smoke test checks the homepage against the verified artifact, retrying HTTP failures and content mismatches up to six times. It fails if production never serves the expected bytes.
- Cloudflare keeps each successful production deployment. Follow the [production rollback runbook](docs/production-rollback.md) when a release must be reverted.
- The canonical public address is `ahammednibras.com`. The production `pages.dev` hostname redirects to it while immutable preview deployments remain available.
- The weekly audit links to available browser reports in its GitHub Actions summary and its Discord notification. The full audit archive is available for 14 days.

## Run it locally

Use Node.js 24.21.0 and pnpm 12.5.1.

```sh
pnpm install --frozen-lockfile
cp .env.example .env
pnpm run dev
```

Set `SITE_URL` in `.env` to a valid HTTPS URL. Never commit `.env`.

## Main commands

| Task                | Command            |
| ------------------- | ------------------ |
| Start development   | `pnpm run dev`     |
| Build the site      | `pnpm run build`   |
| Preview the build   | `pnpm run preview` |
| Format files        | `pnpm run format`  |
| Run linters         | `pnpm run lint`    |
| Check Astro and TS  | `pnpm run check`   |
| Run all local gates | `pnpm run verify`  |

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and pull-request details.

## Design tooling

The repository includes [Impeccable skill 4.9.1](.agents/skills/impeccable/SKILL.md)
and the portable Codex hooks in `.codex/hooks.json`. Its launcher pins engine
0.1.24 and verifies downloads against the included checksums. A first run may
download the engine into the user's cache; platform binaries, local settings,
and generated reports are not committed. This development tooling is not part
of the site's browser payload.

## Content rules

Project stories must clearly separate my work from team work. Claims need a source when possible. Private or unapproved details stay private.

- [Case-study template](docs/content/case-study-template.md)
- [Writing guide](docs/content/writing-voice.md)
- [Evidence and privacy checklist](docs/content/evidence-and-disclosure.md)

## Security and license

Please report security problems privately. See [SECURITY.md](SECURITY.md).

The portfolio code and documentation are available under the [MIT License](LICENSE).
The vendored Impeccable distribution retains its [Apache 2.0 license](.agents/skills/impeccable/LICENSE)
and [upstream attribution](.agents/skills/impeccable/UPSTREAM.txt). Its bundled
modern-screenshot helper retains its [MIT license](.agents/skills/impeccable/scripts/LICENSE-modern-screenshot).
