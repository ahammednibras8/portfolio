# Security

Security fixes are made on the current `main` branch.

## Report a security problem

Do not open a public issue for a private security problem.

Email `ahammednibras737@gmail.com` with the subject `Portfolio security report`.

Please include:

- the affected URL, file, or commit;
- what an attacker could do;
- the smallest safe way to reproduce the problem;
- any conditions needed for the problem to happen;
- a suggested fix, if you have one.

Remove passwords, tokens, personal data, and unrelated private information from the report. Please allow time to investigate and fix the problem before sharing it publicly.

## Keep private data out of Git

Never commit:

- passwords, tokens, private keys, sessions, or environment files;
- private customer details, screenshots, numbers, or source material;
- details of an unfixed security problem;
- generated files that contain local paths, credentials, or test data.

If a secret is committed, deleting the file is not enough. Revoke or rotate the secret first. Then remove it from the repository and check whether it was used.

The site has no login, database, or server function. Its optional Umami Cloud
integration remains disabled pending rollout verification.

The security policy permits the analytics SDK at
`https://cloud.umami.is/script.js` and collection at
`https://gateway.umami.is/api/send`. Inline scripts remain blocked.

The integration filters event payloads, but that does not eliminate network
metadata received by the provider or establish absolute anonymity.
Provider data handling, retention, processing terms, and applicable consent
and withdrawal behavior must be reviewed before collection is enabled.
See [ADR 0005](docs/decisions/0005-hosted-portfolio-analytics.md).
