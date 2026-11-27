# 0003: Deploy verified output to Cloudflare Pages

- Status: Accepted
- Date: 2026-09-30

## Decision

Host the static site on Cloudflare Pages. Use Direct Upload from GitHub Actions instead of Cloudflare's Git integration.

The production branch is `main`. GitHub Actions builds and verifies `dist/`, then stores that exact directory as the SHA-qualified `portfolio-dist-<commit>` workflow artifact. A separate job deploys the artifact to Cloudflare's `feedback` preview branch and verifies the deployment-specific URL returned by Wrangler. Production then automatically receives the same artifact through the Wrangler version pinned in `package.json`, using the branch-restricted `production` environment without a separate approval step.

## Reason

The site is already a complete static artifact. It does not need another build system or a runtime service.

Direct Upload keeps testing and deployment in one pipeline. Cloudflare receives the files that passed the repository checks instead of rebuilding the source independently.

On 2026-11-19, Nibras approved automatic deployment to remove the repeated production approval step. Merging a pull request after the required checks pass is the publishing decision. Each deployment records its Git commit SHA; deployment does not require a version bump or named release.

## Evidence or source

- [Cloudflare documents Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/) for prebuilt assets and external CI systems.
- The first production upload served the generated homepage, sitemap, `robots.txt`, security headers, and authored 404 response from `ahammed-nibras.pages.dev`.
- The live 404 response returned HTTP 404 with `Cache-Control: no-store`.
- The apex custom domain `ahammednibras.com` serves the Pages project over a valid Cloudflare-managed HTTPS certificate.

## Constraints

- Only a push to `main` may deploy production.
- The full repository verification must pass before upload.
- The deployment step must upload the `dist/` directory produced by that verification run. It must not rebuild it.
- The production smoke test must compare the served homepage with the verified `dist/index.html`. Retry HTTP failures and content mismatches within a bounded window, then fail if the bytes still differ; a matching title alone does not identify the verified artifact.
- The deployable artifact contains only `dist/` and remains available for 14 days during the feedback period.
- Playwright and Lighthouse output belongs in the separate `ci-reports-<commit>` artifact. Reports, caches, environment files, and credentials must never enter the deployable artifact.
- The feedback deployment must use Cloudflare's `feedback` preview branch and match the workflow commit SHA.
- The deployment-specific feedback URL must serve the built homepage with Cloudflare's `X-Robots-Tag: noindex` header before production can proceed.
- Cloudflare credentials belong to protected GitHub environments, not repository-level Actions secrets, and are unavailable to pull-request and verification jobs.
- The `production` environment must not require reviewers or a wait timer. Production proceeds automatically only after repository verification and feedback verification pass. Keep the environment's deployment branch restriction set to `main`.
- Use the repository-pinned Wrangler dependency. Do not depend on a global CLI or a second deployment action.
- Do not add Pages Functions, Workers, R2, another server, or another build pipeline under this decision.
- Preview deployments on pull requests are limited to verified branches from this repository. Feedback previews are created only after a change reaches `main`. Both use their own deployment environments and stay outside search indexes.
- The apex `https://ahammednibras.com` is canonical. `www` and the production `ahammed-nibras.pages.dev` hostname must redirect permanently while preserving paths and query strings. Hashed Pages preview URLs must remain reachable.

## Where it is used

- `.github/workflows/ci.yml` verifies pull requests without deployment credentials. Its separate preview job uses the `pr-preview` environment to deploy the verified build and its browser reports.
- `.github/workflows/deploy.yml` verifies pushes to `main`, transfers the resulting `portfolio-dist-<commit>` artifact between jobs, stores reports separately, deploys and verifies the feedback preview, and automatically uploads the same site artifact to production.
- The `PRODUCTION_URL` repository variable supplies the canonical site origin during the production build.
- The `production` environment limits deployment to `main`, has no required reviewer or wait timer, and supplies `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_PAGES_PROJECT`, and `PRODUCTION_URL` to the deployment job. These protection settings are managed in GitHub, separately from the workflow file.
- The `feedback` environment is restricted to `main`, exposes deployment credentials only to the feedback job, and records the deployment-specific URL.
- Cloudflare Pages project `ahammed-nibras` serves the canonical `https://ahammednibras.com/` origin. Its `pages.dev` host remains the Pages service hostname and preview namespace.

## Pre-merge review for issue #64

Deploy verified builds from trusted same-repository pull requests before merge. After the preview passes its checks, record the full commit SHA and the deployment-specific URL returned by Cloudflare in the GitHub run summary. Post the preview URL, CI result, test counts, Lighthouse scores, and report links in one pull request comment. Update the comment when a newer revision passes. If reports are unavailable, still post the verified preview URL and CI result. A shared branch alias can move when another build uploads, so it cannot identify the revision under review.

Publish the self-contained Playwright HTML and one representative Lighthouse report per audited page to the separate `portfolio-ci-reports` project. Use the verified deployment URLs in the pull request comment and Discord summary. Playwright diagnostics and the full Lighthouse output remain in GitHub Actions artifacts.

When the Discord webhook is configured, send one message after publishing the GitHub preview comment. Link the pull request using its title and include a related issue when the PR description names one with `Related: #NUMBER`. Include the same preview URL, CI result, lowest Lighthouse score across the audited pages for each category, and a link to the GitHub comment. Log a warning if Discord delivery fails and keep the GitHub preview result available.

Anyone with the preview URL can open it without signing in. Serve only the verified static output and keep previews out of search indexes. Keep fork PR verification credential-free.

Merging remains the publishing decision. Production builds and verifies the resulting `main` commit and deploys the artifact from that verification run. The reviewed PR revision and resulting `main` commit may have different SHAs.

## Weekly audit reports

The weekly audit keeps its complete reports in a GitHub Actions artifact for 14 days. A separate publishing job uses the `ci-reports` environment, restricted to `main`, and the `portfolio-ci-reports` Direct Upload project to serve the external-link totals and self-contained Playwright report.

Anyone with the report URL can open it. Failed audits can still publish the external-link totals if the link check produced a report. Failed Playwright reports, Playwright attachments, and Lychee redirect details stay in the audit artifact. The publishing job checks the served HTML against the files it uploaded and verifies the `noindex` header before adding the exact deployment links to the run summary.

One Discord summary follows the audit and publishing jobs. It includes each verified browser link beside its check result and links to the audit archive when a browser report is unavailable.

## Recovery and rollback

Every successful production upload remains available as a Cloudflare Pages deployment. Follow the [production rollback runbook](../production-rollback.md) to choose, promote, verify, and communicate a last known-good deployment. Cloudflare documents the underlying promotion in its [rollback guide](https://developers.cloudflare.com/pages/configuration/rollbacks/).

After rollback, correct the repository and merge a new verified change. Do not make an unrecorded production-only edit to replace the repository state.

## Reconsider when

Reconsider the host if Cloudflare Pages cannot serve a required static-site capability, or if deployment availability becomes unacceptable. A server-side feature requires a separate architecture decision; it is not a reason to add a runtime silently.

Cloudflare does not allow a Direct Upload project to switch to Git integration. Moving to Git integration would require a new Pages project and an explicit replacement for this decision.
