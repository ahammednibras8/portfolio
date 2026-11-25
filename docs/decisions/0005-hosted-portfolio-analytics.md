# 0005: Use hosted analytics for portfolio visitors and interactions

- Status: Accepted; homepage enabled in production, pageview receipt verified
- Date: 2026-11-21
- Updated: 2026-11-25

## Decision

Use Umami Cloud Hobby as the only browser analytics provider.
Keep Astro output static and retain Cloudflare Pages hosting.

The current implementation measures only the production homepage:

- Pageviews.
- `contact_gmail_clicked`: activation of Write in Gmail.
- `contact_email_app_clicked`: activation of Open email app.
- `contact_email_copied`: a completed clipboard write.
- `outbound_clicked`: activation of a labeled profile or employer link.
- `section_view`: the Experience or Contact heading stays fully in view for a second.

Contact actions indicate intent. Outbound activations indicate interest in a
destination. Keep actual inquiries, outcomes, and voluntary feedback in private records.

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

## Accepted expansion

On 2026-11-22, Nibras approved broader visitor and interest analysis after
reviewing Umami's capabilities. Keep the implementation small, retain Hobby,
and prepare the shared layout to support published blog articles when ready.
This updates the earlier homepage-only measurement boundary.

The accepted scope includes:

- Standard pageviews with the published page path and title, browser language,
  and screen size, alongside provider-derived browser, OS, and approximate location.
- Tracking for published production content routes through the shared layout.
  Keep development, previews, the privacy control route, and authored 404 pages excluded.
- Generic `utm_source`, `utm_medium`, `utm_campaign`, and `utm_content` labels
  for acquisition and attribution. Drop other query parameters and fragments.
- Existing successful contact signals, plus `outbound_clicked` for approved
  profile and employer destinations with bounded destination and placement values.
- `section_view` for the Experience and Contact headings after one continuous
  second of visible exposure in a visible document, once per section per page load.
  This measures exposure, not reading or emotion.

Use Umami's existing traffic, source, session, breakdown, goal, funnel, journey,
and retention reports to review interest and contact intent. Use the Hobby
dashboard and private exports for analysis; paid automation is not required.
Add writing routes only when an article is ready to publish.

Performance and error collection can follow when a concrete reliability question
justifies them. Session replay, heatmaps, persistent custom identities, and
continuous activity logging are outside this initial expansion.

Update the contract below, the privacy notice, and regression coverage when
changing what analytics collects.

## Reason

Nibras approved a limited hosted integration after reviewing issue #62.
The current homepage has contact controls but no published project case study.
Operating an analytics application and database is unnecessary for this scope.

## Evidence or source

