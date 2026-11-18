---
name: Ahammed Nibras Portfolio
description: Clear technical writing, restrained surfaces, and visible evidence.
colors:
  action: "#a11f35"
  action-visited: "#6f4350"
  action-active: "#641426"
  focus: "#007a73"
  canvas: "#f3f1ed"
  surface-raised: "#fff"
  ink-primary: "#17191a"
  ink-secondary: "#51565a"
  rule-quiet: "oklch(from var(--color-ink-primary) l c h / var(--alpha-grid))"
  rule-structural: "oklch(from var(--color-ink-primary) l c h / var(--alpha-structure))"
typography:
  display:
    fontFamily: '"IBM Plex Sans", "Helvetica Neue", helvetica, arial, sans-serif'
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.04em"
  headline:
    fontFamily: '"IBM Plex Sans", "Helvetica Neue", helvetica, arial, sans-serif'
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  title:
    fontFamily: '"IBM Plex Sans", "Helvetica Neue", helvetica, arial, sans-serif'
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.5
  introduction:
    fontFamily: '"IBM Plex Sans", "Helvetica Neue", helvetica, arial, sans-serif'
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.5
  body:
    fontFamily: '"IBM Plex Sans", "Helvetica Neue", helvetica, arial, sans-serif'
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  footer:
    fontFamily: '"IBM Plex Sans", "Helvetica Neue", helvetica, arial, sans-serif'
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: '"IBM Plex Mono", "SFMono-Regular", consolas, "Liberation Mono", monospace'
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.55
    letterSpacing: "0.06em"
rounded:
  control: "0px"
spacing:
  interface: "0.5rem"
  component: "1rem"
  editorial: "1.5rem"
  section: "3rem"
  touch-target: "2.75rem"
components:
  copy-email:
    backgroundColor: "transparent"
    textColor: "{colors.action}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0.5rem"
  gmail-compose:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.action}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0.5rem 1rem"
  text-link:
    textColor: "{colors.action}"
    typography: "{typography.body}"
  text-link-visited:
    textColor: "{colors.action-visited}"
  text-link-active:
    textColor: "{colors.action-active}"
  signature-band:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink-primary}"
  experience-entry:
    textColor: "{colors.ink-primary}"
    typography: "{typography.title}"
  recovery-link:
    textColor: "{colors.ink-primary}"
    typography: "{typography.body}"
---

# Design System: Ahammed Nibras Portfolio

## Overview

**Guiding description: "A clear conversation about the work."**

This records the visual system in the current working source, including the profile, experience, and contact changes. It is not a claim that those changes are deployed or that every interaction has passed verification. The source is [global.css](src/styles/global.css), the [document layout](src/layouts/DocumentLayout.astro), the route pages, and the shared components. Update this record when an approved implementation changes those sources.

The established direction is technical without resembling a terminal, precise without being cold, and quiet without being empty. Typography carries the reading hierarchy. White surfaces, dark red rules, and faint structural borders organize the page without shadows or ornamental containers. These descriptions come from [ADR 0002](docs/decisions/0002-personal-design-direction.md); no replacement identity or new visual metaphor is introduced here.

ADR 0002's living system map remains the direction for a future iteration. The current framed page is not an implemented map. Relationships in future work must connect real content, routes, or evidence.

**Key characteristics:**

- Readable technical content with a limited type and color vocabulary.
- Clear hierarchy through weight, spacing, and restrained rules.
- Responsive alignment that preserves the HTML reading order.
- Visible links and focus feedback, with motion limited to interaction states.

## Colors

The palette combines a warm off-white canvas, white surfaces, dark ink, dark red actions, and a separate teal focus signal. The frontmatter preserves the source values and semantic roles; it does not define a replacement palette.

### Primary

- **Action:** dark red for ordinary links, the copy icon and Gmail action, emphasis rules, and recovery labels.
- **Action visited:** muted red-purple for links already visited.
- **Action active:** deeper red while a link is pressed.
- **Focus:** teal for keyboard focus outlines. This is an interaction signal, not a second decorative accent.

### Neutral

