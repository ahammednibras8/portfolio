# Ahammed Nibras — Portfolio

This repository contains the source code for my personal engineering portfolio.

The site will show:

- the problems I worked on;
- what I personally owned;
- the choices and trade-offs I made;
- the results I can support with real evidence.

The project is still being built. The development setup and quality checks are ready. The public pages and project stories come next.

## Design direction

I want the site to feel like a clear conversation about my work.

- Technical, but not dressed up like a fake terminal.
- Precise, but not cold.
- Experimental, but still reliable.
- Full of evidence, but easy to scan.
- Quiet, but not empty.

Every major design choice must support at least one of these goals.

The design process is simple:

1. Start with a real need or piece of evidence.
2. Use references that mean something to me.
3. Write down the limits the design must respect.
4. Turn those inputs into a rule made for this site.
5. Review the result with people.

AI can help find problems, compare options, and test the work. It does not choose the site's personality or invent personal details.

The full rule is recorded in [ADR 0002](docs/decisions/0002-personal-design-direction.md).

## How the site works

- [Astro](https://docs.astro.build/) builds the site as static HTML.
- Important content and navigation work without JavaScript.
- There is no application server, database, or client framework.
- Images are optimized during the build.
- The finished `dist/` folder can be hosted by any normal static host.
- Cloudflare Pages is the planned host, but deployment will be added only after real pages exist.

The architecture decision is recorded in [ADR 0001](docs/decisions/0001-static-astro-site.md).

## Run it locally

Use Node.js 24.21.0 and pnpm 12.5.1.

```sh
pnpm install --frozen-lockfile
cp .env.example .env
pnpm run dev
```

Set `SITE_URL` in `.env` to a valid HTTPS URL. Never commit `.env`.

## Main commands

| Task                | Command              |
| ------------------- | -------------------- |
| Start development   | `pnpm run dev`       |
| Build the site      | `pnpm run build`     |
| Preview the build   | `pnpm run preview`   |
| Format files        | `pnpm run format`    |
| Run linters         | `pnpm run lint`      |
| Check Astro and TS  | `pnpm run check`     |
| Run browser tests   | `pnpm run test:e2e`  |
| Run a11y tests      | `pnpm run test:a11y` |
| Run all local gates | `pnpm run verify`    |

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and pull-request details.

## Where things belong

Directories are added only when they have a real file. Empty folders are not kept with `.gitkeep`.

| Path                    | Purpose                                      |
| ----------------------- | -------------------------------------------- |
| `src/pages/`            | Routes                                       |
| `src/layouts/`          | Shared page shells and metadata              |
| `src/components/`       | Reusable presentation                        |
| `src/data/`             | Shared profile, navigation, and social data  |
| `src/content/projects/` | Case studies                                 |
| `src/content/writing/`  | Published articles                           |
| `src/assets/`           | Images and diagrams processed by Astro       |
| `public/`               | Files that must keep their exact public name |
| `tests/e2e/`            | Browser behavior                             |
| `tests/accessibility/`  | Automated accessibility checks               |
| `docs/`                 | Decisions, content rules, and research       |

## Content rules

Project stories must clearly separate my work from team work. Claims need a source when possible. Private or unapproved details stay private.

- [Case-study template](docs/content/case-study-template.md)
- [Writing guide](docs/content/writing-voice.md)
- [Evidence and privacy checklist](docs/content/evidence-and-disclosure.md)

## Project notes

- [Static-site decision](docs/decisions/0001-static-astro-site.md)
- [Design-direction decision](docs/decisions/0002-personal-design-direction.md)
- [Platform research](docs/research/2026-09-22-platform-baseline.md)
- [Instructions for coding agents](AGENTS.md)

## Security and license

Please report security problems privately. See [SECURITY.md](SECURITY.md).

The code and documentation are available under the [MIT License](LICENSE).
