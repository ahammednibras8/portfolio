# 0003: Deploy verified output to Cloudflare Pages

- Status: Accepted
- Date: 2026-09-30

## Decision

Host the static site on Cloudflare Pages. Use Direct Upload from GitHub Actions instead of Cloudflare's Git integration.

The production branch is `main`. GitHub Actions builds and verifies `dist/`, then uploads that same directory with the Wrangler version pinned in `package.json`.

## Reason

The site is already a complete static artifact. It does not need another build system or a runtime service.

Direct Upload keeps testing and deployment in one pipeline. Cloudflare receives the files that passed the repository checks instead of rebuilding the source independently.

## Evidence or source

- [Cloudflare documents Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/) for prebuilt assets and external CI systems.
- The first production upload served the generated homepage, sitemap, `robots.txt`, security headers, and authored 404 response from `ahammed-nibras.pages.dev`.
- The live 404 response returned HTTP 404 with `Cache-Control: no-store`.

## Constraints

- Only a push to `main` may deploy production.
- The full repository verification must pass before upload.
- The deployment step must upload the `dist/` directory produced by that verification run. It must not rebuild it.
- Cloudflare credentials remain GitHub Actions secrets and are unavailable to pull-request jobs.
- Use the repository-pinned Wrangler dependency. Do not depend on a global CLI or a second deployment action.
- Do not add Pages Functions, Workers, R2, another server, or another build pipeline under this decision.
- Pull requests do not receive public preview deployments. If previews are added later, search engines must be told not to index them, and they must not receive production-only secrets.

## Where it is used

- `.github/workflows/ci.yml` verifies pull requests without deployment credentials.
- `.github/workflows/deploy.yml` verifies pushes to `main` and uploads the resulting `dist/` directory.
- The `PRODUCTION_URL` repository variable supplies the canonical site origin during the production build.
- `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` repository secrets authorize the upload.
- Cloudflare Pages project `ahammed-nibras` serves `https://ahammed-nibras.pages.dev/`.

## Recovery and rollback

Every successful production upload remains available as a Cloudflare Pages deployment. To recover from a bad release, open the project's deployment list, choose the last known-good production deployment, and select **Rollback to this deployment**. Cloudflare documents this process in its [rollback guide](https://developers.cloudflare.com/pages/configuration/rollbacks/).

After rollback, correct the repository and merge a new verified change. Do not make an unrecorded production-only edit to replace the repository state.

## Reconsider when

Reconsider the host if Cloudflare Pages cannot serve a required static-site capability, or if deployment availability becomes unacceptable. A server-side feature requires a separate architecture decision; it is not a reason to add a runtime silently.

Cloudflare does not allow a Direct Upload project to switch to Git integration. Moving to Git integration would require a new Pages project and an explicit replacement for this decision.
