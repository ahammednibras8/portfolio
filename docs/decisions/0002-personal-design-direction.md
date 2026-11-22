# 0002: Set a personal design direction

- Status: Accepted
- Date: 2026-09-23
- Updated: 2026-11-22

## Decision

Make the site feel like a clear conversation about the work:

- technical, but not dressed up like a terminal;
- precise, but not cold;
- experimental, but still reliable;
- detailed, but easy to scan; and
- quiet, but not empty.

For `v0.2`, develop that direction as a **living system map**. Present Nibras, his work, its architecture, its evidence, and the path to contact as parts of one navigable system. Every visible relationship must connect real content, routes, or evidence.

This is the direction for the next design iteration. It does not claim that the released `v0.1.0` site already implements the system map.

## Reason

A portfolio can look polished and still feel anonymous. The original direction gave the site a restrained, authored identity without copying another website or adopting a familiar AI-generated theme.

Human review also exposed a limit. One nontechnical reviewer compared the desktop page to a PDF. The reviewer did not report a usability problem, but the description matched the page structure: one framed reading area, long top-to-bottom flow, repeated horizontal rules, restrained motion, and navigation that mostly jumps within the same document. The technical-manual reference had shaped the interface too literally.

The next version should preserve the clarity of that document while making the browser feel necessary. A living system map fits Nibras's backend and infrastructure work because it can show real paths, boundaries, dependencies, and evidence without imitating a terminal, code editor, or application dashboard.

Raw feedback notes and reviewer identities remain private. This record publishes only the anonymized observation that affected the decision.

## Evidence or personal source

Every major visual choice must continue to combine three references:

