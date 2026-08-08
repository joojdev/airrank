# Implementation Plan: Two-Sided Project Boilerplate

**Branch**: `001-project-boilerplate` | **Date**: 2026-08-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-project-boilerplate/spec.md`

## Summary

Stand up two independently runnable scaffolds — `frontend/` (the browser game shell)
and `crawler/` (the local, on-demand data collector) — each proving the project's
mandated Gherkin-first, red-green workflow with exactly one example scenario, and each
documented well enough for an unfamiliar developer to install/run/test it in under 5
minutes. The crawler writes a placeholder JSON file directly into the frontend's static
assets (`frontend/public/data/airplanes.json`), which the frontend reads with no build
step or live backend, per the constitution's "static JSON as sole data store" rule.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20+ (frontend tooling) and Python 3.11+
(crawler) — two components, two runtimes, one repository.

**Primary Dependencies**:
- Frontend: Vite, React 18, shadcn/ui, Tailwind CSS, Zustand, Playwright + Cucumber
  (`.feature` scenarios), Vitest (unit tests) — all fixed by the constitution.
- Crawler: Selenium (JS-rendered targets only), `requests`/`httpx` + BeautifulSoup4
  (plain HTML targets), `behave` (`.feature` scenarios), `pytest` (unit tests) — all
  fixed by the constitution.

**Storage**: A single static, git-committed JSON file at
`frontend/public/data/airplanes.json` — no database, no live API, per constitution.

**Testing**: Frontend feature-level behavior via Playwright+Cucumber, unit-level via
Vitest. Crawler feature-level behavior via `behave`, unit-level via `pytest`. Every
example scenario in this feature MUST be observed failing (RED) before its supporting
code is written, then passing (GREEN) — this is validated in `quickstart.md`.

**Target Platform**: Frontend runs in a standard modern browser (desktop + mobile web,
no native install). Crawler runs on a developer's local machine, invoked manually — no
server, scheduler, or deployment target for this version.

**Project Type**: Web application (frontend) + local CLI utility (crawler), as two
independent top-level components in a single repository.

**Performance Goals**: Not applicable to runtime performance at boilerplate scope; the
only timing target is developer setup speed (SC-001/SC-002: under 5 minutes each, from
clone to running).

**Constraints**: No live backend/API may be introduced. The crawler must run and
produce its placeholder output even with no real collection target configured yet (it
must not require network access to succeed at this stage). The frontend must fail
clearly (not silently) if started without its dependencies installed.

**Scale/Scope**: Boilerplate only — one placeholder screen, one placeholder JSON
record, one example scenario per side. No real game screens, game logic, or real
airplane data are part of this feature.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Constraint | Check | Result |
|---|---|---|
| I. Gherkin-First, Red-Green (NON-NEGOTIABLE) | Each side ships exactly one `.feature` scenario, required to be observed RED before its step/implementation code is written, then GREEN. `quickstart.md` documents proving this. | PASS |
| II. Simplicity & YAGNI | Scaffold includes only what's needed to prove each side runs and is test-first: no extra screens, no extra crawler targets, no config beyond what Vite/shadcn/behave/pytest need to run. | PASS |
| III. Accessible & Polished UX | Placeholder screen must still be keyboard-reachable and use semantic HTML (no inaccessible-by-construction elements); enforced in `quickstart.md` acceptance check even though there's no real game UI yet. | PASS |
| Tech & Platform Constraints | Frontend = TS+Vite+React+shadcn+Tailwind+Zustand+Playwright/Cucumber+Vitest. Crawler = Python+Selenium+requests/httpx+BeautifulSoup+behave+pytest. Data = static committed JSON at `frontend/public/data/airplanes.json`, no live backend. Matches constitution exactly (v1.2.0). | PASS |

No violations. Complexity Tracking table is not needed.

**Post-Phase 1 re-check**: `data-model.md`, `contracts/airplanes-data.schema.json`, and
`quickstart.md` introduce only the placeholder JSON shape and validation steps already
scoped above — no new dependency, service, or abstraction was added during design. All
four rows above remain PASS.

## Project Structure

### Documentation (this feature)

```text
specs/001-project-boilerplate/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── airplanes-data.schema.json
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
frontend/
├── public/
│   └── data/
│       └── airplanes.json        # crawler's committed output; read directly, no copy step
├── src/
│   ├── components/                # shadcn/ui-based components (placeholder screen lives here)
│   ├── store/                     # Zustand store(s)
│   ├── App.tsx
│   └── main.tsx
├── features/                      # Gherkin .feature files (Cucumber)
│   └── placeholder_screen.feature
├── tests/
│   ├── steps/                     # Cucumber step definitions, driven by Playwright
│   └── unit/                      # Vitest unit tests
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── README.md                      # install/run/test instructions for this side

crawler/
├── crawler/                       # Python package
│   ├── __init__.py
│   └── main.py                    # entry point; writes the placeholder JSON output
├── features/                      # behave .feature files
│   ├── steps/
│   └── write_placeholder_data.feature
├── tests/                         # pytest unit tests
├── requirements.txt
└── README.md                      # install/run/test instructions for this side
```

**Structure Decision**: Two fixed top-level directories, `frontend/` and `crawler/`
(locked in during `/speckit-clarify`), each a self-contained project with its own
dependency manifest, its own `features/` (Gherkin) and unit-test directories, and its
own README — satisfying FR-001, FR-005, and FR-006 (independent install/run/test). The
crawler writes into `frontend/public/data/`, the one deliberate coupling point between
the two sides, matching the clarified data contract.

## Complexity Tracking

*No violations recorded — table intentionally omitted.*