- **Canvas:** warm off-white behind the document and footer.
- **Raised surface:** white for signature bands and the Gmail action.
- **Primary ink:** near-black for headings and reading text.
- **Secondary ink:** muted gray for location, experience metadata, recovery explanations, and email status feedback.
- **Quiet rule:** primary ink at the grid opacity (8%) for the page frame and section separators.
- **Structural rule:** primary ink at the structural opacity (12%) for experience and recovery-list boundaries.

The relative OKLCH rule colors depend on the existing root variables in the stylesheet. Their transparency is for structure, never for reading text. Do not turn the preview-only tonal ramps in the sidecar into new UI tokens.

In forced-color mode, links use system link, visited-link, and active-link colors. Focus uses the system highlight color. Preserve those overrides when refining controls.

## Typography

IBM Plex Sans supplies headings, body text, metadata, links, and the copy control. IBM Plex Mono supplies exact labels and the large 404 status. The layout imports local Latin font files: Sans Regular and Bold, plus Mono SemiBold. Do not add a remote font service to reproduce these roles.

The hierarchy is explicit rather than based on one fixed size ratio:

- **Display:** the main heading uses a fluid size, `clamp(2.25rem, 12vw, 3rem)`, with the weight, leading, and tracking in the frontmatter. The fluid expression stays here because the token format's dimension field cannot represent a clamp.
- **Headline:** section headings use the headline role, balanced wrapping, and tighter leading than body copy.
- **Title:** experience-entry headings use the title role. Their weight follows the native heading default; there is no separate title font file.
- **Introduction:** the paragraph immediately after the main heading uses the introduction role.
- **Body:** reading text uses the body role with a maximum measure of 68 characters (`68ch`). Links and list entries remain part of that reading system.
- **Footer:** the name/location line uses the smaller footer role and secondary ink.
- **Label:** recovery labels use the mono label role in uppercase. The 404 status uses the same font family and weight, with `clamp(5rem, 20vw, 9rem)`, leading of `0.8`, and tracking of `-0.08em`.

Do not use mono for sustained paragraphs. Keep names, role labels, dates, and technical facts readable without relying on a decorative type treatment.

## Layout

The centered document and footer share a maximum width of 76rem. The page uses a single column below 48rem, six equal columns from 48rem, and twelve from 72rem. The minimum supported page width in the stylesheet is 20rem.

The frontmatter spacing names match the stylesheet. Interface spacing belongs inside controls and close groups; component spacing separates related content; editorial spacing separates reading units; section spacing defines the major vertical rhythm. Section padding is the section step vertically and the component step horizontally, increasing to the editorial step horizontally at 48rem. Grid gaps similarly increase from component to editorial spacing.

At medium widths, introduction content spans the first five columns. In ordinary sections, headings span the first two columns and content occupies the remaining four. At wide widths, the introduction heading occupies columns two through five, while its supporting content occupies columns seven through eleven. Other section headings occupy columns two and three, with content beginning at column four. The footer identity follows the same wide grid.

GitHub and LinkedIn sit inline in the introduction after the role and concise scope, with small static Font Awesome brand marks and visible labels. Each link retains a 44px minimum touch target. There is no separate Public profiles section. Experience begins with the verified employment record; the detailed approach appears on About. From the medium breakpoint, section headings and their first content align at the top; stacked mobile sections retain the editorial gap.

## Elevation & Depth

Depth comes from the contrast between the canvas and raised surfaces, plus the distinction between quiet borders and strong rules. The current system has no box shadows. The page frame, dividers, and control outlines use the default border width (1px); signature bands use the emphasis width (0.25rem) above and below the surface. These measures belong to the sidecar because the frontmatter schema has no border-width token group.

Keep boundaries meaningful. Do not add generic cards or shadows merely to fill space or separate a group that already reads clearly.

## Shapes

The implemented form language is rectangular. The Gmail action has square corners; the copy icon has no border or surface box; sections, lists, and recovery links have no rounded-card treatment. There is no pill, chip, avatar, or dialog system to extend.

The favicon is the existing uppercase N derived from IBM Plex Sans Bold on the canvas color. Preserve that asset rather than inventing a separate logo system during refinement.

## Components

### Text links

