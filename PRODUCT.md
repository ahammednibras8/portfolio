# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Recruiters assessing Nibras for software developer roles.
- Hiring managers evaluating his experience, responsibilities, and suitability for a role or contract.
- Developers reviewing the technical work and the evidence behind it.

## Product Purpose

Help Ahammed Nibras find software developer roles and suitable contract work. Both are goals; the portfolio must not imply that he is interested in only one employment arrangement.

Visitors should be able to understand what he does, assess his experience and available work, and contact him about a relevant opportunity. Success means relevant conversations about roles and contracts, rather than visits alone. No numerical conversion target has been set.

## Positioning

Nibras's published professional focus is AI product features, backend systems, infrastructure, and production reliability. Show what he worked on, what he owned, and the evidence available for each claim. His public profile describes a general technical scope; it does not establish which activities belong to each employer.

## Operating Context

The portfolio is a public website at [ahammednibras.com](https://ahammednibras.com/). Its existing routes include the homepage, About, and an authored 404 page with recovery links.

GitHub and LinkedIn are the public profile destinations. Email is a contact path for both roles and contract work. Visitors must be able to obtain the address without configuring a native mail application.

Nibras reviews factual claims and makes final design decisions. Codex in T3 Code is the current development environment; Impeccable supports scoped review and refinement within the repository's instructions.

## Capabilities and Constraints

- Preserve Astro static output. Important content and navigation must exist in the built HTML and remain usable without JavaScript.
- Prefer semantic HTML, Astro components, and CSS. Client behavior must progressively enhance complete HTML and justify its cost.
- Do not introduce a client framework, server rendering, Pages Functions, a database, or an application server without a new accepted architecture decision.
- Use Software developer as Nibras's general role. Preserve verified historical job titles when describing individual positions.
- Keep public profile links focused on GitHub and LinkedIn. Nibras chose to omit the Google developer profile and proposed cloud-learning content from this change.
- Use the supported Node.js and pnpm versions and the quality gates defined in [AGENTS.md](AGENTS.md).
- Keep architecture and substantial design decisions in the decision ledger, including [ADR 0001](docs/decisions/0001-static-astro-site.md) and [ADR 0002](docs/decisions/0002-personal-design-direction.md). This product record does not replace that ledger.

## Brand Commitments

The identity is Ahammed Nibras. Preserve the existing palette and IBM Plex typography, as explicitly requested. [ADR 0002](docs/decisions/0002-personal-design-direction.md) remains the authority for the authored design direction and its references.

Use direct, specific language that explains the work. Avoid filler, repeated capability claims, invented personality, and unsupported praise. Follow the [writing guide](docs/content/writing-voice.md).

AI may review, challenge, and refine implementation. It must not invent project evidence, choose a replacement identity, or make substantial design choices without recorded reasoning and Nibras's decision.

## Evidence on Hand

- Nibras supplied these employment facts: Developer at Insource Data, contract and remote, January 2026 to present; Intern at NysaClan, remote, June to September 2025. The working implementation records them in [src/data/experience.ts](src/data/experience.ts).
- [Nibras's public GitHub profile README](https://github.com/ahammednibras8/ahammednibras8) describes work involving AI features, backend services, infrastructure, observability, security, and testing. Treat it as a personal source for that general scope, not proof of individual company outcomes.
- Shared identity and public destinations are maintained in [src/data/profile.ts](src/data/profile.ts).
- There is no currently approved replacement project case study following the removal recorded in ADR 0002. Missing work must not be replaced with placeholder projects or invented claims.
- Employer-specific accomplishments, quantitative results, customer names, and credentials require verification before publication. An organization's repository or another contributor's commit is not evidence of Nibras's personal contribution.
- Keep secrets, private client information, and unpublished evidence out of public content and Git. Follow the [evidence and disclosure rules](docs/content/evidence-and-disclosure.md).

## Product Principles

1. Make the role, experience, and contact path easy to understand.
2. Put evidence beside claims and distinguish personal ownership from team work.
3. Make the first reading useful to a hiring audience while leaving technical depth available to developers.
4. Prefer complete, accessible HTML over interaction that obscures or gates content.
5. Remove content that repeats a link, claim, or example without adding useful information.

## Accessibility & Inclusion

Preserve keyboard and touch access, visible focus, reduced-motion support, forced-color support, narrow-screen usability, and access without JavaScript. Do not rely on hover, color, animation, or a wide viewport to convey meaning.

The existing automated accessibility checks target WCAG 2.2 AA alongside earlier applicable checks. Keep browser, HTML, accessibility, and performance gates in place; automated checks do not replace review of the actual experience.
