# 0002: Set a personal design direction

- Status: Accepted
- Date: 2026-09-23

## Decision

Make the site feel like a clear conversation about the work:

- technical, but not dressed up like a terminal;
- precise, but not cold;
- experimental, but still reliable;
- detailed, but easy to scan;
- quiet, but not empty.

## Reason

A portfolio can look polished and still feel anonymous. This direction should make the work recognizably Nibras's without copying another website or adopting an AI-generated theme.

## Evidence or personal source

Every major visual choice must combine three references:

- [PlanetScale](https://planetscale.com/) for presenting technical evidence;
- IBM's _[System/360 Principles of Operation](https://www.bitsavers.org/pdf/ibm/360/princOps/A22-6821-6_360PrincOpsJan67.pdf)_ for information hierarchy;
- [Nibras's public work](https://github.com/ahammednibras8) for plain language, visible boundaries, and proof beside claims.

The color system has a more personal starting point. [Arsenal's off-white and dark red](https://www.arsenal.com/photos/the-inspiration-and-details-on-our-2526-third-kit-a4tcK6e5bV0Y) inform the canvas and action color. [Mercedes-AMG's black, silver, and PETRONAS green](https://www.mercedesamgf1.com/news/mercedes-amg-f1-2026-challenger-w17-revealed) inform the neutral structure and keyboard focus color. These are references, not copied brand palettes.

The repeating visual device is a raised white band held between two dark-red rules. It marks the three moments where the reader needs a clear signal: identity in the introduction, proof inside the case study, and action in the contact section. It extends an existing evidence treatment instead of adding an unrelated emblem.

The favicon uses an outlined uppercase N from the site's IBM Plex Sans Bold typeface. It uses the existing canvas and primary-ink colors so the browser mark identifies Nibras without introducing a separate logo system.

A 2024 study of short-story writing found that access to generative AI ideas improved how individual stories were evaluated while making AI-assisted stories more similar to one another. The study does not establish the same effect in web design. It does support using AI to critique an authored direction instead of asking it to choose the direction. See [“Generative AI enhances individual creativity but reduces the collective diversity of novel content”](https://doi.org/10.1126/sciadv.adn5290).

## Constraints

- Take principles from the three sources, not their appearance.
- Do not reproduce PlanetScale's branding, the manual's retro style, or GitHub's interface.
- Put the plain-language result before technical detail.
- Use real diagrams, measurements, and project evidence.
- Let readers move from a short summary to details they can inspect.
- Use normal reading type for the story and monospace only for exact technical information.
- Use alpha only for non-text depth: 8% for the grid, 12% for structure, and 20% for emphasis.
- Use canvas, recessed project, and raised evidence surfaces; separate sticky layers with rules rather than shadows.
- Reserve the red-ruled signature band for identity, proof, and contact; do not use it as a generic container.
- Keep motion optional and never depend on color alone.
- Preserve accessible HTML, speed, and no-JavaScript support.

## Where it is used

The rule applies to typography, color, layout, components, images, diagrams, motion, and case-study presentation. The content order in `src/pages/index.astro` is the starting structure that visual work must preserve or deliberately improve.

## Reconsider when

Change a source or rule when it blocks understanding, accessibility, or an honest presentation of the work, or when it no longer represents Nibras after human review. Do not change it only because a new visual trend appears.

AI follows the repository policy in [AGENTS.md](../../AGENTS.md): it may inspect, challenge, and test the work, but it does not choose the site's personality or make unsupported claims. Nibras chooses the direction, verifies the result, and owns the final decision.
