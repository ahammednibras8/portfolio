# Ahammed Nibras — Portfolio

This repository contains my personal engineering portfolio. It explains what I built, what I owned, the decisions I made, and the evidence behind the work.

Current version: `v0.2.1`.

Production: [ahammednibras.com](https://ahammednibras.com/)

## How the site works

- [Astro](https://docs.astro.build/) builds the site as static HTML.
- A typed document layout owns shared metadata, local fonts, and the name/location footer.
- Shared profile and experience data keep the published name, role, location, and public links consistent.
- The homepage includes Person and WebSite microdata. The About page describes the same person through ProfilePage microdata, using static HTML.
- Important content and navigation work without JavaScript. A small same-origin script adds a copy icon beside the selectable email address where supported. Write in Gmail and Open email app remain ordinary links without JavaScript.
- Site links request a new tab with `noopener noreferrer` and advance hints. Native email handling remains browser-dependent.
- Copy success uses a brief tooltip and icon-only color flash on a transparent background, with a polite live announcement; failure keeps visible manual-copy guidance. A single optional touch vibration is requested on supporting browsers, never relied on for feedback.
- There is no application server, database, or client framework.
- GitHub/LinkedIn marks and the regular copy icon use [Font Awesome Free 7.3.1](https://github.com/FortAwesome/Font-Awesome/tree/7.3.1/svgs) by Fonticons, Inc., under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Source SVGs retain their attribution; the site sizes and colors them with CSS.
- Images are optimized during the build.
- GitHub Actions builds and tests the site after a change reaches `main`.
- Workflow action commits, including transitive actions, are recorded in `.github/workflows/actions.lock`. Pull-request CI verifies the lockfile before running the site checks.
- The same tested `dist/` directory is uploaded to Cloudflare Pages with the repository's pinned Wrangler version.
- Cloudflare serves static files only. The site has no Pages Functions, Worker, database, or storage service.

The main decisions are recorded in [ADR 0001](docs/decisions/0001-static-astro-site.md), [ADR 0002](docs/decisions/0002-personal-design-direction.md), [ADR 0003](docs/decisions/0003-cloudflare-pages-deployment.md), and [ADR 0004](docs/decisions/0004-workflow-dependency-lockfile.md).

## Finding the work

- The [homepage](https://ahammednibras.com/) introduces Nibras and provides contact details.
- [About](https://ahammednibras.com/about/) adds the approach to work and links back home. Both pages retain public profiles, experience, and contact options. The footer keeps plain identity text without navigation links; the homepage has no About link under the current approved scope.
- Follow the [search discovery runbook](docs/search-discovery.md) for profile links, Search Console, crawler access, and spelling-aware measurement after deployment.

## Deployment

- Pull requests run the quality checks but do not create public preview deployments.
- A push to `main` runs the full verification suite and stores the exact build as a short-lived artifact. After the feedback deployment passes its smoke test, production requires manual approval before that same artifact is uploaded to the `ahammed-nibras` Pages project.
- The production smoke test checks the homepage against the verified artifact, retrying HTTP failures and content mismatches up to six times. It fails if production never serves the expected bytes.
- Cloudflare keeps each successful production deployment. Follow the [production rollback runbook](docs/production-rollback.md) when a release must be reverted.
- The canonical public address is `ahammednibras.com`. The production `pages.dev` hostname redirects to it while immutable preview deployments remain available.

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
