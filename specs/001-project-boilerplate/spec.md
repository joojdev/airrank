# Feature Specification: Two-Sided Project Boilerplate

**Feature Branch**: `001-project-boilerplate`

**Created**: 2026-08-08

**Status**: Draft

**Input**: User description: "Boilerplate the two sides of the project"

## Clarifications

### Session 2026-08-08

- Q: Where in the repository should the crawler write its committed placeholder JSON file, so the frontend can read it from a known, fixed path? → A: Inside the frontend's public/static assets folder (e.g. `frontend/public/data/airplanes.json`) — frontend serves it directly, no copy step
- Q: What should the top-level folder names be for the frontend and the crawler inside the repository? → A: `frontend/` and `crawler/`

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Frontend scaffold runs and proves the workflow (Priority: P1)

As a developer joining the project, I can check out the repository, install the
frontend's dependencies, and start a local development server that shows a working
placeholder screen — proving the frontend side is wired up before any real game
feature is built. Alongside it, one example behavior scenario already exists, already
passes, and demonstrates the write-scenario → see-it-fail → make-it-pass workflow the
project must follow for every future feature.

**Why this priority**: Nothing else can be built until a developer can run the
frontend at all. This is the foundation every future game feature sits on, and it is
also the first proof that the project's mandated test-first workflow is actually wired
up and working, not just written down as a rule.

**Independent Test**: Can be fully tested by cloning the repo, installing the
frontend's dependencies, starting the local dev server, and confirming a placeholder
screen loads in a browser; separately, running the frontend's automated test suite
confirms the one example scenario passes.

**Acceptance Scenarios**:

1. **Given** a freshly cloned repository, **When** a developer installs the frontend's
   dependencies and starts the local dev server, **Then** a placeholder screen loads
   successfully in a browser with no errors.
2. **Given** the frontend scaffold, **When** a developer runs the frontend's automated
   test suite, **Then** the one example behavior scenario included in the scaffold is
   reported as passing.
3. **Given** the frontend scaffold's example scenario file, **When** a developer
   intentionally reverts its supporting code, **Then** re-running the test suite shows
   that scenario failing (proving the suite actually exercises the behavior rather than
   trivially passing).

---

### User Story 2 - Data crawler scaffold runs locally on demand (Priority: P2)

As a developer, I can run the data crawler locally, on demand, and have it produce a
placeholder data file in the project's committed data format — proving the crawler
side is wired up before any real airplane-data collection logic is built. Like the
frontend, it ships with one example behavior scenario that already passes.

**Why this priority**: The crawler is the project's only data source (per the
constitution, there is no live backend). Confirming it can be invoked locally and
produce output in the right shape unblocks writing the real data-collection behavior,
and confirms its own test-first workflow is wired up correctly.

**Independent Test**: Can be fully tested by running the crawler's entry point locally
with no arguments beyond what the scaffold requires, and confirming it produces (or
overwrites) a placeholder JSON output file at `frontend/public/data/airplanes.json`;
separately, running the crawler's automated test suite confirms the one example
scenario passes.

**Acceptance Scenarios**:

1. **Given** a freshly cloned repository, **When** a developer installs the crawler's
   dependencies and runs the crawler locally, **Then** a placeholder JSON data file is
   written to `frontend/public/data/airplanes.json` with no unhandled errors.
2. **Given** the crawler scaffold, **When** a developer runs the crawler's automated
   test suite, **Then** the one example behavior scenario included in the scaffold is
   reported as passing.
3. **Given** the crawler scaffold's example scenario file, **When** a developer
   intentionally reverts its supporting code, **Then** re-running the test suite shows
   that scenario failing.

---

### User Story 3 - A developer can tell the two sides apart and knows how to run each (Priority: P3)

As a developer, I can look at the repository and immediately tell which part is the
frontend and which is the crawler, and find, for each side, the minimal instructions
needed to install its dependencies, run it, and run its tests — without needing to ask
a teammate.

**Why this priority**: Lower risk than the two scaffolds actually working, but without
it every new contributor re-derives "how do I even start this thing" from scratch.

**Independent Test**: Can be fully tested by having a developer unfamiliar with the
repo locate both sides and their run instructions using only what's checked into the
repository, without external help.

**Acceptance Scenarios**:

1. **Given** the repository root, **When** a developer looks for the frontend and the
   crawler, **Then** the frontend is at `frontend/` and the crawler is at `crawler/`,
   with no overlap.
2. **Given** either side's location, **When** a developer looks for how to run it,
   **Then** install/run/test instructions for that side are present and accurate.

---

### Edge Cases

- What happens when a developer runs the crawler before any real data-collection
  target has been configured? It MUST still run and produce its placeholder output
  rather than crashing, since no real target exists yet at the boilerplate stage.
- What happens when a developer starts the frontend without having installed its
  dependencies first? It MUST fail with a clear, actionable error rather than a silent
  or cryptic failure.
- How does the project handle a developer running only one side's test suite while the
  other side hasn't been touched? Each side's tests MUST run and report results
  independently of the other side's state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The repository MUST contain two clearly separated, independently
  runnable project scaffolds at fixed top-level locations: the frontend at `frontend/`
  and the data crawler at `crawler/`.
- **FR-002**: The frontend scaffold MUST start a local development server that renders
  a placeholder screen without errors, using only committed setup instructions.
- **FR-003**: The crawler scaffold MUST be runnable locally, on demand, and MUST
  produce a placeholder JSON data output file at `frontend/public/data/airplanes.json`
  without requiring a live/deployed service, so the frontend can serve it directly with
  no separate copy/build step.
- **FR-004**: Each scaffold MUST include exactly one example automated behavior
  scenario, written and verified to fail before its supporting code existed, that now
  passes — demonstrating the project's mandated write-first, see-it-fail,
  make-it-pass workflow is functional for that side.
- **FR-005**: Each scaffold MUST include its own instructions (install, run, test) that
  are sufficient for a developer unfamiliar with the project to get it running without
  outside help.
- **FR-006**: The two scaffolds MUST be able to be installed, run, and tested
  independently of one another — a failure or missing setup step on one side MUST NOT
  block running or testing the other side.
- **FR-007**: Neither scaffold MUST include real game logic, real airplane data, or
  real scraping/collection targets — this feature only establishes that both sides
  exist, run, and are provably test-first from their very first scenario.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer unfamiliar with the project can get the frontend's
  placeholder screen loading in a local browser in under 5 minutes using only
  committed instructions.
- **SC-002**: A developer unfamiliar with the project can get the crawler to produce
  its placeholder output file in under 5 minutes using only committed instructions.
- **SC-003**: 100% of the example behavior scenarios shipped in the two scaffolds pass
  when their test suites are run, and each is demonstrably able to fail (verified by
  reverting its supporting code).
- **SC-004**: A developer can correctly identify which repository location belongs to
  which side, and how to run and test each one, without asking a teammate.

## Assumptions

- The two scaffolds live in the same repository (this one), as separate top-level
  locations — no separate repositories are being created for this feature.
- "Boilerplate" for this feature means a minimal, running skeleton for each side (dev
  server up, one example test-first scenario passing) — it does not include any real
  game screens, real game logic, or real airplane data collection, which are separate
  future features.
- The crawler's placeholder output for this feature does not need to come from a real
  external source; a fixed or locally-sourced placeholder value is sufficient to prove
  the write-a-file behavior.
- Specific tools/frameworks used to satisfy these requirements are already fixed by the
  project constitution and are a planning-phase concern, not a specification concern.
