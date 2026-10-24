# Search discovery runbook

<!-- cspell:ignore Ahamed Ahamad nibrash nibrass nibrs llms -->

Use this after changing public identity, routes, metadata, or hosting access. The goal is to help people find the right Ahammed Nibras and verify the published work. Technical eligibility does not guarantee a position, knowledge panel, AI answer, or citation.

Track completion and dated observations in [issue #63](https://github.com/ahammednibras8/portfolio/issues/63). Keep private Search Console exports, account settings, logs, and enquiry details out of Git. This is an operational procedure, not a public analytics report.

## Repository checks

1. Review `src/data/profile.ts` against the published identity. The actual account identifier is `ahammednibras8`; a plausible typo is not automatically an alternate name.
2. Check that the full name, role, location, and profile identifier are visible on the homepage and About page. Review final wording with Nibras. Changes to project claims require the [evidence checklist](content/evidence-and-disclosure.md).
3. Inspect the built microdata with a structured-data validator. Check the homepage's WebSite and Person, and the About page's ProfilePage with that same Person as its main entity. The Person identifier ends in `/#person` on both pages.
4. Confirm page-specific canonical URLs, real HTML links, and sitemap membership. Do not put 404 or preview URLs in the sitemap.
5. Run `pnpm run verify` with the pinned toolchain. Shared layout changes also need the full cross-browser checks in [CONTRIBUTING.md](../CONTRIBUTING.md).

The site retains its existing authored Cascade study at `/#work`. The About page links there. Move the study to `src/content/projects/` and a dedicated route only when implementing the approved route structure in [ADR 0002](decisions/0002-personal-design-direction.md); preserve the evidence and old anchor paths rather than publishing a duplicate to increase page count. Add writing only when an article is ready.

## Owner tasks after deployment

These checks require the relevant account access. A repository change does not complete them.

### Connect the profiles

- Add `https://ahammednibras.com/` to the GitHub website field and profile README.
- Check LinkedIn's website/contact and featured areas, then other public profiles Nibras controls.
- Keep the name, role, and location accurate across profiles. Identical biographies are not required.
- Replace old portfolio links where possible. Configure permanent redirects from an old host only if it is still controlled, mapping old content to relevant new destinations.

### Inspect Google Search Console

- Verify the Domain property for `ahammednibras.com` if needed through the account's normal DNS verification workflow. Never commit verification credentials or private exports.
- Inspect the homepage and `/about/`: check indexing, the Google-selected canonical, last crawl information, and any reported errors.
- Submit `https://ahammednibras.com/sitemap-index.xml` and check that its child sitemap is processed.
- Check **Settings → Search generative AI** and any inherited control. Google's documentation describes inclusion as the default. Do not assume a missing AI answer means this setting is disabled.
- After meaningful updates, request indexing for the important URLs once. Repeated requests do not speed up crawling.

Sources: [Google's Search generative AI control](https://support.google.com/webmasters/answer/16908024), [URL inspection](https://support.google.com/webmasters/answer/9012289), and [recrawl guidance](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl).

### Check real crawler access in Cloudflare

The generated `robots.txt` permits all crawlers and advertises the sitemap. Keep search access and training preferences separate.

| Service       | Search or user retrieval                                              | Separate training or other control                                                                        |
| ------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Google Search | Googlebot; indexing and snippet controls; Search Console AI inclusion | Google-Extended controls Gemini training and certain grounding uses, and is not an organic ranking signal |
| ChatGPT       | OAI-SearchBot for search; ChatGPT-User for user-directed visits       | GPTBot for model training                                                                                 |
| Claude        | Claude-SearchBot for search; Claude-User for user-directed retrieval  | ClaudeBot for model training                                                                              |

Review AI Crawl Control, bot policies, and WAF events for the intended services. An Allow setting can coexist with an upstream block. Use the providers' documented verification methods when checking actual requests; changing a request's user-agent string does not authenticate a crawler. Do not broadly bypass security rules or change training preferences just to improve search visibility.

Confirm production HTML returns normally and the feedback preview retains `X-Robots-Tag: noindex`. A crawler request proves access, not that the service cited the site.

Sources: [Google crawler controls](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers), [official OpenAI crawler documentation](https://developers.openai.com/api/docs/bots), [Anthropic crawler guidance](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler), and [Cloudflare rule precedence](https://developers.cloudflare.com/ai-crawl-control/configuration/ai-crawl-control-with-waf/).

## Measure name variations

Maintain a baseline for the following distinct query groups:

- The exact name: `Ahammed Nibras`.
- The joined name: `ahammednibras`.
- Observed variations: `Ahmed Nibras`, `Ahamed Nibras`, and `Ahamad Nibras`.
- Contextual forms: add `software engineer` or `Kozhikode` to distinguish namesakes.

Test additional spellings before prioritizing them. An ambiguous query can legitimately identify someone else. A short visible clarification is appropriate only when actual visitors or contacts use that spelling for Nibras; do not create hidden keyword lists or near-identical spelling pages.

Compare rolling 28-day Search Console impressions, clicks, click-through rate, and average position where volume permits. Keep country, device, and landing page comparable. A discovery regex such as `(?i)nibras|nibrash|nibrass|nibrs` can find candidate rows, but it also matches namesakes. Inspect the rows before counting them as demand for this person.

Low-volume queries can be omitted for privacy, so a missing typo row does not establish zero searches. Filtered totals can differ from overall totals. See [Google's regex filtering guidance](https://developers.google.com/search/blog/2021/04/performance-report-data-filtering) and [performance-data limitations](https://developers.google.com/search/blog/2022/10/performance-data-deep-dive).

Check the [Generative AI performance report](https://support.google.com/webmasters/answer/16984139) for AI Overview and AI Mode impressions by page, country, date, and device. The report may be absent when there are too few impressions. It does not provide a complete record of answers about Nibras.

## Check AI answers consistently

Use fresh conversations with search enabled in ChatGPT and Claude, and comparable Google AI experiences. Use the same prompts and region, repeat a few times, and record whether search actually ran.

1. “Who is Ahammed Nibras, the software engineer in Kozhikode? Cite sources.”
2. “Find Ahammed Nibras's official portfolio.”
3. “What did Ahammed Nibras build in Cascade? Cite the project evidence.”
4. “I'm looking for Ahmed Nibras, a software engineer in Kozhikode. What is his official website?”
5. “Who is Ahmed Nibras?” Use this deliberately ambiguous prompt to check whether the service distinguishes namesakes or asks for context.

Record date, product/model when shown, region, exact prompt, search use, correct person, official-domain link, supported factual claims, and namesake confusion. A clarifying question can be a good outcome for an ambiguous prompt. Check that each citation actually supports the claim.

Compare at approximately 4, 8, and 12 weeks after rollout; these are review checkpoints, not a promise of improvement. Use existing referral reporting and qualified enquiries where available, remembering that mentions without clicks and missing referrers are not captured. Do not add a tracking application just to establish the baseline.

Google documents that Search ignores `llms.txt` and does not require a special AI writing format. Keep useful evidence readable in the normal pages rather than maintaining a crawler-specific version. See [Google's generative AI optimization guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide).
