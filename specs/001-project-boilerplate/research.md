# Phase 0 Research: Two-Sided Project Boilerplate

All technology choices for this feature are already fixed by the project constitution
(v1.2.0) and the spec's clarifications, so there are no open `NEEDS CLARIFICATION`
items. This document records the setup-pattern decisions needed to wire those fixed
choices together correctly.

## 1. Frontend project bootstrap

**Decision**: Scaffold with Vite's official React + TypeScript template, then add
Tailwind CSS and initialize shadcn/ui on top of it.

**Rationale**: This is the documented, supported path for shadcn/ui (it generates
components into the consuming project rather than being installed as an opaque
dependency) and keeps the initial toolchain to the exact set the constitution names —
no extra meta-framework (e.g., Next.js) that YAGNI/Simplicity would reject for a
single-page game.

**Alternatives considered**: Next.js (rejected — adds server-rendering/routing
machinery this single-page game doesn't need); Create React App (rejected —
unmaintained, constitution names Vite explicitly).

## 2. Frontend state management shape

**Decision**: One small Zustand store created via `create()`, holding only what's
needed for the boilerplate's placeholder screen (nothing game-specific yet).

**Rationale**: Constitution mandates Zustand over prop-drilling or a heavier library;
at boilerplate scope there is no real game state yet, so the store exists mainly to
prove the pattern is wired up for future features to extend.

**Alternatives considered**: React Context/`useState` only (rejected — constitution
requires Zustand); Redux Toolkit (rejected — constitution explicitly prefers a lighter
store for this project's size).

## 3. Frontend Gherkin runner wiring

**Decision**: Use `@cucumber/cucumber` with `playwright-bdd` (or an equivalent
Cucumber-to-Playwright glue) so `.feature` files under `frontend/features/` drive real
Playwright browser sessions against the Vite dev/preview server; keep pure-logic checks
in separate Vitest specs under `frontend/tests/unit/`.

**Rationale**: Constitution requires Playwright driven by Cucumber for feature-level
behavior. Using a maintained glue layer (rather than hand-rolled World/step wiring)
keeps the setup minimal per the Simplicity principle while still satisfying the
red-green requirement: the one example scenario must fail before its step definitions
and UI exist, then pass once they do.

**Alternatives considered**: `cypress-cucumber-preprocessor` (rejected — constitution
names Playwright, not Cypress, for the frontend); hand-written Playwright test without
Gherkin (rejected — violates Principle I, which is NON-NEGOTIABLE).

## 4. Crawler project bootstrap

**Decision**: A plain Python package (`crawler/crawler/`) with a single entry point
(`main.py`) runnable via `python -m crawler.main`, dependencies pinned in
`requirements.txt`, no packaging/publishing tooling.

**Rationale**: The crawler is a local, on-demand script per the constitution — not a
service, not a published package — so the simplest structure that supports `behave`
and `pytest` discovery is sufficient; anything more (setup.py, Poetry, a CLI framework)
would be premature per Simplicity/YAGNI at this stage.

**Alternatives considered**: Poetry-managed project (rejected — adds packaging
machinery not needed for a locally-invoked script); a CLI framework like Typer/Click
(rejected — no real CLI surface exists yet at boilerplate scope, would be speculative).

## 5. Crawler fetch strategy for the placeholder scenario

**Decision**: The boilerplate's one example scenario uses the `requests`/`httpx` +
BeautifulSoup path (not Selenium), since it only needs to prove "write a placeholder
JSON file," not fetch a real page yet.

**Rationale**: Constitution reserves Selenium for pages that actually require
JavaScript rendering; the boilerplate scenario has no real target page, so the lighter
path is the correct (and only justified) choice, keeping Selenium's heavier dependency
untouched until a real crawl target needs it.

**Alternatives considered**: Wiring up Selenium now "for completeness" (rejected —
violates Simplicity/YAGNI; nothing in this feature's scope needs a browser yet).

## 6. Crawler Gherkin runner wiring

**Decision**: `behave` with feature files under `crawler/features/` and step
definitions under `crawler/features/steps/`, `pytest` for any supporting unit tests
under `crawler/tests/`.

**Rationale**: Matches constitution's `behave` requirement directly and follows
`behave`'s own default discovery convention, minimizing custom configuration.

**Alternatives considered**: `pytest-bdd` (rejected — constitution names `behave`
specifically for the crawler side).

## 7. Data hand-off shape

**Decision**: The crawler writes a JSON array of placeholder aircraft records to
`frontend/public/data/airplanes.json` (schema in `contracts/airplanes-data.schema.json`
— see Phase 1). The frontend fetches/imports this file as a static asset at runtime;
no build-time copy step is introduced.

**Rationale**: Resolves the clarification session's answer directly and keeps the
"single deliberate coupling point" between the two otherwise-independent sides as small
and explicit as possible.

**Alternatives considered**: See spec.md Clarifications — root-level `data/` folder and
crawler-owned output folder were both rejected in favor of the frontend's own
public/static assets folder, to avoid a cross-package copy step.
