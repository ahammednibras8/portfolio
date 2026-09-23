# Security policy

## Supported version

Security fixes apply to the current `main` branch. This portfolio has no separately supported release branches.

## Reporting a vulnerability

Do not open a public issue for an undisclosed vulnerability.

Email `ahammednibras@proton.me` with the subject `Portfolio security report`. Include:

- the affected URL, file, or commit;
- the security impact;
- the smallest safe reproduction;
- any conditions required for exploitation;
- suggested remediation, if available.

Remove credentials, personal data, and unrelated private information from the report. Allow reasonable time for investigation and remediation before public disclosure. Acknowledgement and status updates will be provided through the reporting channel.

## Public-repository safety

Everything committed to this repository must be treated as public and permanent. Never commit:

- API tokens, passwords, private keys, session data, or environment files;
- unpublished customer names, internal screenshots, confidential metrics, or proprietary source material;
- private vulnerability details before remediation and coordinated disclosure;
- generated artifacts that may embed local paths, credentials, or test data.

If a secret is committed, removing the file is not sufficient. Revoke or rotate the credential first, then remove it from the repository and investigate its use.

The static production design intentionally excludes authentication, databases, server functions, and third-party scripts at launch. Any future addition that processes data or executes at runtime requires a documented threat, privacy, and retention review.
