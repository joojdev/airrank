import json
from pathlib import Path

from data_collector.models import RawPage
from data_collector.page_classifier import has_aircraft_infobox, classify_page

FIXTURES = Path(__file__).parent / "fixtures"


def _wikitext(name: str) -> str:
    return (FIXTURES / f"{name}_wikitext.txt").read_text()


def _raw_page(name: str, raw_page_id: int = 1) -> RawPage:
    categories = json.loads((FIXTURES / f"{name}_categories.json").read_text())
    return RawPage(
        id=raw_page_id,
        requested_title=name,
        resolved_title=name,
        wikitext=_wikitext(name),
        categories=categories,
        fetched_at="2026-08-08T00:00:00Z",
    )


def test_has_aircraft_infobox_true_for_all_fixtures():
    for name in ("cessna_172", "f16", "black_hawk", "a320_family"):
        assert has_aircraft_infobox(_wikitext(name)), name


def test_classify_page_includes_well_formed_single_aircraft_page():
    decision = classify_page(_raw_page("cessna_172"))
    assert decision.include is True
    assert decision.reason is None


def test_classify_page_includes_family_overview_page_since_it_has_an_infobox():
    """Whether a page is really a single, well-specified aircraft (vs. a
    family/overview page with no usable specs) is no longer filter's job -- it's
    `AircraftExtraction.is_single_aircraft`, decided by the LLM at clean time. Filter
    only checks for an infobox at all, so a family page like this one is included."""
    decision = classify_page(_raw_page("a320_family"))
    assert decision.include is True
    assert decision.reason is None


def test_classify_page_excludes_page_with_no_infobox_at_all():
    raw_page = RawPage(
        id=1,
        requested_title="Not An Aircraft",
        resolved_title="Not An Aircraft",
        wikitext="Some article that is not about an aircraft and has no relevant infobox.",
        categories=[],
        fetched_at="2026-08-08T00:00:00Z",
    )
    decision = classify_page(raw_page)
    assert decision.include is False
    assert "infobox" in decision.reason
