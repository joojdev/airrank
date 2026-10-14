# Implementation Plan: Higher or Lower Aviation Game (MVP)

**Branch**: `001-higher-lower-mvp` | **Date**: 2026-10-13 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-higher-lower-mvp/spec.md`

## Summary

A static Higher or Lower game about airports and airlines, plus a separate manual data job that
builds the dataset it reads. Approach: an npm-workspaces TypeScript monorepo with three
packages. `packages/shared` holds the Zod schemas and the pure game rules. `apps/data-job`
fetches from Wikidata, OurAirports and Wikimedia Commons, validates, converts images and writes
static JSON and images. `apps/web` is a Vite + React 18 single-page app styled with the Paper UI
bundle and Flight Journal color tokens. Everything is deployed as static files on Vercel.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Node.js 24 (already installed locally)

**Primary Dependencies**: React 18 and Vite (web); Zod (shared); `sharp` for AVIF/WebP
conversion and `tsx` to run scripts (data job); Vitest (all packages); Paper UI `bundle.js`
vendored (see research.md R3)

**Storage**: Static JSON and image files committed to the repo; `localStorage` in the browser
(last selection, language, best scores)

**Testing**: Vitest, per the constitution's Testing & CI Policy; GitHub Actions for CI

**Target Platform**: Modern evergreen browsers (phone and desktop), served by Vercel free plan

**Project Type**: Web application plus an offline data-preparation tool, in a monorepo

**Performance Goals**: first comparison answerable within 3 s on a typical mobile connection
(SC-005); images served in AVIF/WebP at several widths through `srcset`/`sizes`

**Constraints**: static-only hosting; no runtime data collection; dataset images stay roughly
within 50–100 MB total; text contrast of at least 4.5:1 in light and dark themes

**Scale/Scope**: about 500 items total, three screens, two categories with two metrics each,
three difficulties, two languages

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                              | Status | How the plan complies                                                                                                                              |
| -------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Two independent parts, one contract | Pass   | `apps/web` and `apps/data-job` only import `packages/shared`, never each other; the web app reads only static files under `public/data`.           |
| II. Schema-first data                  | Pass   | All shapes are Zod schemas in `packages/shared`; types are inferred; the data job validates before writing and the web validates on load.          |
| III. Static-only delivery              | Pass   | Vite static build on Vercel; no server; player state in `localStorage`; job runs locally and its output is committed.                              |
| IV. Data provenance and attribution    | Pass   | `Photo` carries author, license and source URL; the UI shows attribution; pending list excludes photo-less items; equal-value pairs are discarded. |
| V. Paper UI, Flight Journal identity   | Pass   | Vendored bundle with CSS-variable token overrides in a separate file; dark theme via `prefers-color-scheme`.                                       |
| VI. Professional finish, small scope   | Pass   | pt-BR/EN, responsive images, keyboard access, thresholds in config; no features outside the spec.                                                  |
| Testing & CI Policy                    | Pass   | Vitest, pure game rules, fixtures without network, committed-data validation test, GitHub Actions.                                                 |

Post-design re-check (after Phase 1): still passing. No Complexity Tracking entries needed.

## Project Structure

### Documentation (this feature)

```text
specs/001-higher-lower-mvp/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── dataset.md
│   └── browser-storage.md
└── tasks.md             # Phase 2 output (/speckit-tasks, not created here)
```

### Source Code (repository root)

```text
package.json                 # npm workspaces, shared scripts
tsconfig.base.json
.github/workflows/ci.yml     # type-check, lint, vitest, data validation

packages/shared/
├── src/
│   ├── schemas/             # Zod: Item, Photo, Metric, Manifest, Config, storage shapes
│   ├── game/                # pure rules: difficulty, pair generation, scoring
│   ├── config/              # metrics registry, difficulty thresholds
│   └── index.ts
└── tests/

apps/data-job/
├── src/
│   ├── sources/             # wikidata, ourairports, commons clients
│   ├── pipeline/            # eligibility, normalization, coverage, pending list
│   ├── images/              # download, resize, AVIF/WebP
│   ├── validate.ts          # validates produced output with shared schemas
│   └── main.ts
├── fixtures/                # saved real responses used by tests
├── pending.json             # items without a photo (not served)
└── tests/

apps/web/
├── public/
│   ├── data/                # committed job output: manifest.json, items-*.json
│   └── img/                 # committed job output: <item-id>/<width>.avif|webp
├── src/
│   ├── paper/               # vendored Paper UI bundle and its type declarations
│   ├── styles/              # Flight Journal tokens (light and dark)
│   ├── i18n/                # pt-BR and en dictionaries, language detection
│   ├── storage/             # localStorage access with graceful fallback
│   ├── screens/             # Select, Game, GameOver
│   ├── components/
│   ├── data/                # dataset loader and validation
│   └── main.tsx
└── tests/                   # includes the committed-data validation test
```

**Structure Decision**: npm workspaces monorepo (`apps/web`, `apps/data-job`,
`packages/shared`), as required by Principle I. The game rules live in `packages/shared` as pure
functions so they are unit-tested without React and could be reused by the data job to check
pair coverage.

## Complexity Tracking

No constitution violations to justify.
