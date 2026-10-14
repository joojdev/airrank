# airplane-guessing-game

A browser guessing game about airplanes. The project has two independent sides:

- **[`frontend/`](frontend/README.md)** — the browser game (TypeScript, Vite, React,
  shadcn/ui). Install/run/test instructions are in `frontend/README.md`.
- **[`data-collector/`](data-collector/README.md)** — the local, on-demand data
  collector (Python) that produces `frontend/public/data/airplanes.json`, the app's
  sole data source. Install/run/test instructions are in `data-collector/README.md`.

Each side has its own dependencies and can be installed, run, and tested without
touching the other. See `.specify/memory/constitution.md` for the project's governing
principles and `specs/001-project-boilerplate/` for the spec behind this scaffold.
