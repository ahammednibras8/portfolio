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
Playwright loads the same `.env` file as the Astro build, with exported environment
variables taking precedence. Metadata and sitemap checks use that configured
origin; there is no separate example-domain fallback.

Firefox and WebKit are needed only for local cross-browser checks:

```sh
pnpm exec playwright install firefox webkit
```

## Make a focused change

Start from the latest `main` and create a branch for one clear change.

Do not add an empty directory or a new abstraction before it has a real use. See [AGENTS.md](AGENTS.md) for the repository rules.

## Change GitHub Actions dependencies

All workflows use `.github/workflows/actions.lock` to record their direct and
transitive action dependencies. Use an authenticated GitHub CLI and the same
extension release as CI:

```sh
gh extension install github/gh-actions-lock --pin v0.5.0
gh actions-lock --version
```

If the extension is already installed at another version, remove it with
`gh extension remove actions-lock`, then install the pinned release. Review
extension release changes before updating the pin in CI and this guide together;
the extension itself is not covered by the Actions lockfile.

After adding, removing, or changing a workflow or an action reference, run from
the repository root:

```sh
gh actions-lock
git diff -- .github/workflows/
gh actions-lock --verify --fail-on-warning
```

Run against the whole workflow directory so new workflows are onboarded and
deleted entries are pruned. Commit generated workflow changes and the lockfile
together. Never edit the lockfile by hand. CI verifies coverage and upstream
provenance without changing files and treats warnings as failures. An offline
coverage check, `gh actions-lock --verify-local --fail-on-warning`, is useful
while editing but does not replace online verification.

Use exact version tags only for actions covered by the lockfile. Keep full
commit SHAs for uncovered actions and external reusable workflow calls. When
converting an existing SHA reference, verify that the selected tag resolves to
the same commit; keep dependency upgrades separate from that conversion.

Review changed commits as executable dependency updates. Investigate changes
to `owner_id` or `repo_id`, which identify the source repository. To advance a
moved reference intentionally, review upstream history first, then run
`gh actions-lock --relock` and inspect the complete diff. Never use
`--accept-moved` in automation or accept rewritten history without investigation.

The existing weekly Dependabot Actions updates also update matching lockfile
entries for onboarded workflows. Review both files in those PRs. Dependabot does
not onboard new workflows. The first Actions version-update PR after adoption
must be checked for this behavior; initial generation alone does not prove it.

The lockfile does not cover shell downloads, package dependencies, runner
images, container images, or external reusable workflow calls. It pins action
code; it does not establish that the code is safe. See
[ADR 0004](docs/decisions/0004-workflow-dependency-lockfile.md) for the adoption
decision and enforcement rollout.

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

Keyboard-navigation tests use Option+Tab for WebKit on macOS, where the
browser's default Tab behavior skips links. Other browser/platform combinations
use Tab. The shared `tests/helpers/keyboard.ts` helper sends the native shortcut;
the tests assert the complete focus order and real new-tab navigation for the
About-to-Home link and both 404 recovery actions without JavaScript. Popup tests
close their pages and check that the original remains available. Gmail navigation
is intercepted before any login or mail action; native email-app launching is
left to browser configuration. Copy-feedback coverage checks awaited success, tooltip dismissal/expiry/repeated use, visible failures, and optional touch-only vibration. Emulation verifies the API request, not a physical haptic response.
See [Apple's Safari shortcuts](https://support.apple.com/guide/safari/keyboard-shortcuts-and-gestures-cpsh003/mac)
and [the Playwright maintainer's guidance](https://github.com/microsoft/playwright/issues/5609).

Repository checks cover first-party source and shared design context, including
`PRODUCT.md`, `DESIGN.md`, and `.impeccable/config.json` and `design.json`.
The committed `.agents/skills/impeccable/` distribution is vendor tooling, so
formatting, JavaScript lint, spelling, and link checks exclude it. The portable
Codex hook configuration in `.codex/hooks.json` is shared with the repository.
Keep vendor-managed files unchanged during application work; update the skill
deliberately with its version, checksums, and upstream licenses. Platform binaries,
generated critique/audit/review output, caches, and machine-local settings remain
outside Git. The launcher can download its pinned engine to the user's cache on
first use. Machine-local hook consent stays in ignored
`.impeccable/config.local.json`.

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