- [PlanetScale](https://planetscale.com/) for presenting technical evidence;
- IBM's _[System/360 Principles of Operation](https://www.bitsavers.org/pdf/ibm/360/princOps/A22-6821-6_360PrincOpsJan67.pdf)_ for information hierarchy; and
- [Nibras's public work](https://github.com/ahammednibras8) for plain language, visible boundaries, and proof beside claims.

The color system has a personal starting point. [Arsenal's off-white and dark red](https://www.standard.co.uk/sport/football/arsenal-fc-new-third-kit-unveiled-b1241341.html) inform the canvas and action color. [Mercedes-AMG's black, silver, and PETRONAS green](https://www.mercedesamgf1.com/news/mercedes-amg-f1-2026-challenger-w17-revealed) inform the neutral structure and keyboard focus color. These are references, not copied brand palettes.

The released site uses a raised white band between two dark-red rules to mark identity, proof, and contact. Its favicon uses an outlined uppercase N from IBM Plex Sans Bold. Both treatments established continuity without inventing a separate logo system.

A 2024 study of short-story writing found that access to generative AI ideas improved how individual stories were evaluated while making AI-assisted stories more similar to one another. The study does not establish the same effect in web design. It does support using AI to critique an authored direction instead of asking it to invent the personality. See [“Generative AI enhances individual creativity but reduces the collective diversity of novel content”](https://pmc.ncbi.nlm.nih.gov/articles/PMC11244532/).

## What must remain

- Put the plain-language result before technical detail.
- Use real diagrams, measurements, project records, and public sources as evidence.
- Keep the existing canvas, surface, ink, action, and focus roles unless testing shows that a role no longer works.
- Keep IBM Plex Sans for sustained reading and IBM Plex Mono for exact labels, states, identifiers, and measurements.
- Preserve the spacing rhythm, restrained surface depth, and distinction between quiet and strong rules.
- Keep important content and navigation in semantic built HTML.
- Preserve keyboard, touch, reduced-motion, forced-color, no-JavaScript, performance, and accessibility behavior.
- Keep the site recognizable as Nibras's work rather than a copied product site or a collection of current design trends.
- Keep AI in a review role. Nibras chooses the direction, verifies the claims, and approves the result.

## What should change

- Move from one continuous framed document toward meaningful routes for projects, architecture, and contact.
- Let the homepage provide a clear overview, then expose deeper evidence through visible links instead of requiring every visitor to read every detail.
- Use rules as real connectors, boundaries, and route markers rather than repeating them only as document separators.
- Show relationships spatially on wide screens and preserve the same semantic order as a clear linear path on narrow screens.
- Make hover, keyboard focus, and touch states clarify where a path leads or how two pieces of evidence relate.
- Use motion only when it explains a state or path change. Never hide content in preparation for animation.
- Keep the red-ruled evidence treatment, but stop using it as the only signal for every important moment.
- Make the first reading layer understandable to recruiters and hiring managers while leaving technical depth available to engineers and curious developers.

## Constraints

- Take principles from the three sources, not their appearance.
- Do not reproduce PlanetScale's branding, the manual's retro style, or GitHub's interface.
- Do not add editor panes, command prompts, terminal windows, dashboard chrome, glowing graphs, or a draggable canvas.
- Do not publish fake live status, uptime, visitor counts, activity streams, deployment events, or operational metrics.
- Do not turn every item into a generic card or draw a connection that has no real destination.
- Do not add JavaScript solely to animate the map. Any client behavior must progressively enhance complete HTML and justify its cost.
- Use alpha only for non-text depth: 8% for the grid, 12% for structure, and 20% for emphasis.
- Use canvas, recessed, and raised surfaces; separate layers with border contrast before considering shadows.
- Do not depend on color, hover, animation, or a wide viewport to communicate meaning.

## Where it is used

The decision applies to typography, color, layout, components, routes, diagrams, interaction states, motion, and case-study presentation.

The current `src/pages/index.astro` and `src/styles/global.css` remain the `v0.1.0` baseline. Future `v0.2` changes must deliberately evolve that baseline and prove the living-system-map direction through working routes and evidence. Do not add decorative map elements before the connected content exists.

On 2026-11-17, Nibras removed the released homepage case study because the project no longer met the standard he wants the portfolio to represent. Until reviewed work is ready, the homepage keeps its identity and contact paths without placeholder project content. Future project claims still require evidence and Nibras's approval.

### Profile, experience, and contact

Nibras's feedback in [issue 76](https://github.com/ahammednibras8/portfolio/issues/76) sets the next focused change: public profiles belong immediately after identity, experience needs to be visible, the role is Software developer, and the navbar and focus-revealed skip link should go. Remove the sentence explaining that the same username is used on GitHub and LinkedIn; the links already communicate their destinations.

Keep the existing palette, typography, and section grid. Put GitHub and LinkedIn inline in the introduction with small static brand icons and visible labels, before experience in both HTML and visual order. Remove the separate Public profiles section: two supporting links should not delay the employment record. Use the sourced Font Awesome Free marks with their attribution and no icon runtime. Keep the detailed screen-to-worker approach on About and remove repeated positioning before the roles. Align headings and their first content on desktop while retaining stacked spacing on mobile. The main landmark starts the visible document, so there is no repeated header to bypass.

On 2026-11-18, Nibras requested removal of the footer navigation and clarified that his name and location must remain. Keep that identity line as plain text; remove only the Home/About/Contact/Back to top list and its unused styling. Remove the main landmark’s programmatic focus stop, which served Back to top. Nibras also rejected the added “About my approach” CTA and requested no replacement Home-to-About link. About retains its contextual Back to home link, both pages retain email contact options, and 404 retains dedicated Home and contact recovery actions. About remains available at its existing URL but is no longer discoverable through a link on Home. Reconsider that limitation only when Nibras wants a different route. This preserves complete built HTML and no-JavaScript access without adding replacement navigation.

On 2026-11-20, Nibras requested removal of the About page because he no longer wants it. This supersedes the earlier instructions to retain its route and detailed approach. Remove the page without moving that content elsewhere or adding a replacement route. Its former URL returns the authored 404 page and is excluded from the sitemap. The homepage remains the identity, experience, and contact destination. Remove unused ProfilePage support and inline the experience list into the homepage now that its shared presentation boundary no longer exists. Reconsider only if Nibras requests another page.

Present experience in reverse chronological order with company, role, dates, and concise employment context. Omit duplicated labels and elapsed-month counters. Nibras supplied the Insource Data and NysaClan roles and dates, and his [public profile README](https://github.com/ahammednibras8/ahammednibras8) supplies the general professional scope. Do not assign that general scope, other contributors' commits, or an organization-wide project to a particular role without evidence. This follows [Harvard's guidance](https://careerservices.fas.harvard.edu/resources/create-a-strong-resume/) on factual, specific writing that is easy to scan. Company-specific achievements remain subject to Nibras's review.

Keep the public profiles focused on GitHub and LinkedIn. Nibras chose to omit his Google developer profile and the proposed cloud-learning content. Reconsider when he wants to publish specific, verified credentials.

Keep the email address as selectable text. On 2026-11-18, Nibras requested an icon-only copy action immediately to its right and an additional Write in Gmail action. Retain Open email app rather than replacing other contact paths with Gmail. The compose link uses `https://mail.google.com/mail/?view=cm&fs=1&to=` with an encoded recipient, no forced sender account, and no message submission. This is an optional provider-specific entry point; authenticated Gmail behavior is subject to Google's interface and login requirements. Do not claim that most visitors use Gmail. [Apple's guidance](https://support.apple.com/en-bh/102362) still explains why native mail links cannot be the only contact path. [GitHub's copy element](https://github.com/github/clipboard-copy-element) remains a pattern reference, not a dependency.

The shared email component requires one address and has no slots. Its root is a div containing an address row, an icon-only native button with an accessible Copy email address label and title, Gmail/native-app links, and a polite status paragraph. Use the sourced Font Awesome Free copy SVG with attribution, not an icon runtime. The button is hidden until a secure Clipboard API is available. Click, Enter, and Space copy only the address. Pending writes use aria-disabled with an activation guard, preserving keyboard focus while ignoring duplicate attempts. Completion never moves focus if the visitor has moved elsewhere. Success follows a completed write, and failure directs manual copying. On 2026-11-18, Nibras requested transient feedback instead of persistent visible success prose. A successful write shows “Copied” above the icon for two seconds and changes only the copy glyph to primary ink for 300ms, with a visually hidden polite announcement. Clicking or tapping elsewhere, leaving the button with keyboard focus, or pressing Escape dismisses feedback, a new attempt resets timers, and no blank status row is reserved. Failure keeps visible manual-copy guidance until the next attempt. Preserve a 44px hit target, visible focus, hover/active/disabled states, and a wrapping address that does not push the icon offscreen. Color transitions last 120ms only without reduced motion; no spatial animation is used. Without JavaScript or API support, the address and both compose choices remain usable. Delete the component if its shared contact behavior disappears.

On 2026-11-19, Nibras rejected the filled copy-success square and the boxed Gmail action. Keep the copy background transparent through success; change only the glyph color, while retaining the tooltip and live announcement. Present Write in Gmail as a plain underlined link alongside Open email app, preserving both destinations and 44px target heights. This supersedes the earlier filled success surface and bordered Gmail treatment.

After successful trusted touch activation, request a single 10ms `navigator.vibrate` pulse only when available and reduced motion is not requested. Skip mouse/keyboard and failed writes; false returns or exceptions must not alter success. The [Vibration specification](https://w3c.github.io/vibration/) records Chromium implementation, WebKit opposition, and Firefox removal. [WebKit’s position](https://github.com/WebKit/standards-positions/issues/267) means this is not an iOS/Safari haptic promise. Hardware, browser activation rules, and user settings can prevent a pulse. Do not imitate haptics with an HTML switch: [WebKit’s switch control](https://webkit.org/blog/15054/an-html-switch-control/) represents an actual on/off setting, which copying is not. Visual and accessible feedback are universal; optional vibration needs no dependency or fallback trick.

Nibras also requested that every authored link on Home, About, and 404 open in a new tab. Apply explicit `target="_blank"` and `rel="noopener noreferrer"` to each anchor, including companies, public profiles, contact choices, and internal recovery routes. This supersedes the earlier same-tab company-link behavior. Add concise title and `aria-describedby` hints, informed by [W3C's advance-warning guidance](https://www.w3.org/WAI/WCAG21/Techniques/general/G201), while preserving visible names. The mail link requests a new tab but the browser can still invoke its configured email handler; do not promise a tab instead of an app. Use native links rather than a global base target, a universal link wrapper, or JavaScript interception. Reconsider compose URLs if Gmail changes its routing, and reconsider the tab policy only when Nibras requests a different behavior.

The homepage renders the two reviewed roles as an ordered list. Each entry requires a company, its public website URL, role, start month, end month or Present, and employment context. Nibras supplied the company URLs on 2026-11-18: [Insource Data](https://insourcedata.io/) and [NysaClan](https://nysaclan.com/). Link only the organization name using ordinary underlined text links, preserving native keyboard and new-tab navigation without JavaScript. Entries remain in document order and wrap within the existing section grid at all widths. No animation or client script is needed. The former shared experience component is removed with About; keep the markup in the homepage until reuse or distinct behavior creates a new component boundary.

On 2026-11-22, Nibras approved a privacy notice and browser-specific analytics
exclusion under [ADR 0005](0005-hosted-portfolio-analytics.md). Keep the footer
identity as plain text and place one contextual link on the right: Privacy on
the homepage and Home elsewhere. These footer links open in the current tab.
This updates the earlier footer and tab directions for that navigation;
main-content links retain their existing new-tab behavior. The privacy control
uses a native checkbox with the existing action color and shared focus outline.

## Reconsider when

Reconsider this direction when human review repeatedly shows that visitors cannot understand what Nibras does, cannot find relevant evidence, or cannot reach the contact path. Also reconsider it if the map metaphor requires fake data, harms accessibility or performance, or makes the site feel like a generic developer dashboard.

Do not change the direction only because a new visual trend appears.
