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

Prefer a banner-free visitor experience with a public privacy notice and a
simple browser-specific analytics opt-out. Do not introduce an opt-in
interface as the default implementation.

This preference does not establish a consent exemption. Assess the applicable
scope and the provider's session processing and retention before enabling
production collection.

Place the privacy notice and browser-specific analytics controls at
`/privacy/`. Keep the name and location as plain text, with one contextual
link on the right side of the shared footer. Show Privacy on the homepage
and Home on other pages. Footer links open in the current tab.

## Reason

Nibras approved a limited hosted integration after reviewing issue #62.
The current homepage has contact controls but no published project case study.
Operating an analytics application and database is unnecessary for this scope.

## Evidence or source

- [Issue #62](https://github.com/ahammednibras8/portfolio/issues/62)
- [Cloud pricing and limits](https://umami.is/pricing)
- [Collected metrics and visitor grouping](https://docs.umami.is/docs/metric-definitions)
- [Tracker configuration](https://docs.umami.is/docs/tracker-configuration)
- Nibras confirmed the Hobby plan and EU (Frankfurt) account region during setup. This is owner-supplied account information, not proof that every provider operation occurs in that region.

## Constraints

- Use the free Hobby plan without an automatic paid upgrade.
- Keep the confirmed EU (Frankfurt) account region. Verify current plan retention,
  processing terms, and applicable consent behavior before enabling production collection.
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

## Event and payload contract

Keep SDK automatic tracking disabled. Send one pageview after the SDK loads,
with no event name. The only named events are the three contact signals above.
`EmailContact.astro` dispatches a document `portfolio-contact` event whose
detail is an approved signal name; the document layout handles the provider.
Signals that occur before the SDK is ready can be missed. Do not delay contact
navigation or promise complete delivery.

The before-send filter accepts only the `event` type and creates a fresh payload:

- `website`: the configured public Umami website ID.
- `hostname`: `ahammednibras.com`.
- `url`: `/`.
- `title`: `Portfolio`.
- `referrer`: an external HTTPS origin, or an empty string.
- `name`: one approved contact signal, omitted for a pageview.

Reject unknown signal names and other record types. Do not copy arbitrary SDK
properties into the payload. Recheck the route, build switch, and browser
exclusion before sending. This payload boundary does not remove network
metadata received by the provider.

## Network policy

Load the SDK from `https://cloud.umami.is/script.js`.
Set `data-host-url` explicitly to `https://gateway.umami.is`.
Allow collection requests only to `https://gateway.umami.is/api/send`.

These security-policy permissions do not enable analytics.
`PUBLIC_ANALYTICS_ENABLED` remains false pending rollout verification.

## Build and runtime gates

Only the literal build-time value `PUBLIC_ANALYTICS_ENABLED=true` enables the
integration. CI and Deploy read the repository Actions variable of that name,
defaulting to `false` when unset. The ignored local `.env` file does not configure
GitHub builds. A changed variable requires a new build and deployment; it cannot
change an existing artifact.

Even an enabled build loads the tracker only at `https://ahammednibras.com/`.
Development, feedback previews, the privacy route, and other paths remain
excluded. Any existing `umami.disabled` storage key excludes that browser,
including an empty value. Storage read failures also prevent collection.

Follow [the verification guide](../../CONTRIBUTING.md#verify-analytics) for
automated checks, debugging, and live rollout. Intercepted tests verify browser
behavior without establishing provider receipt. Update the recorded rollout
status and the public notice when activation or data handling changes.

## Where it is used

The integration uses `src/layouts/DocumentLayout.astro`,
`src/components/EmailContact.astro`, and `public/_headers`.
The notice and browser preference control live in `src/pages/privacy.astro`,
with presentation in `src/styles/global.css`.

The preference uses the `umami.disabled` local-storage key. Open privacy tabs
synchronize changes. Storage read failures prevent analytics collection.

README, SECURITY, and ADR 0001 document the integration and its restrictions.

## Reconsider when

Reconsider if limits, pricing, processing terms, visitor grouping, retention,
or reporting needs no longer fit. Review usefulness after approximately one
month; extend observation when traffic is too low to support conclusions.
