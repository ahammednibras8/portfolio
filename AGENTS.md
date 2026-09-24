# Instructions for coding agents

Read the files related to the task before making changes. Check the tests, configuration, Git status, and recent commits. Keep existing work safe.

## Keep the site simple

- Astro must use static output.
- Important content and navigation must be present in the built HTML.
- Do not add React, Vue, Svelte, server rendering, Pages Functions, a database, or an application server without a new accepted decision record.
- Use semantic HTML, Astro components, and CSS first.
- Put routes in `src/pages/`.
- Put shared page shells in `src/layouts/`.
- Put reusable presentation in `src/components/`.
- Put shared profile and navigation data in `src/data/`.
- Put case studies in `src/content/projects/`.
- Add `src/content/writing/` only when an article is ready to publish.
- Import images and diagrams from `src/assets/` when Astro should optimize them.
- Use `public/` only when a file must keep its exact public name.
- Do not create empty folders, placeholder files, or unused abstractions.

## Commands

Use Node.js 24.21.0 and pnpm 12.5.1.

| Task                    | Command                          |
| ----------------------- | -------------------------------- |
| Install dependencies    | `pnpm install --frozen-lockfile` |
| Start development       | `pnpm run dev`                   |
| Preview the build       | `pnpm run preview`               |
| Format files            | `pnpm run format`                |
| Check formatting        | `pnpm run format:check`          |
| Run all linters         | `pnpm run lint`                  |
| Check CSS               | `pnpm run lint:css`              |
| Check spelling          | `pnpm run lint:spelling`         |
| Check Astro and TS      | `pnpm run check`                 |
| Build the site          | `pnpm run build`                 |
| Run browser tests       | `pnpm run test:e2e`              |
| Run accessibility tests | `pnpm run test:a11y`             |
| Check built HTML        | `pnpm run test:html`             |
| Check links             | `pnpm run test:links`            |
| Run Lighthouse          | `pnpm run test:lighthouse`       |
| Run every local gate    | `pnpm run verify`                |

Commands that load Astro need `SITE_URL`. Copy `.env.example` to the ignored `.env` file and use a valid HTTPS URL.

## Protect the repository

- Never print or commit secrets, credentials, private client data, or unpublished evidence.
- Change `pnpm-lock.yaml` only through pnpm.
- Keep dependency versions exact.
- Keep the approved build list in `pnpm-workspace.yaml`.
- Pin third-party GitHub Actions to full commit SHAs.
- Keep workflow permissions read-only unless a job clearly needs more.
- Update `README.md` and add a decision record when the architecture changes.
- Do not weaken a quality check to hide a real failure.

## Before finishing

- Keep changes focused.
- Preserve unrelated work.
- Add code only when something uses it.
- Make every visible control work.
- Run the smallest useful check first.
- Run `pnpm run verify` before review.
- Keep `dist/`, `.astro/`, reports, caches, and local environment files out of Git.
