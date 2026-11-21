# 0005: Use hosted analytics for portfolio contact signals

- Status: Accepted for implementation; production collection pending verification
- Date: 2026-11-21
- Updated: 2026-11-22

## Decision

Use Umami Cloud Hobby as the only browser analytics provider.
Keep Astro output static and retain Cloudflare Pages hosting.

Initially measure only the production homepage:

- Pageviews.
- `contact_gmail_clicked`: activation of Write in Gmail.
- `contact_email_app_clicked`: activation of Open email app.
- `contact_email_copied`: a completed clipboard write.

These actions indicate contact intent, not a sent message or qualified inquiry.
Keep actual inquiries, outcomes, and voluntary feedback in private records.

## Reason

Nibras approved a limited hosted integration after reviewing issue #62.
The current homepage has contact controls but no published project case study.
Operating an analytics application and database is unnecessary for this scope.

## Evidence or source

- [Issue #62](https://github.com/ahammednibras8/portfolio/issues/62)
- [Cloud pricing and limits](https://umami.is/pricing)
- [Collected metrics and visitor grouping](https://docs.umami.is/docs/metric-definitions)
- [Tracker configuration](https://docs.umami.is/docs/tracker-configuration)

## Constraints

- Use the free Hobby plan without an automatic paid upgrade.
- Confirm the account region, six-month analytics retention, processing terms,
  and applicable consent behavior before enabling production collection.
- Document the provider's visitor grouping accurately. Cookie-free tracking
  does not guarantee absolute anonymity.
- Exclude URL query strings and fragments; sanitize referrers before sending.
- Send no custom visitor identities, email addresses, message contents,
  free-text feedback, or campaign parameters.
- Exclude development, preview, and internal test visits.
- Keep contact usable without JavaScript or working analytics.
- Never wait for tracking before opening a contact destination.
- Include the tracker explicitly in source and preserve deployment byte checks.
- Allow only required script and collection destinations in the security policy.
- Defer session replay, heatmaps, chatbots, and project-specific events.

Production collection remains disabled until configuration, actual payloads,
consent behavior, and failure cases have been verified.

## Network policy

Load the SDK from `https://cloud.umami.is/script.js`.
Set `data-host-url` explicitly to `https://gateway.umami.is`.
Allow collection requests only to `https://gateway.umami.is/api/send`.

These security-policy permissions do not enable analytics.
`PUBLIC_ANALYTICS_ENABLED` remains false pending rollout verification.

## Where it is used

The planned integration belongs in `src/layouts/DocumentLayout.astro`,
`src/components/EmailContact.astro`, and `public/_headers`.

Implementation must update README, security documentation, and the affected
script restriction in ADR 0001.

## Reconsider when

Reconsider if limits, pricing, processing terms, visitor grouping, retention,
or reporting needs no longer fit. Review usefulness after approximately one
month; extend observation when traffic is too low to support conclusions.
