# Crawler

The local, on-demand data collector for the Airplane Guessing Game. Python, using
Selenium for JavaScript-rendered targets and `requests`/`httpx` + BeautifulSoup for
plain HTML targets. Feature-level behavior is verified with `behave` (Gherkin);
supporting unit tests use `pytest`.

At this stage this is a boilerplate scaffold: it writes one placeholder record to
prove the crawler → frontend hand-off works. No real collection target yet — see
`specs/001-project-boilerplate/spec.md`.

This crawler is **not** a running service. Run it manually, locally, whenever you need
to (re)generate the data file — there is no scheduler, cron job, or deployed process.

## Install

```bash
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Run

```bash
source .venv/bin/activate
python -m crawler.main
```

Writes (or overwrites) `../frontend/public/data/airplanes.json`.

## Test

```bash
source .venv/bin/activate

# Feature-level Gherkin scenarios
behave

# Unit tests
pytest
```

## Project layout

- `crawler/` — the Python package; `main.py` is the entry point
- `features/` — Gherkin `.feature` files and their step definitions (`features/steps/`)
- `tests/` — pytest unit tests
