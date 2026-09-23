# Contributing

This repository is a proof-first static portfolio. Contributions must preserve complete build-time HTML, accessible interaction, deterministic tooling, and evidence-based public content.

## Prerequisites

- Node.js 24.21.0, matching `.node-version`
- pnpm 12.5.1, matching `package.json`
- Git

Install dependencies and create the ignored local environment file:

```sh
pnpm install --frozen-lockfile
cp .env.example .env
```

Replace the placeholder `SITE_URL` in `.env` with a valid HTTPS origin. Do not commit `.env` or credentials.

Install Playwright browsers only when browser testing is needed:

```sh
pnpm exec playwright install chromium firefox webkit
```

## Branches and scope

Start from an up-to-date `main` branch and use a focused branch named for the change. Do not mix content, architecture, dependency, and unrelated cleanup work in one pull request.

Before adding a directory or abstraction, identify its first real consumer. The repository boundaries and protected files are defined in [AGENTS.md](AGENTS.md).

## Content contributions

- Start case studies with [the case-study template](docs/content/case-study-template.md).
- Follow the [writing voice](docs/content/writing-voice.md).
- Complete the [evidence and disclosure review](docs/content/evidence-and-disclosure.md) before publication.
- State personal ownership and collaborator boundaries precisely.
- Prefer source-backed measurements. If a value cannot be disclosed, explain the constraint and use bounded qualitative evidence.
- Never invent metrics, quotations, endorsements, dates, customers, or implementation details.
- Keep drafts out of navigation until they meet the content acceptance criteria in `README.md`.

## Verification

Run these checks for every contribution:

```sh
pnpm run quality
pnpm run build
```

For rendered HTML, styling, navigation, or accessibility changes, also run:

```sh
pnpm run test:browser:chromium
```

Run all configured browsers when changing shared layout, interaction, responsive behavior, or browser-sensitive CSS:

```sh
pnpm run test:browser
```

Run `pnpm run lint:html` after the build once the site contains generated HTML. Run `pnpm run test:performance` when the representative Lighthouse routes exist.

Documentation-only changes still require formatting and spelling checks through `pnpm run quality`.

## Pull requests

A pull request must:

- target `main` from a dedicated branch;
- explain the observable outcome and relevant trade-offs;
- list only verification that was actually run;
- include screenshots or recordings for meaningful visual changes;
- update `README.md` and `docs/decisions/` when architecture changes;
- contain no secrets, local environment files, generated reports, or unrelated changes;
- keep parent issues open unless closure is explicitly requested.

All required CI checks must pass before merge. External-link availability is audited on the scheduled workflow and should not be bypassed with an allowlist entry unless the host is confirmed to reject automated requests.
