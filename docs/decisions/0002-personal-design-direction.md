# 0002: Set a personal design direction

- Status: Accepted
- Date: 2026-09-23
- Updated: 2026-10-01

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

## Reconsider when

Reconsider this direction when human review repeatedly shows that visitors cannot understand what Nibras does, cannot find relevant evidence, or cannot reach the contact path. Also reconsider it if the map metaphor requires fake data, harms accessibility or performance, or makes the site feel like a generic developer dashboard.

Do not change the direction only because a new visual trend appears.
