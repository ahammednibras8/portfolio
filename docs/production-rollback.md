# Production rollback

Use this runbook when a production release makes the public portfolio materially worse and a verified correction cannot be deployed immediately.

A Cloudflare rollback changes the deployment served as production. It does not change `main`, rewrite Git history, or rebuild the site. Only an earlier successful production deployment can be selected; preview deployments are not rollback targets.

## Decide whether to roll back

Roll back when the current release breaks access, navigation, contact paths, metadata, security headers, or important content, and the previous production deployment is known to work.

Fix forward when production remains safe and usable, the correction is small and already verified, or the failure is outside the deployed artifact. DNS, account-level Cloudflare rules, and other external configuration usually need a direct configuration correction because restoring older HTML will not repair them.

## Identify the last known-good deployment

1. Record the failing production URL, Git commit, deployment time, observed failure, and the GitHub Actions deployment run.
2. In Cloudflare, open **Workers & Pages**, select `ahammed-nibras`, and open **Deployments**.
3. In **All deployments**, consider only earlier successful production deployments from `main`. Do not select a preview deployment.
4. Choose the newest deployment whose commit passed CI, passed its production smoke test, and was observed working in production.
5. Record the target deployment URL, Git commit, and deployment time before changing production.

## Roll back in Cloudflare

1. In the target deployment's three-dot actions menu, select **Rollback to this deployment**.
2. Confirm that the dialog names the intended production deployment and commit.
3. Confirm the rollback.
4. Do not rerun the deployment workflow while the rollback is protecting production. A new production deployment will replace the rollback.

Cloudflare changes production immediately. The repository still contains the newer commit, so repair or revert that change through a pull request before the next deployment.

## Verify the rollback

Set the immutable URL of the selected deployment, then compare it with production:

```sh
portfolio_origin=https://ahammednibras.com
rollback_url=https://DEPLOYMENT_ID.ahammed-nibras.pages.dev

curl --fail --silent --show-error "$portfolio_origin/" | shasum -a 256
curl --fail --silent --show-error "$rollback_url/" | shasum -a 256
```

The hashes must match. Then verify the public behavior:

```sh
curl --silent --show-error --head "$portfolio_origin/"
curl --silent --show-error --head "$portfolio_origin/404-check"
curl --fail --silent --show-error --head "$portfolio_origin/robots.txt"
curl --fail --silent --show-error --head "$portfolio_origin/sitemap-index.xml"
curl --silent --show-error --head "https://www.ahammednibras.com/rollback-check?source=www"
curl --silent --show-error --head "https://ahammed-nibras.pages.dev/rollback-check?source=pages"
```

Confirm:

- the homepage returns `200`, expected content is present, and CSS and fonts load;
- `/404-check` returns the authored page with status `404`;
- security headers remain present and no unexpected script is injected;
- `robots.txt` and the sitemap return `200`;
- alternate domains return `301` and preserve the path and query string; and
- the homepage remains usable at desktop and 320px widths with no console errors.

If any check fails, the rollback is not complete. Keep the production deployment marked unsuccessful and continue recovery.

## Communicate the rollback

Comment on the merged pull request that introduced the failed release. Include:

```text
Production rolled back at <UTC time>.
From: <failing commit and deployment>
To: <restored commit and deployment>
Reason: <observed impact>
Verification: <checks performed>
Follow-up: <repair pull request or current owner>
```

If users were notified elsewhere, update the same channel when production is stable. Do not describe the incident as resolved until the public verification passes.

## Rehearse without changing production

Open **All deployments**, identify the current last known-good production deployment, and open **Rollback to this deployment**. Check that the confirmation dialog shows the expected deployment and commit, then cancel it without confirming. Run the read-only production checks above against the current deployment.

Repeat this rehearsal after a material deployment-process change.

## Repair after rollback

Create a focused pull request that fixes or reverts the bad change. Run the full verification suite, deploy the feedback artifact, and approve production only after the real-user checks pass. Never force-push or reset `main` to imitate a rollback.
