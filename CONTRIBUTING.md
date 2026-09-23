# Contributing

Thank you for helping with this portfolio. Keep changes small, clear, accessible, and easy to verify.

## Setup

You need:

- Node.js 24.21.0;
- pnpm 12.5.1;
- Lychee 0.24.2;
- Git.

Install the project:

```sh
pnpm install --frozen-lockfile
cp .env.example .env
pnpm exec playwright install chromium
```

Set `SITE_URL` in `.env` to a valid HTTPS URL. Never commit `.env` or credentials.

Firefox and WebKit are needed only for local cross-browser checks:

```sh
pnpm exec playwright install firefox webkit
```

## Make a focused change

Start from the latest `main` and create a branch for one clear change.

Do not add an empty directory or a new abstraction before it has a real use. See [AGENTS.md](AGENTS.md) for the repository rules.

## Write public content carefully

- Use the [case-study template](docs/content/case-study-template.md).
- Follow the [writing guide](docs/content/writing-voice.md).
- Use the [evidence and privacy checklist](docs/content/evidence-and-disclosure.md).
- Say exactly what you owned and what the team owned.
- Never invent a number, quote, date, customer, or technical detail.
- Do not publish a name, image, metric, or internal detail without permission.

## Check the work

Run all required local checks:

```sh
pnpm run verify
```

For a focused browser check:

```sh
pnpm run build
PLAYWRIGHT_USE_EXISTING_BUILD=true pnpm run test:e2e --project=chromium
PLAYWRIGHT_USE_EXISTING_BUILD=true pnpm run test:a11y --project=chromium
```

When shared layout, interaction, or browser-sensitive CSS changes, also run:

```sh
pnpm run test:e2e
pnpm run test:a11y
```

HTML and Lighthouse checks skip with a clear message until the first page exists.

## Open a pull request

A pull request must:

- target `main`;
- explain what changed and why;
- list only checks that were actually run;
- include screenshots for meaningful visual changes;
- update the README and decision records when architecture changes;
- contain no secrets, generated reports, or unrelated changes.

All required CI checks must pass before merge.
