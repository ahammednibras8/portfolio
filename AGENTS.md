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

## Treat components as contracts

- Keep markup in its page until reuse or a distinct behavior gives it a real component boundary.
- Before adding a component, define its purpose, required content, maximum content, root semantic element, visual states, keyboard and touch behavior, responsive behavior, reduced-motion behavior, no-JavaScript behavior, and deletion condition.
- Express required content and limits through typed props and semantic markup where possible. Test behavior that a refactor could break.
- Do not create a universal `Card` until two real content types require the same structure and semantics.
- Remove a component when its stated boundary no longer exists; do not preserve a wrapper only because it already has a file.

## Use AI as a reviewer

AI may:

- find edge cases and suggest alternatives;
- review semantics and accessibility;
- challenge a decision;
- check implementation consistency; and
- flag repetitive writing.

AI must not:

- choose the first visual direction;
- invent Nibras's personality or write final project claims;
- choose the final palette;
- invent project evidence;
- produce the logo or decorative artwork to fill space; or
- make a substantial design decision without recorded reasoning.

Nibras chooses the direction, verifies the claims, reviews the result, and makes the final decision.

## Preserve the analytics boundary

- Read [ADR 0005](docs/decisions/0005-hosted-portfolio-analytics.md) before changing measurement. It defines the approved provider, events, payload, and rollout conditions. Follow [the analytics verification guide](CONTRIBUTING.md#verify-analytics) for testing and debugging.
- Reuse the existing Umami Cloud integration. A new provider, self-hosted service, event, or collected field requires a reviewed change to that decision and its tests.
- Preserve the build-time switch, exact production-origin guard, published-route eligibility, and browser exclusion. Published pages opt in through the shared layout's `trackPage` prop. Unavailable or unreadable browser storage must keep collection off. Development, preview, and privacy pages intentionally make no analytics requests; do not weaken those guards to make a local Network tab show traffic.
- Keep contact signals in `src/components/EmailContact.astro` and provider handling in `src/layouts/DocumentLayout.astro`. Preserve the `portfolio-contact` event contract, successful-write requirement for copy signals, and contact behavior when tracking fails. Never wait for analytics before following a link or completing a copy.
- Keep `/privacy/`, its browser preference, and the contextual same-tab footer links usable. Update the notice, decision record, and tests when the data contract changes. A banner-free preference does not establish a consent exemption.
- Distinguish source configuration, a deployed build, SDK compatibility, and records received by the provider. Neither a script tag nor a passing intercepted test proves that production collection is active. Verify deployment and dashboard evidence before claiming it works live.
- Keep automated collection requests intercepted. Do not send test visits to the hosted dashboard or change the repository activation variable as a side effect of unrelated work.
- Use authorized aggregate analytics as evidence for questions, alongside voluntary feedback and actual inquiries. Do not infer identities, sent messages, or visitor emotions from visit counts, contact clicks, or successful address copies. Keep private reports and inquiry records out of Git.

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
- Use exact version tags for third-party GitHub Actions only when the workflow and its dependencies are covered by `.github/workflows/actions.lock`. Otherwise use full commit SHAs. External reusable workflow calls must always use full commit SHAs.
- After changing workflows or action references, regenerate the lockfile with the pinned `gh-actions-lock` version in `CONTRIBUTING.md`, review the diff, and run `gh actions-lock --verify --fail-on-warning`. Never edit the lockfile by hand or automatically accept moved history.
- Keep workflow permissions read-only unless a job clearly needs more.
- Update `README.md` and add a decision record when the architecture changes.
- Do not weaken a quality check to hide a real failure.

## Record durable decisions

- `docs/decisions/` is the decision ledger.
- Add a record only when a substantial choice constrains future work.
- Record the decision, reason, evidence or personal source, constraints, where it is used, and when it should be reconsidered.
- Update an existing record instead of adding an overlapping one.
- Keep temporary research and rejected ideas out of the public ledger.

## Before finishing

- Keep changes focused.
- Preserve unrelated work.
- Add code only when something uses it.
- Make every visible control work.
- Run the smallest useful check first.
- Run `pnpm run verify` before review.
- Keep `dist/`, `.astro/`, reports, caches, and local environment files out of Git.
