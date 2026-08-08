# Quickstart: Two-Sided Project Boilerplate

Validates that both scaffolds exist, run independently, and each proves the project's
Gherkin-first, red-green workflow with its one example scenario. Corresponds to User
Stories 1–3 and Success Criteria SC-001–SC-004 in `spec.md`.

## Prerequisites

- Node.js 20+ and a package manager (npm/pnpm/yarn) available on PATH, for `frontend/`.
- Python 3.11+ and `pip` available on PATH, for `crawler/`.
- A freshly cloned copy of this repository (or `git clean` state on this branch).

## Part A — Frontend (`frontend/`)

1. **Install**: from `frontend/`, install dependencies per `frontend/README.md`.
2. **Run**: start the local dev server; open it in a browser.
   - **Expected**: a placeholder screen loads with no console errors, is reachable via
     keyboard alone (Tab/Enter), and uses semantic HTML (not solely `<div onclick>`).
   - Satisfies SC-001 (under 5 minutes from clone to loaded screen) and Principle III's
     baseline accessibility bar.
3. **Confirm missing-dependencies failure is clear** (do this once, to validate the
   scaffold itself): temporarily remove/rename `frontend/node_modules/` and attempt to
   start the dev server again.
   - **Expected**: the command fails immediately with a clear, actionable error (e.g.
     naming the missing module/command) — not a silent hang or a cryptic stack trace.
   - Reinstall dependencies afterward to restore the working state.
   - Satisfies the spec's "missing dependencies" edge case.
4. **Prove red-green** (do this once, to validate the scaffold itself — not part of
   normal day-to-day use):
   a. Temporarily revert/comment out the step definitions or component code backing
      `frontend/features/placeholder_screen.feature`.
   b. Run the frontend's Gherkin suite → **expected: the scenario fails (RED)**.
   c. Restore the code.
   d. Run the frontend's Gherkin suite again → **expected: the scenario passes
      (GREEN)**.
   - Satisfies FR-004 and SC-003.
5. **Run unit tests**: run the Vitest suite → expected: passes (no unit tests are
   required to exist beyond what the scaffold ships, but the runner must work).

## Part B — Crawler (`crawler/`)

1. **Install**: from `crawler/`, install dependencies per `crawler/README.md`.
2. **Run**: invoke the crawler's entry point locally with no arguments beyond what
   `crawler/README.md` documents.
   - **Expected**: `frontend/public/data/airplanes.json` is created/overwritten, is
     valid JSON, and validates against
     `specs/001-project-boilerplate/contracts/airplanes-data.schema.json` with exactly
     one record.
   - Satisfies SC-002 and FR-003.
3. **Prove red-green**: repeat the same revert → RED → restore → GREEN cycle from Part
   A step 4, but against `crawler/features/write_placeholder_data.feature` and the
   `behave` runner. Satisfies FR-004 and SC-003.
4. **Run unit tests**: run the `pytest` suite → expected: passes.

## Part C — Independence and discoverability

1. Delete or ignore `frontend/`'s installed dependencies and confirm `crawler/`'s
   install/run/test steps above still succeed unaffected, and vice versa. Satisfies
   FR-006.
2. As a reader unfamiliar with the repo, locate both `frontend/` and `crawler/` from
   the repository root and find each one's install/run/test instructions using only
   their respective `README.md` files, with no outside help. Satisfies FR-005, SC-004,
   and User Story 3.

## Done when

- [X] Part A steps 1–5 pass
- [X] Part B steps 1–4 pass
- [X] Part C steps 1–2 pass
- [X] `frontend/public/data/airplanes.json` validates against
      `contracts/airplanes-data.schema.json`