All authored links request a new tab with explicit `target="_blank"` and `rel="noopener noreferrer"`. Title and `aria-describedby` hints announce that behavior without changing visible labels. The native email link explains that the browser may instead open an email application. No global base target or script interception is used.

Links remain visibly underlined. Their default underline thickness is `0.08em`, with an offset of `0.2em`; hover increases thickness to `0.13em` on devices that support hover. Active links use the active action role, and visited links use the visited role.

For pointer devices without a reduced-motion preference, color and underline thickness transition over the standard duration (180ms); pressing a link shortens the transition to 120ms. Both use the existing easing curve, `cubic-bezier(0.2, 0, 0, 1)`. There are no entrance animations. With reduced motion enabled, these transitions are absent.

### Copy-email control

The [shared email component](src/components/EmailContact.astro) keeps the address selectable and places an icon-only copy button immediately to its right. The sourced Font Awesome copy mark inherits the action color, with no border or decorative box. Its native button has a 44px hit target, an accessible Copy email address label, a title, and the shared focus outline with a compact 1px offset. The address can wrap while the icon remains inside the row.

The button appears only when JavaScript and a secure Clipboard API are available. A pending write disables it and uses secondary ink and a waiting cursor. Success and failure appear in a polite status paragraph after the awaited write; longer messages wrap. Hover and active states use the existing active action color. No new motion is introduced, including with reduced motion. In forced colors, the icon uses system button text and focus uses the system highlight.

Below the address, Write in Gmail is an underlined link action with the existing square border, raised surface, and control padding. Its compose URL encodes the recipient and does not force a sender account. Open email app remains a separate native-handler option. Both links and the selectable address work without JavaScript; the copy button stays hidden when unavailable. Actions wrap at narrow widths.

### Signature band

The existing white band between strong dark red rules marks identity and the homepage contact area. It uses the normal section grid and spacing. It is a presentation pattern in page markup, not a universal card component.

### Experience list

The [shared experience component](src/components/Experience.astro) is a semantic ordered list with list markers visually removed. Role and organization share a title line. Each organization name links to its company website in a new tab using the existing underlined text-link states. Dates use semantic time elements; dates and employment context use secondary ink. Later entries have a structural divider and editorial spacing. No timeline icons, logos, badges, expansion controls, or animation are implemented.

### Footer identity and route access

The footer retains Nibras's name and location as plain text. Its Home/About/Contact/Back to top list is removed, along with the unused main focus stop. There is no navbar or skip control. About retains “Back to home” in its introduction, and the dedicated 404 recovery actions retain Home and contact destinations. The rejected “About my approach” CTA is removed without a replacement; About remains directly addressable at `/about/`, with no link from Home under the approved scope.

### Recovery links

The 404 recovery area uses a bordered semantic list. Each whole link contains a mono label, a bold destination, and a secondary-ink explanation. Hover underlines the destination. The links stack on narrow screens and form two columns from the wide breakpoint, with a structural divider between them. The large 404 status is text, not decorative artwork.

### Shared focus behavior

Keyboard focus uses a solid outline (0.1875rem) with an equal offset. Preserve the outline and system-color override rather than replacing them with a color change alone. Email actions and profile links use the touch-target minimum. Contextual links stay within the reading text.

## Do's and Don'ts

### Do

- Do preserve the semantic color roles, IBM Plex families, and existing spacing rhythm.
- Do make hierarchy through reading order, clear headings, spacing, and meaningful boundaries.
- Do retain visible link labels and focus outlines across pointer, keyboard, touch, and forced-color use.
- Do keep complete content visible without JavaScript or animation.
- Do distinguish implemented patterns from pending changes and the future direction in ADR 0002.
- Do use real assets and evidence for diagrams, marks, and project presentation.

### Don't

- Don't substitute a new palette, font pairing, or visual identity during a scoped refinement.
- Don't add generic cards, shadows, pills, or ornamental diagrams without a real content or behavior boundary.
- Don't imitate a terminal, code editor, dashboard, or another site's branding.
- Don't use transparent reading text, hover-only meaning, hidden entrance states, or motion as a prerequisite for access.
- Don't create components, UI states, assets, or project claims merely to make this document look complete.
