# Data Collector

The local, on-demand data collector for the Airplane Guessing Game. It fetches aircraft
data from English Wikipedia's MediaWiki API (see `../docs/data-sources.md`), then runs
it through a fetch → filter → clean → export pipeline into
`frontend/public/data/airplanes.json`, the game's sole data source.

Python, using `requests` for the (plain JSON) MediaWiki API calls — no HTML scraping,
no Selenium, since the data source is a JSON API, not a JS-rendered page. Feature-level
pipeline behavior is verified with `behave` (Gherkin); supporting unit tests use
`pytest`.

This data collector is **not** a running service. Run it manually, locally, whenever
you need to (re)generate the data file — there is no scheduler, cron job, or deployed
process.

## Install

```bash
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Stage 3 (clean) and the TUI's classify-visible action call an LLM (via LangChain) to
extract fields from raw wikitext. Which provider is picked at runtime by the
`LLM_PROVIDER` env var; set the matching credentials in a `data-collector/.env` file
(git-ignored, never committed) instead of exporting them by hand every session:

**Google AI Studio** (default, `LLM_PROVIDER=google` or unset) — free tier, but a low
daily request quota. Get a key at
[aistudio.google.com/apikey](https://aistudio.google.com/apikey):

```
GOOGLE_API_KEY=...
```

**Azure OpenAI** (`LLM_PROVIDER=azure`) — not free, but cheap (well under $1 for the
whole dataset) and no daily request cap. Requires an Azure account with an OpenAI
resource and a `gpt-5.4-mini` deployment created in the
[Azure AI Foundry portal](https://ai.azure.com/) first (a plain free-trial
subscription has zero LLM quota until upgraded to Pay-As-You-Go, though the $200
trial credit still applies after upgrading):

```
LLM_PROVIDER=azure
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_ENDPOINT=https://<your-resource>.openai.azure.com/
OPENAI_API_VERSION=...
```

Browsing/searching in the TUI, and stages 1/2/4 (fetch/filter/export), don't need a key.

## Run

The pipeline has four stages, runnable individually or all at once. Each stage reads
from and writes to a local, git-ignored SQLite working database
(`.data/pipeline.sqlite3` by default) — only the final `export` stage touches the
committed `frontend/public/data/airplanes.json`.

```bash
source .venv/bin/activate

# Run every stage in sequence, using the titles listed in targets.txt
python -m data_collector.main run-all

# Or run stages individually, e.g. while iterating on clean/export logic
# without re-fetching from Wikipedia:
python -m data_collector.main fetch     # Stage 1: fetch + cache raw wikitext/categories
python -m data_collector.main filter    # Stage 2: exclude unparseable page shapes
python -m data_collector.main clean     # Stage 3: extract, validate, normalize
python -m data_collector.main export    # Stage 4: write frontend/public/data/airplanes.json
```

`targets.txt` (one Wikipedia article title per line, `#`-prefixed lines ignored) is the
list of aircraft the fetch stage will pull. Records where the LLM flagged one or more
fields as uncertain are excluded from `export`'s output by default; pass
`--include-needs-review` to `export` (or `run-all`) to include them anyway for local
inspection.

## Test

```bash
source .venv/bin/activate

# Feature-level Gherkin scenarios (fixtures only, no live network calls)
behave

# Unit tests
pytest
```

## Project layout

- `data_collector/` — the Python package
  - `main.py` — CLI entry point (`fetch` / `filter` / `clean` / `export` / `run-all`)
  - `wikipedia_client.py` — Stage 1: MediaWiki API calls
  - `page_classifier.py` — Stage 2: has-an-aircraft-infobox-at-all judgment
  - `llm_extraction.py` — Stage 3: LLM-based extraction (schema, prompt, unit-conversion tools)
  - `llm_provider.py` — the one place a concrete LLM provider is chosen (swap it here)
  - `unit_conversion.py` — pure unit-conversion math, used as tools the LLM calls
  - `pipeline.py` — thin orchestration across stages
  - `export.py` — Stage 4: writes the committed JSON
  - `storage.py` — the SQLite working store (schema + read/write helpers)
  - `models.py` — shared dataclasses
- `features/` — Gherkin `.feature` files (one per stage) and their step definitions (`features/steps/`)
- `tests/` — pytest unit tests, with wikitext/category fixtures under `tests/fixtures/`
- `targets.txt` — the list of Wikipedia article titles the fetch stage pulls
