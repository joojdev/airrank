"""Stage 2: judge whether a raw page is even about an aircraft, before spending an LLM
call on it in stage 3. Deliberately the only check left here -- whether a specific page
is a real, single-aircraft article with usable specs (vs. a family/overview page, or one
with no usable data at all) is a judgment call the LLM extractor makes directly (see
`AircraftExtraction.is_single_aircraft` in llm_extraction.py), not something regex can
reliably tell apart across every wikitext shape Wikipedia actually uses."""

import re

from data_collector.models import FilterDecision, RawPage

_INFOBOX_PATTERN = re.compile(r"\{\{\s*Infobox\s+aircraft", re.IGNORECASE)


def has_aircraft_infobox(wikitext: str) -> bool:
    return bool(_INFOBOX_PATTERN.search(wikitext))


def classify_page(raw_page: RawPage) -> FilterDecision:
    if not has_aircraft_infobox(raw_page.wikitext):
        return FilterDecision(
            raw_page_id=raw_page.id,
            include=False,
            reason="no aircraft infobox found",
        )
    return FilterDecision(raw_page_id=raw_page.id, include=True, reason=None)


def run_filter_stage(conn) -> list[FilterDecision]:
    from data_collector import storage

    decisions = []
    for raw_page in storage.list_raw_pages(conn):
        decision = classify_page(raw_page)
        storage.upsert_filter_decision(conn, decision)
        decisions.append(decision)
    return decisions