- [Issue #62](https://github.com/ahammednibras8/portfolio/issues/62)
- [Cloud pricing and limits](https://umami.is/pricing)
- [Collected metrics and visitor grouping](https://docs.umami.is/docs/metric-definitions)
- [Tracker configuration](https://docs.umami.is/docs/tracker-configuration)
- [Umami Cloud data processing agreement](https://umami.is/dpa)
- Nibras confirmed the Hobby plan and EU (Frankfurt) account region during setup. This is owner-supplied account information, not proof that every provider operation occurs in that region.

## Constraints

- Use the free Hobby plan without an automatic paid upgrade.
- Keep the confirmed EU (Frankfurt) account region. Verify current plan retention,
  processing terms, and applicable consent behavior before enabling production collection.
- Document the provider's visitor grouping accurately. Cookie-free tracking
  does not guarantee absolute anonymity.
- Exclude fragments and unapproved query parameters. Limit campaign fields to
  the approved values. Reduce external referrers to their HTTPS origin.
- Send no custom visitor identities, email addresses, message contents,
  free-text feedback, or recipient-specific campaign identifiers.
- Exclude development, preview, and internal test visits.
- Keep contact usable without JavaScript or working analytics.
- Never wait for tracking before opening a contact destination.
- Include the tracker explicitly in source and preserve deployment byte checks.
- Allow only required script and collection destinations in the security policy.
- Defer session replay, heatmaps, chatbots, and project-specific events.

## Production rollout

On 2026-11-25, Nibras approved enabling the existing homepage integration with
the browser exclusion control on `/privacy/`. The rollout uses the existing
payload and keeps internal automated test events out of the hosted dashboard.
The Hobby plan lists six months of analytics retention. Umami's processing
agreement leaves the applicable notice and consent requirements with the site
operator.

The enabled build reached production on 2026-11-25. A check of the live site
with the hosted SDK verified a homepage pageview and browser exclusion with
collector requests intercepted. Nibras separately confirmed that a visit
through his LinkedIn profile link appeared under the `linkedin` UTM source
in the hosted dashboard.

## Current event and payload contract

Keep SDK automatic tracking disabled. Send one pageview after the SDK loads,
with no event name. The current named events are the three contact signals,
`outbound_clicked`, and `section_view`.
`EmailContact.astro` dispatches a document `portfolio-contact` event whose
detail is an approved signal name; the document layout handles the provider.
Signals that occur before the SDK is ready can be missed. Do not delay contact
navigation or promise complete delivery.

The layout listens for native click events on anchors labeled
`data-analytics-outbound`. It sends a bounded destination and derives placement
without waiting for tracking before navigation.

On the homepage, observe the Experience and Contact headings after SDK load.
Send one `section_view` per heading per page load when it stays fully in view
for a continuous second in a visible tab. Leaving the viewport or hiding the
tab cancels the timer.

The before-send filter accepts only the `event` type and creates a fresh payload:

- `website`: the configured public Umami website ID.
- `hostname`: `ahammednibras.com`.
- `url`: the current page path with approved campaign labels when present.
- `title`: the current document title.
- `language`: the browser's preferred language.
- `screen`: the browser-reported screen width and height.
- `referrer`: an external HTTPS origin, or an empty string.
- `name`: an approved event name, omitted for a pageview.
- `data`: for `outbound_clicked`, an approved `destination` and its derived
  `placement`. The profile destinations `github_profile` and `linkedin_profile`
  use `introduction`. The employer destinations `Insource Data` and `NysaClan`
  use `experience`.
  For `section_view`, send only `section` with `experience` or `contact`.

The approved `utm_source` values are `devto`, `discord`, `github`,
`instagram`, `linkedin`, `medium`, and `x`. For the six profile links on DEV,
Discord, Instagram, LinkedIn, Medium, and X, use `social` for `utm_medium`,
`portfolio_launch` for `utm_campaign`, and `profile` for `utm_content`.
The allowlist also accepts `referral` for `utm_medium` and `readme` for
`utm_content`. Drop a campaign field when its key occurs more than once.
Rebuild the query from approved labels and omit the fragment.

Reject unknown signal names and other record types. Do not copy arbitrary SDK
properties into the payload. Recheck the route, build switch, and browser
exclusion before sending. This payload boundary does not remove network
metadata received by the provider.

## Network policy

Load the SDK from `https://cloud.umami.is/script.js`.
Set `data-host-url` explicitly to `https://gateway.umami.is`.
Allow collection requests only to `https://gateway.umami.is/api/send`.

## Build and runtime gates

Only the literal build-time value `PUBLIC_ANALYTICS_ENABLED=true` enables the
integration. CI and Deploy read the repository Actions variable of that name,
defaulting to `false` when unset. The ignored local `.env` file does not configure
GitHub builds. A changed variable requires a new build and deployment; it cannot
change an existing artifact.

An enabled build loads the tracker only at the production origin when the
requested path matches the page's static `data-analytics-path` declaration.
Pages declare eligibility with the shared layout's `trackPage` prop. The
homepage is currently the only opted-in page. Development, feedback previews,
Privacy, and 404 remain excluded. Any existing `umami.disabled` storage key
excludes that browser, including an empty value. Storage read failures also
prevent collection.

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
