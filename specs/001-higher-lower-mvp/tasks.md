---
description: "Task list for the Higher or Lower Aviation Game (MVP)"
---

# Tasks: Higher or Lower Aviation Game (MVP)

**Input**: Design documents from `/specs/001-higher-lower-mvp/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included. The constitution's Testing & CI Policy requires tests for the game rules,
data job logic, schemas and the committed dataset. No snapshot, visual or Paper UI component
tests, and no coverage target. TDD is not mandatory, so a test may be written right after its
implementation.

**Organization**: Tasks are grouped by user story. All paths are relative to the repository
root.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label from spec.md (US1 to US5)

## Story map

| Label | Story                               | Priority |
| ----- | ----------------------------------- | -------- |
| US1   | Play a round of Higher or Lower     | P1       |
| US2   | Choose what to play                 | P1       |
| US3   | End of game, record and share       | P2       |
| US4   | Language and theme                  | P2       |
| US5   | Game data is prepared ahead of time | P1       |

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Monorepo skeleton and tooling

- [x] T001 Create the npm workspaces root `package.json` (workspaces `apps/*`, `packages/*`, scripts `typecheck`, `lint`, `test`, `build`), `.nvmrc` with Node 24, and a `.gitignore` covering `node_modules`, `dist` and `.vercel`
- [x] T002 Create `tsconfig.base.json` with strict mode, ES2023 target and bundler module resolution, and a `tsconfig.json` in each of `packages/shared`, `apps/data-job` and `apps/web` extending it
- [x] T003 [P] Scaffold `packages/shared` (`package.json` named `@agg/shared`, `src/index.ts`, `vitest.config.ts`) with `zod` as a dependency
- [x] T004 [P] Scaffold `apps/data-job` (`package.json` with `tsx`, `sharp`, `zod`, `@agg/shared`, `vitest.config.ts`, `src/main.ts` stub that prints a banner)
- [x] T005 [P] Scaffold `apps/web` with Vite, React 18, TypeScript and `@agg/shared` (`package.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `vitest.config.ts`)
- [x] T006 [P] Configure ESLint (flat config with typescript-eslint) and Prettier at the root in `eslint.config.js` and `.prettierrc`
- [x] T007 Create `.github/workflows/ci.yml` running install, `npm run typecheck`, `npm run lint`, `npm test` on push and pull request

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared schemas, configuration and the web shell that every story needs

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T008 [P] Define Zod schemas `Category`, `Difficulty`, `MetricId`, `Photo`, `Item` (with the rules in data-model.md: at least one metric, positive values, integer year) in `packages/shared/src/schemas/item.ts`
- [x] T009 [P] Define Zod schemas `Manifest`, `PendingItem` and `CoverageReport` in `packages/shared/src/schemas/manifest.ts`
- [x] T010 [P] Define Zod schemas for browser storage (`Selection`, `Language`, `BestScores`) in `packages/shared/src/schemas/storage.ts`
- [x] T011 Create the metrics registry (id, category, `isDefault`, unit, `comparison`, answer label keys) and the difficulty thresholds (ratio 3 / 1.5, difference 30 / 10) in `packages/shared/src/config/metrics.ts` and `packages/shared/src/config/difficulty.ts`
- [x] T012 Export everything from `packages/shared/src/index.ts`
- [x] T013 [P] Write schema tests with valid and invalid cases (missing author, equal metric ids across categories, non-positive values, fractional year) in `packages/shared/tests/schemas.test.ts`
- [x] T014 [P] Create the i18n scaffold: typed dictionaries `src/i18n/pt-BR.ts` and `src/i18n/en.ts` (initially empty with the key type), a `LanguageProvider` and `t(key)` hook in `apps/web/src/i18n/index.tsx`
- [x] T015 [P] Create the localStorage module with `agg:` keys, Zod validation on read and try/catch around every access in `apps/web/src/storage/storage.ts`, following `contracts/browser-storage.md`
- [x] T016 [P] Write storage tests: invalid JSON is treated as absent, a throwing `localStorage` does not throw, best score keys use `category/metric/difficulty` in `apps/web/tests/storage.test.ts`
- [x] T017 Add the Flight Journal tokens as CSS variables (light and dark via `prefers-color-scheme`, values from docs/IDEA.md) in `apps/web/src/styles/tokens.css`, and a base stylesheet in `apps/web/src/styles/base.css`
- [x] T018 Vendor the Paper UI into `apps/web/src/paper/`: place `bundle.js`, its CSS and `index.d.ts` (the maintainer must export them from the reference artifact; see research.md R3), load React 18 onto `window` before the bundle, and re-export the components used by the app from `apps/web/src/paper/index.ts`. If the files are not available yet, create a local wrapper with the same component names (`Button`, `Window`, `Icon`) so the swap is a one-file change
- [x] T019 Create the app shell with the screen state machine (`select`, `game`, `over`) in `apps/web/src/App.tsx`, and wire the providers (language, theme tokens) in `apps/web/src/main.tsx`
- [x] T020 Create a small hand-made sample dataset (at least 12 airports and 12 airlines with placeholder photos) in `apps/web/public/data/` for development until the data job runs, plus `manifest.json` listing the four metrics. Mark it with `"sample": true` in the manifest and keep it out of the final commit once real data exists
- [x] T021 Create the dataset loader that fetches `manifest.json` and the chosen category file, validates them with the shared schemas, rejects an unsupported `schemaVersion`, and exposes an error state in `apps/web/src/data/loader.ts`

**Checkpoint**: Foundation ready. User story work can begin.

---

## Phase 3: User Story 5 - Game data is prepared ahead of time (Priority: P1)

**Goal**: A manual local job produces a validated dataset and images that the game reads.

**Independent Test**: Run the job against fixtures and then against live sources. The output
validates, every item has a photo with author and license, items without a photo are in
`pending.json` and absent from the dataset, and a corrupted output makes validation fail.

### Tests for User Story 5

- [x] T022 [P] [US5] Save real response fixtures (Wikidata SPARQL results for airports and airlines, OurAirports `airports.csv` and `runways.csv` excerpts, Commons file metadata) in `apps/data-job/fixtures/`
- [x] T023 [P] [US5] Test eligibility rules (scheduled service airports only, active airlines only, no heliports, military or defunct entries) against fixtures in `apps/data-job/tests/eligibility.test.ts`
- [x] T024 [P] [US5] Test normalization and coverage: items without a metric are excluded from that metric only, metrics below the minimum are left out of the manifest, the pending list is built correctly, in `apps/data-job/tests/pipeline.test.ts`

### Implementation for User Story 5

- [x] T025 [P] [US5] Implement the Wikidata SPARQL client (airports with IATA code, passengers per year, image; airlines not dissolved with fleet size and inception) with polite request headers and retry in `apps/data-job/src/sources/wikidata.ts`
- [x] T026 [P] [US5] Implement the OurAirports CSV loader (download, cache under `apps/data-job/.cache/`, parse airports and runways, longest runway in meters, `scheduled_service` flag) in `apps/data-job/src/sources/ourairports.ts`
- [x] T027 [P] [US5] Implement the Commons client that resolves a file name to author, license, license URL, source URL and original file URL, and rejects non-free licenses, in `apps/data-job/src/sources/commons.ts`
- [x] T028 [US5] Implement eligibility and merging of Wikidata and OurAirports records by IATA/ICAO code into candidate items in `apps/data-job/src/pipeline/eligibility.ts`
- [x] T029 [US5] Implement normalization into the shared `Item` shape with stable ids (`apt-<iata>`, `air-<slug>`) and deterministic ordering in `apps/data-job/src/pipeline/normalize.ts`
- [x] T030 [US5] Implement image processing: download the original, resize to 480, 960 and 1600 px, write AVIF and WebP into `apps/web/public/img/<itemId>/`, skip work when files already exist, in `apps/data-job/src/images/process.ts`
- [x] T031 [US5] Implement the coverage report and manifest builder (counts per metric, `minimumItems` 150, only qualifying metrics in `manifest.metrics`) in `apps/data-job/src/pipeline/coverage.ts`
- [x] T032 [US5] Implement pending list output (`reason`, kept metrics) to `apps/data-job/pending.json` in `apps/data-job/src/pipeline/pending.ts`
- [x] T033 [US5] Implement `validate.ts` that validates items, manifest and the existence of every referenced image file with the shared schemas and exits non-zero on any failure, in `apps/data-job/src/validate.ts`
- [x] T034 [US5] Wire everything in `apps/data-job/src/main.ts` (fetch, eligibility, normalize, images, coverage, validate, then write files only if validation passes) and add the `data-job` and `validate` npm scripts
- [x] T035 [US5] Add the committed-data validation test that runs the shared schemas over `apps/web/public/data/` and checks image files exist in `apps/web/tests/dataset.test.ts`, and add it to the CI workflow
- [x] T036 [US5] Run the job against live sources, review the coverage report, commit the real dataset and images, and replace the sample dataset from T020

**Checkpoint**: A real, validated dataset exists. The coverage report decides which metrics ship.

---

## Phase 4: User Story 2 - Choose what to play (Priority: P1)

**Goal**: Chained selectors with a default metric and a remembered last selection.

**Independent Test**: Walk through the three selectors, start a game, reload, and see the last
selection restored.

### Tests for User Story 2

- [x] T037 [P] [US2] Test the selection logic as pure functions: a category unlocks metrics, the default metric is pre-selected, a single remaining metric is pre-selected, a stored selection that is no longer offered is ignored, in `packages/shared/tests/selection.test.ts`

### Implementation for User Story 2

- [x] T038 [US2] Implement the pure selection helpers (`metricsFor(category, manifest)`, `defaultMetric`, `isSelectionValid`) in `packages/shared/src/game/selection.ts`
- [x] T039 [US2] Build the Select screen with three chained selectors, each enabled only after the previous choice, building options from `manifest.metrics` (FR-002, FR-028), in `apps/web/src/screens/SelectScreen.tsx`
- [x] T040 [US2] Pre-select the default metric when a category is chosen and restore the stored selection on mount, saving it when the player starts a game, in `apps/web/src/screens/SelectScreen.tsx` using `apps/web/src/storage/storage.ts`
- [x] T041 [P] [US2] Add the Select screen strings (labels for categories, metrics, difficulties, start button) to `apps/web/src/i18n/pt-BR.ts` and `apps/web/src/i18n/en.ts`
- [x] T042 [US2] Show a clear message when a combination has too few items to play, and block the start button in that case, in `apps/web/src/screens/SelectScreen.tsx`

**Checkpoint**: The player can pick what to play and the choice persists.

---

## Phase 5: User Story 1 - Play a round of Higher or Lower (Priority: P1) MVP

**Goal**: The core game loop with correct difficulty, reveal pause and end conditions.

**Independent Test**: Start with a fixed selection, answer correctly several times, then wrongly.
The score rises per hit and the game ends on the first miss.

### Tests for User Story 1

- [x] T043 [P] [US1] Test difficulty classification for ratio and year-difference metrics, including boundaries (exactly 1.5x, 3x, 10 and 30 years), in `packages/shared/tests/difficulty.test.ts`
- [x] T044 [P] [US1] Test pair generation: equal values never paired, the ratio or difference matches the difficulty, no pair repeats within a game, the revealed item becomes the next visible one, and an exhausted pool ends the game as a win, using an injected seeded random source, in `packages/shared/tests/pairs.test.ts`
- [x] T045 [P] [US1] Test the answer check and scoring (correct adds one, wrong ends, "newer/older" maps to later/earlier year) in `packages/shared/tests/answer.test.ts`

### Implementation for User Story 1

- [x] T046 [P] [US1] Implement difficulty classification (`classify(a, b, metric)` and `matchesDifficulty`) from the thresholds in `packages/shared/src/game/difficulty.ts`
- [x] T047 [US1] Implement pair generation with an injectable random source and the used-pairs set in `packages/shared/src/game/pairs.ts`
- [x] T048 [US1] Implement answer checking and the game session state transitions (`answering`, `revealing`, `over`, win on exhaustion) as a pure reducer in `packages/shared/src/game/session.ts`
- [x] T049 [US1] Build the `ItemCard` component with a `<picture>` using AVIF then WebP `srcset`/`sizes`, intrinsic width and height, a placeholder on load error, and the value shown or hidden, in `apps/web/src/components/ItemCard.tsx`
- [x] T050 [US1] Build the `Attribution` component that shows photo author and license with a link to the source, in `apps/web/src/components/Attribution.tsx`
- [x] T051 [US1] Build the Game screen: two cards, answer buttons using the metric's labels ("More/Less" or "Newer/Older"), score display, locked answers during the reveal, in `apps/web/src/screens/GameScreen.tsx`
- [x] T052 [US1] Implement the reveal pause of about 1.5 s with a tap or key press to skip it, for both correct and wrong answers, in `apps/web/src/screens/GameScreen.tsx`
- [x] T053 [US1] Format values for display (thousands separators by language, `m` for runway, plain year) in `apps/web/src/components/formatValue.ts`
- [x] T054 [P] [US1] Add the Game screen strings (answer labels, score, attribution label) to `apps/web/src/i18n/pt-BR.ts` and `apps/web/src/i18n/en.ts`
- [x] T055 [US1] Make the game keyboard-operable with visible focus and a layout that adapts from phone to desktop in `apps/web/src/styles/game.css`

**Checkpoint**: A full round is playable from selection to the first miss.

---

## Phase 6: User Story 3 - End of game, record and share (Priority: P2)

**Goal**: Final score, best score per combination, sharing and restart.

**Independent Test**: Lose with a score above the stored best, check the record updates and
persists, share, then restart to the start screen.

### Tests for User Story 3

- [x] T056 [P] [US3] Test best score update logic (higher replaces, lower or equal keeps, keyed by combination) in `packages/shared/tests/best-score.test.ts`
- [x] T057 [P] [US3] Test the share text builder for both languages and the share fallback chain (native, then clipboard, then none) in `apps/web/tests/share.test.ts`

### Implementation for User Story 3

- [x] T058 [US3] Implement `updateBest(best, key, score)` in `packages/shared/src/game/best-score.ts`
- [x] T059 [US3] Implement the share helper (`navigator.share`, else `navigator.clipboard.writeText`, with a result value for confirmation) and the text builder using the site URL from build config, in `apps/web/src/share/share.ts`
- [x] T060 [US3] Build the GameOver screen with a defeat message, final score, best score, share button with a visible copied confirmation, and a restart button that returns to the Select screen, in `apps/web/src/screens/GameOverScreen.tsx`
- [x] T061 [US3] Save the best score on game end through `apps/web/src/storage/storage.ts`, and handle the win-by-exhaustion message in `apps/web/src/screens/GameOverScreen.tsx`
- [x] T062 [P] [US3] Add the GameOver strings (defeat, win, share, copied, restart) to `apps/web/src/i18n/pt-BR.ts` and `apps/web/src/i18n/en.ts`
- [x] T063 [US3] Add the `VITE_SITE_URL` build variable with a documented default in `apps/web/.env.example` and `apps/web/src/share/share.ts`

**Checkpoint**: The loop is closed with records and sharing.

---

## Phase 7: User Story 4 - Language and theme (Priority: P2)

**Goal**: Browser-based language with manual switch, and light and dark themes.

**Independent Test**: Open with each browser language, switch manually and reload, and toggle
the system theme.

### Tests for User Story 4

- [x] T064 [P] [US4] Test language detection (`pt`, `pt-BR`, `pt-PT` map to pt-BR; anything else maps to en; stored choice wins) in `apps/web/tests/language.test.ts`
- [x] T065 [P] [US4] Test that both dictionaries have exactly the same keys in `apps/web/tests/dictionaries.test.ts`

### Implementation for User Story 4

- [x] T066 [US4] Implement detection from `navigator.languages` and the stored override in `apps/web/src/i18n/index.tsx`
- [x] T067 [US4] Add a language switcher in the app header, persisted in `agg:language`, in `apps/web/src/components/LanguageSwitcher.tsx`
- [x] T068 [US4] Set `<html lang>` on language change in `apps/web/src/i18n/index.tsx`
- [x] T069 [US4] Verify text contrast of at least 4.5:1 for every text and background token pair in both themes with a script `apps/web/scripts/check-contrast.ts`, adjust the dark tokens in `apps/web/src/styles/tokens.css` where needed, and run the script in CI

**Checkpoint**: All stories work in both languages and themes.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [x] T070 [P] Review all copy in both dictionaries for sentence case, informal "você" and no emoji (FR-025) in `apps/web/src/i18n/pt-BR.ts` and `apps/web/src/i18n/en.ts`
- [x] T071 [P] Add a keyboard and focus pass: tab order, focus ring on every control, Escape or Enter behaviors, across all three screens in `apps/web/src/styles/base.css` and the screen components
- [x] T072 Add an error screen for dataset load failures and an empty-pool state in `apps/web/src/screens/ErrorScreen.tsx`
- [ ] T073 Run the quickstart validation scenarios in `specs/001-higher-lower-mvp/quickstart.md`, including blocked storage, blocked images and the mobile throttling check (SC-005), and fix what fails
- [x] T074 [P] Add the Vercel configuration (build command and output directory for `apps/web`) in `vercel.json` and document deployment in `README.md`
- [x] T075 [P] Update `docs/IDEA.md` open items (testing and CI decided, bundle typing and loading, data coverage result) so it matches the constitution and plan

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: no dependencies.
- **Foundational (Phase 2)**: depends on Setup; blocks all stories. T018 depends on the maintainer
  providing the Paper UI files, or on the local wrapper fallback described in the task.
- **US5 (Phase 3)**: depends on Foundational schemas (T008 to T012). It does not depend on the
  web app, so it can run in parallel with US2 and US1 after Phase 2.
- **US2 (Phase 4)**: depends on Foundational; can use the sample dataset (T020) before US5 is done.
- **US1 (Phase 5)**: depends on Foundational and uses a fixed selection until US2 is merged; can
  run in parallel with US2.
- **US3 (Phase 6)**: depends on US1 (game end) and on the storage module (T015).
- **US4 (Phase 7)**: depends on Foundational i18n scaffold (T014); strings added by earlier
  stories are covered by T065.
- **Polish (Phase 8)**: depends on all stories. T036 (real data) MUST be done before T073.

### Within a story

Pure logic in `packages/shared` first, then React components, then strings and styling. Tests
may be written alongside the logic they cover.

### Parallel opportunities

- Setup: T003, T004, T005 and T006 in parallel after T001 and T002.
- Foundational: T008, T009, T010, T013, T014, T015 and T016 in parallel.
- US5: T022 to T024 together, and T025 to T027 together.
- US1: T043 to T045 together, then T046 and T049 to T050 in parallel.
- A single developer can alternate between the data job (US5) and the game (US1, US2) after Phase 2.

### Parallel example: User Story 1 logic

```text
T043 difficulty tests   T044 pairs tests   T045 answer tests
T046 difficulty.ts      T049 ItemCard      T050 Attribution
```

---

## Implementation Strategy

### MVP first

1. Phase 1 and Phase 2.
2. Phase 5 (US1) and Phase 4 (US2) using the sample dataset, to get a playable game early.
3. Phase 3 (US5) to replace the sample with real data. This is the biggest risk (coverage),
   so start it early in parallel rather than last.
4. Stop and validate: a full game on real data in one language.

### Incremental delivery

1. Add US3 (records and sharing).
2. Add US4 (language and theme).
3. Polish, quickstart validation and deploy on Vercel.

### Notes

- Commit after each task or small group of tasks; commit messages in this repository omit the
  Claude co-author trailer.
- Generated data and images are never hand-edited; rerun the data job.
- Metrics that miss the minimum coverage ship later (FR-028), without blocking the release.
