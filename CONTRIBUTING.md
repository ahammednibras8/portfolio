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

## Use Impeccable

The project skill is already committed in `.agents/skills/impeccable/`; a fresh
clone does not need another installation. Open the repository in your coding
tool and reload it if the skill is not listed. Read [AGENTS.md](AGENTS.md),
[PRODUCT.md](PRODUCT.md), [DESIGN.md](DESIGN.md), and the relevant decision record
before design work. Nibras owns the direction, factual claims, and final choices.

In Codex chat, start with a named surface and request findings before edits:

```text
$impeccable critique the homepage introduction. Report findings only.
$impeccable audit the email contact controls. Report findings only.
```

Choose one of those reviews for the task. Read the evidence with Nibras, who
selects the findings to address. Then request a targeted refinement, for example:

```text
$impeccable adapt the homepage for the verified enlarged-text overflow.
Preserve the approved design and factual copy. Fix only the selected finding.
```

Run the smallest relevant check first, review the rendered result when appearance
or interaction changes, then run `pnpm run verify`. Shared layout, interaction,
and browser-sensitive CSS also require the cross-browser checks below. Review
findings are evidence to assess, not automatic permission to redesign the site.

Use `$impeccable doctor` to diagnose context drift. If it calls for a sidecar
refresh, request `$impeccable document` with an explicit instruction to preserve
`DESIGN.md` and refresh only `.impeccable/design.json`. Re-run doctor afterward.
Keep setup and hook checks separate from UI refinement; inspect hook status with
`$impeccable hooks status` and review local hook consent in the coding tool.

### Update the vendored skill

Make updates on a dedicated branch. Read the
[upstream installation and update guide](https://impeccable.style/tutorials/getting-started/)
and review the intended release first. Run `npx impeccable@X.Y.Z update` from the
repository root, replacing `X.Y.Z` with the exact reviewed installer version.
Keep the integration scoped to this project. The installer version and the
installed skill and engine versions must each be reviewed; do not assume they
are identical.

Inspect the complete diff in `.agents/skills/impeccable/` and `.codex/hooks.json`.
Confirm the skill version in `SKILL.md`, the engine pin in `scripts/VERSION`, and
its matching `scripts/engine-checksums.txt` entries against the reviewed upstream
release. Retain upstream licenses and attribution; update `UPSTREAM.txt` and the
README's recorded versions to match. Preserve project context and review any
migrations separately. Reload the coding tool, run doctor and check hook status,
then run `pnpm run verify` before committing the update.

Generated review reports belong in the ignored `.impeccable/critique/`,
`.impeccable/audit/`, and `.impeccable/review/` directories. They are temporary
evidence tied to a particular source version; put accepted durable decisions in
the ledger instead. Commit reviewed context and version metadata, while keeping
reports, platform binaries, caches, and local hook consent out of Git.

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
the tests assert the complete homepage focus order and real new-tab navigation
for both 404 recovery actions without JavaScript. The removed About route must
return the authored 404 page and stay out of the sitemap. Popup tests
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

## Verify analytics

Read [ADR 0005](docs/decisions/0005-hosted-portfolio-analytics.md) for the provider,
approved signals, payload fields, and rollout conditions. The shared document
layout owns provider handling; `EmailContact.astro` emits `portfolio-contact`
signals; `src/pages/privacy.astro` owns the browser exclusion control.

For a focused check using the real build and Cloudflare security headers:

```sh
pnpm exec playwright test \
  tests/e2e/analytics.spec.ts \
  tests/e2e/privacy.spec.ts \
  tests/e2e/footer.spec.ts \
  tests/accessibility/privacy.spec.ts \
  --project=chromium
```

The analytics suite builds both flag settings in temporary directories and
intercepts requests at simulated origins. It tests SDK configuration, published
route eligibility, campaign filtering, outbound activations, section timing,
contact failures, and browser exclusion without sending live events. Its SDK
replacement does not establish compatibility with a changed hosted SDK or
receipt by the provider. When checking the real SDK, preserve interception of
all collector requests and record which SDK was inspected. Keep full
verification and cross-browser checks for shared interaction changes.

Debug missing requests in this order:

1. Check `location.origin` and confirm `location.pathname` matches
   `document.body.dataset.analyticsPath` on the deployed page. The homepage
   is the only route that currently opts in. Localhost, feedback previews,
   `/privacy/`, and authored 404 pages do not load analytics, even in an enabled
   build.
2. Check the built flag, deployed commit, and browser exclusion. The privacy
   notice reflects build configuration, not proof of collection. Local `.env`
   values do not reach GitHub builds, and an Actions variable change requires a
   new artifact. Storage read failures intentionally keep collection off.
3. On an eligible deployed page, inspect Network with all request types
   visible. Look for `cloud.umami.is/script.js` and
   `gateway.umami.is/api/send`; inspect blocking or CSP errors. An ad blocker can
   prevent measurement while contact controls continue to work.
4. For an unstyled checkbox, compare computed `accent-color` and dimensions with
   `.analytics-exclusion input` in `src/styles/global.css`. Confirm the correct
   development server is running and refresh its CSS before changing the
   implementation. Preserve the existing action color and focus outline.

After the ADR's rollout conditions are met, verify the deployed canonical
homepage through the actual product controls in a dedicated test browser.
Confirm the pageview and approved contact, outbound, and section records appear
in the hosted dashboard. Review any approved campaign labels on the pageview.
A successful network response alone does not prove persistence. Do not seed
the outcome by calling the tracking API directly. Keep test activity minimal
and private reports out of Git.

Then use the privacy checkbox, return Home, and reload to verify collection is
excluded. Verify persistence and synchronization between privacy tabs. A build
with analytics disabled and a blocked SDK must both preserve contact behavior.
Update the ADR, README, and security notice when activation or data handling
changes. To disable collection in the published artifact, set the Actions
variable to `false` and build and deploy again; the variable cannot modify an
already published artifact.

### Create campaign links

Use Go 1.21 or newer for the local campaign link CLI. Run it from the repository
root and answer the Source, Medium, Campaign, and optional Placement prompts.

```sh
go run scripts/campaign-link.go
```

For an event QR code, use short public labels such as `meetup`, `qr`,
`community_talk`, and `slides`. For applications, use a label shared across the
channel or placement. Keep names, recipient identifiers, and private application
details out of the labels.

The CLI prints the URL and adds new labels to `src/data/analytics-campaigns.json`.
Review and commit the registry diff. Share the new link after deployment so the
built site recognizes its labels. After a real click, check **Insights → UTM**
in Umami for the campaign and source.

```sh
go vet scripts/campaign-link.go scripts/campaign-link_test.go
go test scripts/campaign-link.go scripts/campaign-link_test.go
```

## Open a pull request

A pull request must:

- target `main`;
- explain what changed and why;
- list only checks that were actually run;
- include screenshots for meaningful visual changes;
- update the README and decision records when architecture changes;
- contain no secrets, generated reports, or unrelated changes.

All required CI checks must pass before merge.
