---

description: "Task list for feature implementation"
---

# Tasks: Two-Sided Project Boilerplate

**Input**: Design documents from `/specs/001-project-boilerplate/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/airplanes-data.schema.json, quickstart.md

**Tests**: This project's constitution (Principle I, NON-NEGOTIABLE) mandates a Gherkin
scenario written and observed failing (RED) before any supporting code is written, for
every user story. Test/scenario tasks below are therefore MANDATORY, not optional.

**Organization**: Tasks are grouped by user story (from spec.md) to enable independent
implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths are included in each description

## Path Conventions

Per `plan.md`'s Project Structure: `frontend/` and `crawler/` are fixed, independent
top-level directories at the repository root. The crawler writes into
`frontend/public/data/airplanes.json` — the one deliberate coupling point.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Repository-level scaffolding that isn't specific to either side

- [X] T001 Create top-level `frontend/` and `crawler/` directories at the repository root per `plan.md`'s Project Structure
- [X] T002 [P] Add `frontend/node_modules/`, `frontend/dist/`, `crawler/__pycache__/`, and `crawler/.venv/` to the repository's `.gitignore`

**Checkpoint**: Setup ready — User Story 1 and User Story 2 can now proceed (in parallel, if staffed). There is no separate Foundational phase for this feature: the only shared infrastructure (the crawler→frontend data directory) lives inside `frontend/` and is created as part of User Story 1 below (T007), once the Vite scaffold exists to receive it.

---

## Phase 2: User Story 1 - Frontend scaffold runs and proves the workflow (Priority: P1) 🎯 MVP

**Goal**: A developer can install, run, and test the frontend locally, and see one
example Gherkin scenario go from RED to GREEN, proving the frontend side of the
project is wired up per the constitution.

**Independent Test**: Clone the repo, install the frontend's dependencies, start the
local dev server, confirm a placeholder screen loads in a browser; separately, run the
frontend's automated test suite and confirm the one example scenario passes.

### Tests for User Story 1 (MANDATORY — write first, confirm RED before implementing)

- [X] T003 [P] [US1] Write Gherkin scenario "Player sees the placeholder screen" in `frontend/features/placeholder_screen.feature`
- [X] T004 [P] [US1] Write matching (initially unimplemented) Playwright+Cucumber step definitions in `frontend/tests/steps/placeholder_screen.steps.ts`
- [X] T005 [US1] Run the frontend's Gherkin suite and confirm the scenario fails/is undefined (RED) before any implementation exists (depends on T003, T004)

### Implementation for User Story 1

- [X] T006 [US1] Scaffold a Vite + React + TypeScript project in `frontend/` (`package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`)
- [X] T007 [US1] Create `frontend/public/data/` directory (with a `.gitkeep` placeholder) as the fixed crawler→frontend data hand-off location defined in `contracts/airplanes-data.schema.json` (depends on T006 — runs after the Vite scaffold exists, so this nested folder is added to an already-scaffolded project rather than colliding with the scaffolder's own directory setup)
- [X] T008 [P] [US1] Add Tailwind CSS and initialize shadcn/ui in `frontend/` (`tailwind.config.ts`, `postcss.config.js`, `src/index.css`, `components.json`) (depends on T006)
- [X] T009 [P] [US1] Add Zustand and create a placeholder store in `frontend/src/store/useGameStore.ts` (depends on T006)
- [X] T010 [P] [US1] Configure the Playwright + Cucumber runner in `frontend/` so `frontend/features/*.feature` drives a real Playwright browser session against the dev/preview server (depends on T006)
- [X] T011 [P] [US1] Configure Vitest in `frontend/` (`vitest.config.ts`) with one sample passing unit test in `frontend/tests/unit/` (depends on T006)
- [X] T012 [US1] Implement the placeholder screen component in `frontend/src/components/PlaceholderScreen.tsx` using shadcn/ui primitives, semantic HTML, and keyboard-reachable focusable elements (depends on T008)
- [X] T013 [US1] Wire `PlaceholderScreen` into `frontend/src/App.tsx` and `frontend/src/main.tsx` (depends on T012)
- [X] T014 [US1] Implement the step definitions in `frontend/tests/steps/placeholder_screen.steps.ts` against the running dev/preview server so the scenario now passes (GREEN) (depends on T005, T010, T013)
- [X] T015 [P] [US1] Add `frontend/README.md` with install/run/test instructions sufficient for an unfamiliar developer (depends on T006)

**Checkpoint**: User Story 1 is fully functional and testable independently

---

## Phase 3: User Story 2 - Data crawler scaffold runs locally on demand (Priority: P2)

**Goal**: A developer can install, run, and test the crawler locally and on demand,
producing a placeholder JSON file the frontend can read, and see one example Gherkin
scenario go from RED to GREEN.

**Independent Test**: Run the crawler's entry point locally with no arguments beyond
what the scaffold requires and confirm it produces/overwrites the placeholder JSON
output file; separately, run the crawler's automated test suite and confirm the one
example scenario passes.

**Note**: Every task in this story is independent of User Story 1 except T022 below,
which needs `frontend/public/data/` to exist — that directory is created by User Story
1's T007. If US1 and US2 are staffed in parallel, T022 is the one point the crawler
developer must wait on.

### Tests for User Story 2 (MANDATORY — write first, confirm RED before implementing)

- [X] T016 [P] [US2] Write Gherkin scenario "Crawler writes placeholder airplane data" in `crawler/features/write_placeholder_data.feature`
- [X] T017 [P] [US2] Write matching (initially unimplemented) behave step definitions in `crawler/features/steps/write_placeholder_data_steps.py`
- [X] T018 [US2] Run the crawler's `behave` suite and confirm the scenario fails/is undefined (RED) before any implementation exists (depends on T016, T017)

### Implementation for User Story 2

- [X] T019 [US2] Scaffold a Python project in `crawler/` (`requirements.txt` pinning selenium, requests/httpx, beautifulsoup4, behave, pytest; `crawler/crawler/__init__.py`)
- [X] T020 [P] [US2] Configure the `behave` runner in `crawler/` pointing at `crawler/features/` (depends on T019)
- [X] T021 [P] [US2] Configure `pytest` in `crawler/` with one sample passing unit test in `crawler/tests/` (depends on T019)
- [X] T022 [US2] Implement the crawler entry point in `crawler/crawler/main.py`, writing exactly one placeholder record to `frontend/public/data/airplanes.json` matching `contracts/airplanes-data.schema.json` (depends on T007, T019)
- [X] T023 [US2] Implement the behave step definitions in `crawler/features/steps/write_placeholder_data_steps.py` to invoke `crawler/crawler/main.py` and assert the output file matches the schema, so the scenario now passes (GREEN) (depends on T018, T020, T022)
- [X] T024 [P] [US2] Add `crawler/README.md` with install/run/test instructions sufficient for an unfamiliar developer (depends on T019)

**Checkpoint**: User Stories 1 AND 2 both work independently

---

## Phase 4: User Story 3 - A developer can tell the two sides apart and knows how to run each (Priority: P3)

**Goal**: A developer unfamiliar with the repository can locate the frontend and the
crawler and find accurate install/run/test instructions for each without asking a
teammate.

**Independent Test**: Have a developer unfamiliar with the repo locate both sides and
their run instructions using only what's checked into the repository.

### Implementation for User Story 3

- [X] T025 [US3] Update the repository root `README.md` to briefly describe the two-sided layout and link to `frontend/README.md` and `crawler/README.md` (depends on T015, T024)
- [X] T026 [P] [US3] Review `frontend/` and `crawler/` for overlapping files or cross-dependencies and confirm each can be installed/run/tested with the other side entirely untouched, per FR-006 (depends on T015, T024)

**Checkpoint**: All three user stories are independently functional

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across both sides

- [X] T027 Run the full `quickstart.md` validation (Parts A, B, and C) end-to-end — including Part A's missing-dependencies error check — and check off its "Done when" list (depends on T014, T023, T025, T026)
- [X] T028 [P] Validate `frontend/public/data/airplanes.json` against `contracts/airplanes-data.schema.json` with a JSON Schema validator, confirming the crawler↔frontend contract holds (depends on T022)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **User Story 1 (Phase 2)**: Depends on Setup (T001) — no dependency on US2
- **User Story 2 (Phase 3)**: Depends on Setup (T001) for everything except T022, which
  additionally depends on User Story 1's T007 (`frontend/public/data/` must exist)
- **User Story 3 (Phase 4)**: Depends on US1's README (T015) and US2's README (T024)
- **Polish (Phase 5)**: Depends on all three user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Fully independent of US2 — can be built and demoed alone (MVP)
- **User Story 2 (P2)**: Independent of US1 except for one task — T022 needs US1's T007
  (the `frontend/public/data/` directory) to exist before it can write there
- **User Story 3 (P3)**: Needs both US1 and US2's READMEs to exist first

### Within Each User Story

- Gherkin scenario + step-definition stubs written and confirmed RED before any
  implementation (T003-T005, T016-T018)
- Scaffolding/config before the feature code that depends on it
- Feature code before wiring the step definitions to GREEN
- README last, once the side actually runs

### Parallel Opportunities

- T001 then T002 can follow immediately after
- Once Setup (T001-T002) is done, US1 (Phase 2) and US2 (Phase 3) can proceed in
  parallel if staffed by two developers — the crawler developer can do everything
  except T022 (and the T023/T028 tasks that depend on it) before US1's T007 lands
- Within US1: T008, T009, T010, T011, T015 can run in parallel once T006 is done
- Within US2: T020, T021, T024 can run in parallel once T019 is done

---

## Parallel Example: User Story 1

```bash
# After T006 (Vite scaffold) is done, these touch different files and can run together:
Task: "Add Tailwind CSS and initialize shadcn/ui in frontend/"
Task: "Add Zustand and create a placeholder store in frontend/src/store/useGameStore.ts"
Task: "Configure the Playwright + Cucumber runner in frontend/"
Task: "Configure Vitest in frontend/"
Task: "Add frontend/README.md with install/run/test instructions"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: User Story 1
3. **STOP and VALIDATE**: run Part A of `quickstart.md` independently
4. Demo the running frontend scaffold

### Incremental Delivery

1. Setup → shared groundwork ready
2. Add User Story 1 → validate independently → demo (MVP)
3. Add User Story 2 → validate independently → demo (its last task, T022, needs US1's
   T007 to be in place first)
4. Add User Story 3 → validate independently → demo
5. Phase 5 Polish → run full `quickstart.md`, validate the JSON contract

### Parallel Team Strategy

With two developers: one takes User Story 1 (frontend), the other takes User Story 2
(crawler), both starting right after Phase 1's Setup. The crawler developer can
complete T016-T021 and T024 independently, but T022 (and anything after it) waits on
the frontend developer's T007. They meet back up for User Story 3 (Phase 4), which
needs both READMEs to exist.

---

## Notes

- [P] tasks touch different files and have no dependency on an incomplete task
- [Story] label maps each task to its user story for traceability
- Every scenario MUST be observed failing (RED) before its supporting code is written —
  this is NON-NEGOTIABLE per the project constitution, not a style preference
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently
- Neither side may include real game logic, real airplane data, or a real crawl target
  in this feature (per FR-007) — that's future feature work
