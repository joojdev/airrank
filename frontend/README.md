# Frontend

The browser game shell for the Airplane Guessing Game. TypeScript + Vite + React +
shadcn/ui + Tailwind CSS + Zustand. Feature-level behavior is verified with
Playwright driven by Cucumber (Gherkin); pure-logic units get Vitest.

At this stage this is a boilerplate scaffold: one placeholder screen and one example
Gherkin scenario proving the RED → GREEN workflow. No real game logic or real
airplane data yet — see `specs/001-project-boilerplate/spec.md`.

## Install

```bash
npm install
```

## Run

```bash
npm run dev
```

Opens the dev server (prints the local URL, typically http://localhost:5173).

## Test

```bash
# Unit tests (Vitest)
npm run test:unit

# Feature-level Gherkin scenarios (Playwright + Cucumber via playwright-bdd)
# Builds the app, generates Playwright specs from features/*.feature, then runs them
# against a local preview server.
npm run test:e2e
```

## Data

The crawler (see `../crawler/README.md`) writes its output to
`public/data/airplanes.json`. This app reads that file directly — no build step, no
backend.

## Project layout

- `src/components/` — UI components (shadcn/ui-based)
- `src/store/` — Zustand store(s)
- `features/` — Gherkin `.feature` files
- `tests/steps/` — Cucumber step definitions (Playwright-driven)
- `tests/unit/` — Vitest unit tests
- `public/data/airplanes.json` — crawler's committed output (see above)
