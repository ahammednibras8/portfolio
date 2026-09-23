# Repository instructions for agents

These instructions apply to the entire repository. Read the relevant source, tests, configuration, and recent history before changing anything.

## Architecture boundaries

- Astro must keep `output: "static"`. Do not add an SSR adapter, Pages Functions, an application server, a database, or a runtime dependency without an accepted architecture decision record.
- Primary content, navigation, metadata, and recovery paths must exist in the built HTML. Do not make them depend on hydration, browser-only fetching, a client router, `canvas`, or CSS-generated content.
- React, Vue, Svelte, and other client UI runtimes are not part of the initial build. Prefer semantic HTML, Astro components, and CSS. Any exception needs a measured user requirement and a decision record.
- Route files belong in `src/pages/`; reusable presentation belongs in `src/components/`; shared structured data belongs in `src/data/`; document shells belong in `src/layouts/`.
- Case studies belong in `src/content/projects/`. Writing belongs in `src/content/writing/` only when publishable material exists.
- Import optimizable images and diagrams from `src/assets/`. Put a file in `public/` only when its exact public name must be preserved or it must bypass Astro's asset pipeline.
- Create directories when their first real file is added. Do not add placeholder directories, `.gitkeep` files, speculative helpers, or unused abstractions.

## Approved commands

Use Node.js 24.21.0 and pnpm 12.5.1.

| Purpose                          | Command                          |
| -------------------------------- | -------------------------------- |
| Deterministic install            | `pnpm install --frozen-lockfile` |
| Development server               | `pnpm exec astro dev`            |
| Formatting                       | `pnpm run format`                |
| Formatting check                 | `pnpm run format:check`          |
| Linters and spelling             | `pnpm run lint`                  |
| Astro and TypeScript diagnostics | `pnpm run check`                 |
| Combined static quality checks   | `pnpm run quality`               |
| Static production build          | `pnpm run build`                 |
| Chromium browser checks          | `pnpm run test:browser:chromium` |
| All configured browsers          | `pnpm run test:browser`          |
| Lighthouse CI                    | `pnpm run test:performance`      |

Commands that load Astro configuration require `SITE_URL`. For local work, copy `.env.example` to the ignored `.env` file and use a valid HTTPS origin.

## Protected files and data

- Never print, commit, or place secrets in generated output. `.env`, `.dev.vars`, credentials, private client data, and unpublished evidence stay outside Git.
- Change `pnpm-lock.yaml` only through pnpm. Keep dependencies exact and preserve the approved-build list in `pnpm-workspace.yaml`.
- Keep third-party GitHub Actions pinned to complete commit SHAs. Workflow permissions remain read-only unless a specific job requires a narrower documented exception.
- Treat `README.md` as the product and architecture contract. An architectural change must update it and add or supersede a record in `docs/decisions/` in the same pull request.
- Do not weaken accessibility, security, link, HTML, or performance gates to make a failure disappear. Identify the product or test defect.
- Do not publish a name, logo, quotation, screenshot, metric, customer detail, or internal architecture without permission recorded in the content review.

## Change discipline

- Preserve unrelated work and keep changes scoped to the request.
- Add behavior only when it has a real consumer. Every visible control must work without relying on fake records or placeholder services.
- Verify the smallest relevant command first, then run `pnpm run quality`. Run the production build and browser checks for rendered-site changes.
- Generated directories such as `dist/`, `.astro/`, reports, caches, and local environment files must remain untracked.
