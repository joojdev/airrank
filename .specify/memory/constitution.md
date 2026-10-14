<!--
Sync Impact Report
Version change: 1.0.0 → 1.1.0
Modified principles: none
Added sections: Testing & CI Policy (under Development Workflow & Quality Gates context,
  as its own section before Governance)
Removed sections: none
Modified sections: Development Workflow & Quality Gates (test gate now references the policy);
  Governance (open decisions reduced to analytics)
Deferred items (intentional, tracked in docs/IDEA.md "Pontos em aberto"):
  - Analytics is not decided yet and MUST be amended in when decided.
History: 1.0.0 initial ratification (2026-10-13).
Templates requiring updates: none (templates read this file at runtime)
-->

# Airplane Guessing Game Constitution

## Core Principles

### I. Two Independent Parts, One Contract

The project is a monorepo with a web frontend (`apps/web`), a data job (`apps/data-job`) and a
shared package holding the Zod schemas and inferred types. The frontend MUST NOT collect or
fetch source data at runtime; it only reads the static output of the data job. The data job MUST
NOT import frontend code. Both sides depend on the shared schemas, never on each other.

Rationale: the game is fully static and hosted for free; a hard boundary keeps hosting simple
and lets each part change independently.

### II. Schema-First Data (NON-NEGOTIABLE)

Every data shape crossing a boundary (data job output, frontend input, configuration) MUST be
defined once as a Zod schema in the shared package. TypeScript types MUST be inferred from the
schemas, never hand-written in parallel. The data job MUST validate its output before writing
it, and the frontend MUST validate what it reads. Invalid data fails loudly; it is never
silently coerced or skipped.

Rationale: one source of truth prevents drift between producer and consumer.

### III. Static-Only Delivery

Everything served is static files on Vercel's free plan, including images. No server runtime,
no database, no runtime third-party data calls. Player state (last selection, high scores per
category/metric/difficulty) lives in `localStorage` only. The data job runs manually and
locally; its JSON and image output is committed to the repository. If repository size or
bandwidth approaches free-plan limits, this principle MUST be re-evaluated through the
amendment process rather than worked around.

Rationale: zero operating cost and zero operational burden for an unpretentious project.

### IV. Data Provenance and Attribution

Data comes from Wikidata and OurAirports; photos come from Wikimedia Commons first. Every photo
MUST carry its author and license in the data, and the UI MUST display the attribution those
licenses require. Items without a found photo go to a pending list and MUST NOT enter the game
until resolved. Items missing a metric MUST be excluded from that metric only. Pairs with
exactly equal values MUST always be discarded.

Rationale: licensing compliance and a fair game (no unanswerable comparisons).

### V. Paper UI, Flight Journal Identity

The interface MUST follow the Paper UI design system (paper-cut look, 2px ink outlines, hard
shadows without blur, 4px/10px radii, 80ms motion without bounce, IBM Plex Mono / Space Grotesk
/ Patrick Hand typography) with the Flight Journal color tokens (Paper `#F5F0E6`, Card
`#E4DAC8`, Ink `#182C3D`, Sage `#54766B`, Amber `#D18A52`). Color changes are made by
overriding CSS variable tokens, never by editing the vendored Paper UI bundle. A dark theme
derived from the palette MUST follow `prefers-color-scheme`, with text contrast of at least
4.5:1 in both themes. Copy uses sentence case, addresses the user as "você", and has no emoji.

Rationale: the visual polish is the main differentiator of the project.

### VI. Professional Finish on a Small Scope

Despite the casual scope, the result MUST feel finished: images served as AVIF/WebP via
`srcset`/`sizes` in multiple widths, keyboard-accessible controls with visible focus, and
responsive layouts. The UI MUST ship in pt-BR and English, default to the browser language, and
allow manual switching; airport and airline names stay in the original language. Difficulty
thresholds (ratio larger ÷ smaller: easy > 3x, medium 1.5x–3x, hard < 1.5x) MUST live in
configuration, not in code. Features beyond the documented version scope (for example item
"fame") MUST NOT be added without a spec.

Rationale: quality is a requirement, but scope creep is the main risk for a side project.

## Technology & Product Constraints

- Language: TypeScript everywhere, strict mode, in a monorepo.
- Validation and types: Zod, in the shared package.
- UI base: the Paper UI `bundle.js` (React 18, components in `window.Paper`) with color token
  overrides. Typing of the bundle and React 18 loading are to be settled in the implementation
  spec.
- Hosting: Vercel free plan, static output only.
- Data sources: Wikidata, OurAirports, Wikimedia Commons. Adding a source requires a spec that
  covers licensing and attribution.
- Product scope of version 1: three screens (selection, game, game over), categories airport and
  airline, two metrics each, three difficulties, share via Web Share API with copy fallback.

## Development Workflow & Quality Gates

- Work follows Spec Kit: specify → clarify → plan → tasks → implement. Non-trivial changes MUST
  start from a spec under the feature directory.
- Product decisions live in `docs/IDEA.md`; a spec that contradicts it MUST either update that
  document or be revised.
- Before merge, type-check, lint, the test suite and validation of the committed data MUST pass
  (see Testing & CI Policy).
- UI changes MUST be checked in light and dark themes and in both languages.
- Generated data and images are committed; hand-edited generated files are forbidden, so rerun
  the data job instead.
- Commits are small and focused, and commit messages in this repository omit the Claude
  co-author trailer.

## Testing & CI Policy

- Runner: Vitest, a single runner for the whole monorepo.
- Game rules (difficulty ratio, discarding equal-value pairs, pair generation, scoring) MUST be
  implemented as pure functions outside React components, and MUST have unit tests.
- Data job logic (normalization of Wikidata and OurAirports data, exclusion of items without a
  metric or photo, pending list) MUST be pure where possible and tested with fixtures of real
  saved responses. Tests MUST NOT access the network.
- Shared Zod schemas MUST have valid and invalid cases tested.
- A test MUST validate the committed data output against the shared schemas.
- Tests MUST exercise public function interfaces, not internal details. Snapshot tests, visual
  tests and tests of the vendored Paper UI components are NOT required, and no coverage target
  is set.
- TDD is not mandatory.
- CI (GitHub Actions) MUST run type-check, lint, Vitest and data validation on every push and
  pull request.
- An end-to-end smoke test (Playwright) across the three screens MAY be added once the UI
  stabilizes; it is not required for version 1.

## Governance

This constitution supersedes other practices for this repository. Amendments require a change
to this file stating the rationale, an updated Sync Impact Report, and a version bump:
MAJOR for removing or redefining a principle in an incompatible way, MINOR for adding a
principle or section or materially expanding guidance, PATCH for clarifications and wording.
Open decisions (currently only analytics) MUST be recorded here as amendments once decided.
Specs, plans and reviews MUST check compliance with these principles; any justified deviation
MUST be recorded in the plan's complexity/deviation notes. Runtime guidance for contributors
lives in `docs/IDEA.md`.

**Version**: 1.1.0 | **Ratified**: 2026-10-13 | **Last Amended**: 2026-10-13
