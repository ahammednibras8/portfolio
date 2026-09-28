# Ahammed Nibras — Portfolio

This repository contains my personal engineering portfolio. It explains what I built, what I owned, the decisions I made, and the evidence behind the work.

Current version: `v0.1.0-rc.2`. It is ready for a controlled friends preview, not a finished portfolio. It currently contains one case study; visual refinement and production deployment are still in progress.

## How the site works

- [Astro](https://docs.astro.build/) builds the site as static HTML.
- A typed document layout owns shared metadata, fonts, navigation, and the footer.
- Important content and navigation work without JavaScript.
- There is no application server, database, or client framework.
- Images are optimized during the build.
- The finished `dist/` folder can be hosted by any normal static host.
- Cloudflare Pages is the planned host. Deployment automation has not been enabled yet.

The main decisions are recorded in [ADR 0001](docs/decisions/0001-static-astro-site.md) and [ADR 0002](docs/decisions/0002-personal-design-direction.md).

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

## Content rules

Project stories must clearly separate my work from team work. Claims need a source when possible. Private or unapproved details stay private.

- [Case-study template](docs/content/case-study-template.md)
- [Writing guide](docs/content/writing-voice.md)
- [Evidence and privacy checklist](docs/content/evidence-and-disclosure.md)

## Security and license

Please report security problems privately. See [SECURITY.md](SECURITY.md).

The code and documentation are available under the [MIT License](LICENSE).
