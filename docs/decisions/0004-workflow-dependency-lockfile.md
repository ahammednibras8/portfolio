# 0004: Lock workflow action dependencies

- Status: Accepted
- Date: 2026-11-19

## Decision

Generate and commit `.github/workflows/actions.lock` with the official
`github/gh-actions-lock` extension, pinned to v0.5.0. Cover CI, weekly audit, and
deployment together. Use exact version tags in covered workflows while the
lockfile records the commits that GitHub Actions executes.

Run `gh actions-lock --verify --fail-on-warning` in existing pull-request CI,
before installing site dependencies or running the repository checks. Keep the
job read-only and regenerate the lockfile locally when workflows change. Keep
the existing Dependabot Actions schedule and grouping.

## Reason

The repository already pins direct actions to full commit SHAs. A workflow
lockfile extends that control to transitive actions and records source
repository identities. Exact version tags make workflow changes readable while
the lockfile retains the reviewed commits. Initial adoption must preserve all
existing direct action commits.

Existing CI is already required for every pull request, so a verification step
provides feedback without another workflow, a write-enabled update bot, or a
separate dependency update schedule. Treating warnings as failures also exposes
coverage gaps and unsupported references for review.

## Evidence or source

- Nibras requested adoption in [issue #77](https://github.com/ahammednibras8/portfolio/issues/77).
- [GitHub's GA announcement](https://github.blog/changelog/2026-10-28-github-actions-workflow-lockfiles-are-generally-available/)
  includes Free and Team plans as well as Enterprise Cloud.
- [Workflow dependency lockfiles](https://docs.github.com/en/actions/concepts/security/workflow-dependency-lockfiles)
  explains execution, transitive coverage, repository identity checks, and the
  relationship to SHA pinning.
- [The official extension](https://github.com/github/gh-actions-lock) provides
  generation and read-only online verification.
- [Release v0.5.0](https://github.com/github/gh-actions-lock/releases/tag/v0.5.0)
  fixes composite dependency coverage and exact SHA lookup, and adds the
  `--fail-on-warning` option used by CI.
- [GitHub's enforcement guide](https://docs.github.com/en/actions/how-tos/administer/enforce-workflow-lockfiles)
  describes Dependabot updates and staged policy enforcement.

## Constraints

- Generate the lockfile with the pinned CLI; never edit it by hand.
- Review lockfile commit and repository identity changes as dependency changes.
- Only covered action references may use exact version tags. Uncovered actions
  and external reusable workflow calls retain full commit SHAs.
- The extension release is a separate tool pin, outside lockfile coverage. Review
  updates and change the CI and contributor instructions together.
- CI uses only `contents: read` and its job token. It must not commit changes,
  accept moved history automatically, or receive deployment credentials.
- The lockfile does not pin packages, shell downloads, runner images, or
  container images. External reusable workflow dependencies need coverage in
  their source repositories. Locked code still needs review.
- Preserve the verified artifact, protected environments, and production
  deployment policy from ADR 0003.

## Where it is used

- `.github/workflows/actions.lock` covers `ci.yml`, `audit.yml`, and `deploy.yml`.
- `.github/workflows/ci.yml` verifies coverage and upstream provenance on PRs.
- `.github/dependabot.yml` maintains action versions and matching lock entries.
- `CONTRIBUTING.md` documents generation, verification, and review.
- `AGENTS.md` requires agents to maintain coverage when changing workflows.

## Enforcement rollout

At onboarding, the repository Actions API reports that all actions are allowed
and SHA pinning is not required. There is no tag-based allowlist to migrate.
The response does not expose a Require lockfile setting; its availability has
not been established for this repository. No repository policy is changed by
this PR.

After merge, confirm CI runs successfully with the lockfile. Check the first
Dependabot Actions version-update PR for coordinated workflow and lockfile
changes, and observe audit and deployment through their normal triggers and
verification steps. These checks cannot be established by local generation.

Then check whether Require lockfile is available in the repository's Actions
settings. Enable it only after all targeted workflows are covered and verified;
an uncovered targeted workflow is blocked. Evaluate mode is Enterprise Cloud
only and must not be assumed here. Keep PR verification in place regardless of
policy availability.

## Reconsider when

Reconsider the extension pin when a reviewed release fixes relevant resolution
or verification behavior. Revisit coverage before adding local actions,
containers, or external reusable workflows. Reconsider this approach if GitHub
changes lockfile execution semantics or the required provenance checks cannot
run with read-only permissions.
