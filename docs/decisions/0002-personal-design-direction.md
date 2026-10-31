# 0002: Set a personal design direction

- Status: Accepted
- Date: 2026-09-23
- Updated: 2026-10-31

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

The color system has a personal starting point. [Arsenal's off-white and dark red](https://www.arsenal.com/photos/the-inspiration-and-details-on-our-2526-third-kit-a4tcK6e5bV0Y) inform the canvas and action color. [Mercedes-AMG's black, silver, and PETRONAS green](https://www.mercedesamgf1.com/news/mercedes-amg-f1-2026-challenger-w17-revealed) inform the neutral structure and keyboard focus color. These are references, not copied brand palettes.

The released site uses a raised white band between two dark-red rules to mark identity, proof, and contact. Its favicon uses an outlined uppercase N from IBM Plex Sans Bold. Both treatments established continuity without inventing a separate logo system.

Nibras later replaced the dark red and off-white with navy `#013A63` and soft aqua, which supersedes the color references in this record. Navy takes every action role, the page canvas is a pale aqua `#DFF3F4`, and a stronger aqua `#8FD8DC` highlights the name and fills the About band. The ink for text and outlines is unchanged, and every text pairing was checked against WCAG AA.

A 2024 study of short-story writing found that access to generative AI ideas improved how individual stories were evaluated while making AI-assisted stories more similar to one another. The study does not establish the same effect in web design. It does support using AI to critique an authored direction instead of asking it to invent the personality. See [“Generative AI enhances individual creativity but reduces the collective diversity of novel content”](https://doi.org/10.1126/sciadv.adn5290).

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

- Give the projects, architecture, and contact their own clearly marked sections.
- Let the homepage provide a clear overview, then expose deeper evidence through visible links instead of requiring every visitor to read every detail.
- Use rules as real connectors, boundaries, and route markers rather than repeating them only as document separators.
- Show relationships spatially on wide screens and preserve the same semantic order as a clear linear path on narrow screens.
- Make hover, keyboard focus, and touch states clarify where a path leads or how two pieces of evidence relate.
- Use motion only when it explains a state or path change. Never hide content in preparation for animation.
- Keep the red-ruled evidence treatment, but stop using it as the only signal for every important moment.
- Make the first reading layer understandable to recruiters and hiring managers while leaving technical depth available to engineers and curious developers.

## Homepage gallery wall

The homepage presents its three routes as a gallery wall: white plates between dark-red rules, large titles, open space, and small museum-style labels. Nibras chose this on 2026-10-30 from three mockups (poster, single line, and gallery wall) because it looked clean and felt closer to art.

The plates replace the numbered vertical connector on the homepage. Nibras extended the style to every section on the same day. Each major section opens with its title as an exhibit and its introduction on a small placard. Each plate must lead to a real destination and keep its full content in the built HTML. The plates are not a universal card.

Nibras then asked for a conventional portfolio structure and a page that keeps scrolling without clicks. The site is one continuous page: the hero, Selected work, the full Cascade case study, the site architecture, About, and Contact. The separate Cascade, architecture, and contact routes are gone, and the primary navigation jumps to sections. This replaces the earlier move toward separate routes. These sections use only existing, reviewed copy. Do not add experience, education, or skills content until Nibras supplies it.

Pointer motion uses CSS only, and touch screens get a small TypeScript trigger described below. Every link and control answers hover and keyboard focus: plate titles and arrows move toward the destination, the placard rule draws, navigation underlines draw, and diagram icon details respond. Apart from the cartoon pop-outs below, elements that are not interactive do not animate on hover, because hover must not suggest a destination that does not exist. Reduced-motion visitors keep the same states without the movement.

Nibras then asked for a cartoon style. Plates, the diagram, and labels use thick ink outlines, drawn-looking corners, and hard offset shadows in the ink role, which replaces the earlier preference for borders without shadows. Each route adds stickers, speech bubbles, a comic dot pattern, and bouncy hover motion. Sticker frames keep their original angle while their icon details animate on hover. The homepage hand waves hello once when the portrait is hovered, then returns to rest. Nibras requested the portrait hover as the trigger; reduced-motion visitors keep the hand still. Speech bubbles and labels pop on hover. Nibras first chose hover over scroll animation for these, then later asked for the slide parts recorded below. The homepage headline carries a red sweep once on load and again on hover. The band starts and ends beyond the text, so the sweep never hides the words, and ordinary text remains for print, forced colors, and reduced motion. Nibras asked to replace the wave underlines after they looked untidy and overlapped descriptions in the diagram. Hover underlines now use a thin rounded stroke that grows from the start of the text to its end and retracts the same way. Diagram cards reserve space between the title and description for that stroke, and plain links keep a straight line at rest so they stay recognizable. Every animation must start and end cleanly: declare transitions at rest so an element eases back, bounce only on arrival, and give keyframes explicit 0% and 100% stops at the resting state. Motion never hides content, and reduced-motion visitors do not see it.

Nibras asked to tidy the contact section because the oversized Email plate and uneven column widths looked messy. Contact now uses four equally sized, level cards in a two-column grid, stacking in one column on narrow screens. Each card uses the same title size, icon size, padding, and action placement. Email remains first in reading order, and all four destinations remain visible links. Smaller shadows and icons keep contact consistent with the cartoon direction without repeating the large exhibit treatment.

Nibras asked for every icon type to have its own animation identity, then asked on 2026-10-31 for cleaner motion on the different parts because whole-icon movement did not match the icons. Keep the main shapes and sticker frames steady. Animate the meaningful existing detail: the upload arrow inside its cloud, envelope flap, checkmark inside its shield, server indicator lights, pupil inside its eye, or meridian inside its globe. The message icon uses Lucide's unchanged MessageCircleMore variant so its three dots can type in sequence inside a fixed bubble. Arrows travel in their pointing direction, and the portrait hand waves from the wrist once per hover. These gestures are decorative, not live system status or extra controls. Icons respond to direct hover or their containing link, heading, sticker, or lifecycle step; links also respond to keyboard focus. Every gesture plays once and settles back to its original appearance. Keep the original Lucide geometry unchanged and keep all icon motion off for reduced-motion visitors and print.

Nibras then asked for slower, smoother icon motion, tried it on every icon, and kept it only for the Verify and build and Production approval checks. Those two checks redraw on a gentle sine ease in about 1.75 times their earlier time, and they finish after the pointer leaves, because removing a running animation snaps the part to rest and no transition can ease that jump. The finish uses a style query held by a delayed transition. Firefox never clears that held query, which would stop later gestures, so Firefox skips the query and ends the check when the hover ends. Reconsider this exception when Firefox clears the query correctly. Every other icon keeps its original timing.

Nibras asked for the dotted background to roll like a wave when a visitor hovers the words “Hi, I’m Nibras.” or “Cascade”. Only those two headings start it, and the site diagram hero stays still. Each of the twelve dot columns in one wavelength is its own background layer, because sliding one gradient can only move the whole grid. The layers match the plain dots at rest, the wave swells in and flattens through a transition on its height, and it stops painting when the hover ends. Keep the layer count low: sixteen layers cost Chromium frames without a graphics processor, and twelve did not. Reduced-motion visitors, forced colors, and print keep the plain dots.

Nibras saw that phones showed almost no motion because every gesture waited for a hover, then asked for TypeScript as well as CSS. `src/scripts/touch-motion.ts` runs only on touch-only screens without reduced motion. Each icon pops and plays as it scrolls into view, the dots roll when each hero appears, and tapping “Hi, I’m Nibras.” or “Cascade” rolls them again. The first version was too faint to notice on a real phone, so phones get stronger motion than hover does. Nibras tried bold red dots that faded back to pale, then asked to remove that fade, so the dots keep their pale color on every device. The script also starts on the first real touch, because some phones wrongly report that they can hover. This reverses the earlier rule that kept touch screens still. Mouse visitors keep hover. The script is decoration, so the complete page still works without JavaScript. The security policy allows scripts from this site only, and inline scripts stay blocked, so Astro must always emit scripts as files.

Nibras then asked to try three extras on phones after hearing the case against them. Taps on links and hero headings give a short vibration, which iPhones ignore. The portrait leans a few pixels with the phone, and the sensor runs only while the portrait is on screen. Some browsers, including Safari on iPhone, unlock the sensor only from a tap, so tapping the portrait asks instead of prompting on load. The site is installable from a web app manifest with icons rendered from the favicon. A small service worker shows `/offline/` when a page cannot load, on a navy screen that reloads itself when the connection returns. It answers from its cache only after the network fails and never stores live pages, so a deploy or rollback still reaches every visitor. The installed app needs a connection for everything except that page. Tilt and installing both need HTTPS. Reduced-motion visitors get neither vibration nor tilt.

The homepage hero shows Nibras's own portrait in a cartoon frame beside the name, so the speech bubble reads as Nibras speaking. Store the portrait in `src/assets/` with its metadata removed. Printing is the exception to the cartoon style. Nibras asked for a clean print layout, so the print stylesheet removes the portrait, stickers, shadows, and controls, moves the contact details to the top, and keeps the content to two A4 pages.

Nibras asked to redesign the homepage heading, which read as plain text beside a cartoon page. A tilted red plate with sketched corners came first, and Nibras rejected it because it distorted the name. “Hi, I’m” now leads into a large navy “Nibras.” with one straight aqua highlight. Keep the name straight and undistorted: no plate, tilt, or warped outline. The two lines stay one heading, so assistive technology still reads “Hi, I’m Nibras.” The portrait grew and the speech bubble lines up under the name. On phones the name comes first, because a visitor should meet the person before the photo. Print keeps plain text.

Nibras asked for the site to work on every device. The layout now fits from a 240px screen to a 3840px monitor, and with browser text at 200%, so never set a minimum page width. Phones on their side move the portrait beside the words, and short screens tighten the hero so the buttons stay close. Screens from 2560px scale the type up instead of leaving a narrow column. The build rewrites newer CSS syntax for older browsers, and colors avoid relative color syntax, so older iPhones and iPads keep the dots, rules, and wide layouts.

Nibras asked to redesign everything, because below the hero the site read as a pale document of identical outlined boxes. The page now runs as full-width color bands that carry the comic style down the site: a navy header and footer, navy Cascade and Contact bands, and an aqua About band. The case study breaks into scannable cards with navy tab labels, the run lifecycle becomes a navy centerpiece, and About becomes one large speech bubble. All words, links, and the deployment diagram's content are unchanged. On navy, focus rings and card shadows turn aqua so they stay visible. The bands live in `src/styles/bands.css`, screen only, so print keeps its plain document.

Nibras asked for a slide interface that breaks everything into parts, which reverses the earlier rule that nothing moves on scroll. The homepage now runs as nine parts. Short parts fill the screen, and a side rail shows the current part and jumps between them. Pieces slide in from their own side as they arrive. Do not use CSS scroll snapping: it pulled a slow mouse wheel back to where it started, so the page seemed frozen, and it blocked the footer. A small script docks instead, finishing a scroll that stops just short of a part, and only ever in the direction it was already moving, so it cannot trap anyone. Waiting pieces only sit a little off their place and stay fully visible, so motion still never hides content and the page works without JavaScript. The first view never moves. Reduced motion turns off the sliding and the docking, and print leaves the rail out.

Every SVG comes unchanged from Lucide. Stickers are decorative, stay hidden from assistive technology, and never replace visible text. Do not hand-draw SVG paths or approximate a brand mark: GitHub and LinkedIn use generic Lucide icons until an official asset is added.

Art on the site comes from typography, space, and composition. Do not add AI-generated artwork to fill a plate. Reconsider the gallery wall when the homepage needs more routes than the plates can hold, or when human review shows the plates hide what Nibras does.

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

## Reconsider when

Reconsider this direction when human review repeatedly shows that visitors cannot understand what Nibras does, cannot find relevant evidence, or cannot reach the contact path. Also reconsider it if the map metaphor requires fake data, harms accessibility or performance, or makes the site feel like a generic developer dashboard.

Do not change the direction only because a new visual trend appears.
