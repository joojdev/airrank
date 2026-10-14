# Research: Higher or Lower Aviation Game (MVP)

All items below were decided from the project documents and the constitution. Items that depend
on live data or on files not in the repo are flagged as risks, not guessed.

## R1. Package manager and monorepo tooling

- **Decision**: npm workspaces, Node.js 24, no extra monorepo tool.
- **Rationale**: npm 11 and Node 24 are already installed; pnpm is not. Three packages do not
  need Turborepo or Nx.
- **Alternatives considered**: pnpm workspaces (better disk use, but one more install);
  Turborepo (caching not needed at this size).

## R2. Web framework and routing

- **Decision**: Vite + React 18 + TypeScript, single-page app, no router library. Screen state
  (Select, Game, GameOver) is held in a small state machine in the app root.
- **Rationale**: the Paper UI bundle requires React 18; three screens do not need URL routing.
  The share link points at the site root.
- **Alternatives considered**: Next.js static export (heavier than needed); a router library
  (adds nothing for three linear screens).

## R3. Paper UI bundle, types and React loading

- **Decision**: vendor `bundle.js` (and its CSS) into `apps/web/src/paper/`, write or copy a
  minimal `index.d.ts`, and load React 18 from npm so the bundle receives the same instance
  through `window.React`/`window.ReactDOM` before it is imported. Flight Journal tokens are CSS
  variable overrides in `src/styles/`, loaded after the bundle CSS.
- **Rationale**: matches the decision in `docs/IDEA.md`; avoids editing the bundle (Principle V).
- **Risk, needs input**: the bundle comes from a claude.ai artifact link that is not in the
  repository. The maintainer must export the bundle, its CSS and (if available) `index.d.ts`
  into `apps/web/src/paper/`. Until then, tasks that depend on it use a thin local wrapper
  with the same component names so the swap is a one-file change.
- **Alternatives considered**: rebuilding Paper UI components from the documented tokens
  (more work and drifts from the reference).

## R4. Internationalization

- **Decision**: a minimal in-house dictionary (two typed JSON objects, a `t(key)` helper and a
  React context). Detect `navigator.languages`: any `pt` variant maps to pt-BR, otherwise English.
  Manual choice is saved in `localStorage` and wins over detection.
- **Rationale**: about 40 strings and two languages; a library is more weight than benefit.
  Item names are never in the dictionaries.
- **Alternatives considered**: i18next or FormatJS (justified only with plurals and many locales).

## R5. Data sources and extraction

- **Wikidata** via the public SPARQL endpoint, run by the job only:
  - Airports: instances of airport with an IATA code, with passengers per year (P3872) and an
    image (P18). Eligibility "scheduled passenger service" is approximated by having an IATA
    code plus a positive passenger count, cross-checked with OurAirports `scheduled_service =
yes`.
  - Airlines: instances of airline that are not dissolved (no end date P576), with an IATA or
    ICAO code. Fleet size (P1090 or similar) and inception (P571) where present.
- **OurAirports** CSV (`airports.csv`, `runways.csv`): longest runway length converted to
  meters, `scheduled_service` flag, join to Wikidata by IATA/ICAO code.
- **Rationale**: the sources are free and fixed in `docs/IDEA.md`.
- **Risk**: Wikidata coverage of airline fleet size and founding year is unknown; the spec
  already handles it by hiding any metric below the minimum (FR-028). The first job run produces
  a coverage report that decides which metrics ship.
- **Alternatives considered**: OpenFlights or CAPA for airline data (licensing or paywall; only
  if coverage turns out too low).

## R6. Photos and images

- **Decision**: take the image from Wikidata P18, resolve file metadata (author, license, source
  page) through the Wikimedia Commons API, and keep only freely licensed files. Download, then
  with `sharp` produce widths 480, 960 and 1600 in AVIF and WebP (JPEG not kept, with WebP as
  the fallback for `<picture>`). Items with no usable photo go to `pending.json`.
- **Rationale**: matches the constitution (Commons first, attribution stored, pending list) and
  the 50–100 MB budget.
- **Alternatives considered**: hotlinking Commons (violates static-only and is slow);
  generating one width only (wasteful on mobile).

## R7. Pair generation algorithm

- **Decision**: pure function in `packages/shared`. Given items with a value for the metric, a
  difficulty and the set of already used pairs, it picks the next visible item (the previously
  revealed one) and then a candidate whose ratio (or year difference) falls in the difficulty
  range, with unequal values, not used in this game. If no candidate exists the game ends as a
  win. A seeded random source can be injected for tests.
- **Rationale**: purity makes it testable without React (constitution policy).
- **Alternatives considered**: precomputing all pairs in the job (large output, less flexible
  thresholds).

## R8. Browser storage

- **Decision**: one `localStorage` module with namespaced keys (see
  `contracts/browser-storage.md`), validated with Zod on read, with try/catch so a blocked
  storage never breaks the game (FR-024).
- **Rationale**: Principle III; storage failure must degrade silently.

## R9. Sharing

- **Decision**: `navigator.share` when available, otherwise `navigator.clipboard.writeText`, with
  a visible confirmation. The text is built from the translated labels plus the site URL.
- **Alternatives considered**: share-intent links per network (more code, more tracking).

## R10. CI and deployment

- **Decision**: GitHub Actions on push and pull request: install, type-check, lint (ESLint),
  Vitest, and the committed-data validation. Vercel builds `apps/web` with the Vite static
  output.
- **Rationale**: constitution Testing & CI Policy; Vercel free plan.
- **Open item**: the production URL used in the share text is configured at build time and is
  not known yet.
