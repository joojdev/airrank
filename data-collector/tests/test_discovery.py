from datetime import datetime, timezone
from pathlib import Path

import pytest
from langchain_core.language_models.fake_chat_models import FakeMessagesListChatModel
from langchain_core.messages import AIMessage

from data_collector import discovery, storage
from data_collector.llm_extraction import AircraftExtraction
from data_collector.models import AircraftIndexEntry, RawPage

FIXTURES = Path(__file__).parent / "fixtures"


class _FakeToolCallingChatModel(FakeMessagesListChatModel):
    """See tests/test_llm_extraction.py for why bind_tools needs overriding here."""

    def bind_tools(self, tools, **kwargs):
        return self


def _fake_llm_returning(extraction: AircraftExtraction) -> _FakeToolCallingChatModel:
    response = AIMessage(
        content="",
        tool_calls=[
            {
                "name": "AircraftExtraction",
                "args": extraction.model_dump(),
                "id": "call1",
                "type": "tool_call",
            }
        ],
    )
    return _FakeToolCallingChatModel(responses=[response])


class _FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def json(self):
        return self._payload


class FakeSession:
    def __init__(
        self,
        index_page_titles=None,
        wikitext_by_title=None,
        categories_by_title=None,
        missing_titles=None,
    ):
        self.index_page_titles = index_page_titles or []
        self.wikitext_by_title = wikitext_by_title or {}
        self.categories_by_title = categories_by_title or {}
        self.missing_titles = missing_titles or set()
        self.get_calls = []

    def get(self, url, params=None, timeout=None):
        self.get_calls.append(params)
        action = params.get("action")
        if action == "query" and params.get("list") == "categorymembers":
            return _FakeResponse(
                {"query": {"categorymembers": [{"title": t} for t in self.index_page_titles]}}
            )
        title = params.get("page") or params.get("titles")
        if action == "parse":
            if title in self.missing_titles:
                return _FakeResponse(
                    {"error": {"code": "missingtitle", "info": "The page you specified doesn't exist."}}
                )
            return _FakeResponse(
                {"parse": {"title": title, "wikitext": {"*": self.wikitext_by_title[title]}}}
            )
        cats = self.categories_by_title.get(title, [])
        return _FakeResponse(
            {"query": {"pages": {"1": {"title": title, "categories": [{"title": c} for c in cats]}}}}
        )


def test_parse_index_page_extracts_manufacturer_and_letter_context():
    wikitext = (FIXTURES / "list_of_aircraft_a_wikitext.txt").read_text()
    entries = discovery.parse_index_page(wikitext, "List of aircraft (A)")

    by_title = {entry.aircraft_title: entry for entry in entries}
    assert by_title["Airbus A320neo"].manufacturer == "Airbus"
    assert by_title["Airbus A320neo"].letter_section == "A"
    assert by_title["Airbus A320neo"].source_index_page == "List of aircraft (A)"
    assert by_title["Boeing 747-8"].manufacturer == "Boeing"
    assert by_title["Boeing 747-8"].letter_section == "B"


def test_parse_index_page_strips_ref_tags():
    wikitext = (FIXTURES / "list_of_aircraft_a_wikitext.txt").read_text()
    entries = discovery.parse_index_page(wikitext, "List of aircraft (A)")
    titles = [entry.aircraft_title for entry in entries]
    assert "Airbus A350" in titles
    assert not any("cite book" in title for title in titles)


def test_parse_index_page_handles_piped_display_text():
    wikitext = "== A ==\n=== [[Aeritalia]] ===\n* [[Aeritalia G.222|G.222]]\n"
    entries = discovery.parse_index_page(wikitext, "test page")
    assert entries[0].aircraft_title == "Aeritalia G.222"
    assert entries[0].display_text == "G.222"


def test_parse_index_page_ignores_bullets_before_any_manufacturer_heading():
    wikitext = "== A ==\n* [[Stray Bullet]]\n=== [[Airbus]] ===\n* [[Airbus A320neo]]\n"
    entries = discovery.parse_index_page(wikitext, "test page")
    titles = [entry.aircraft_title for entry in entries]
    assert "Stray Bullet" not in titles
    assert "Airbus A320neo" in titles


def test_build_aircraft_index_and_search_by_title(tmp_path):
    conn = storage.get_connection(tmp_path / "pipeline.sqlite3")
    wikitext = (FIXTURES / "list_of_aircraft_a_wikitext.txt").read_text()
    session = FakeSession(
        index_page_titles=["List of aircraft (A)"],
        wikitext_by_title={"List of aircraft (A)": wikitext},
    )

    count = discovery.build_aircraft_index(conn, session)

    assert count == 5
    results = discovery.search_index(conn, "A320neo")
    assert [r.aircraft_title for r in results] == ["Airbus A320neo"]


def test_search_by_manufacturer_name():
    conn = storage.get_connection(Path(":memory:"))
    storage.replace_aircraft_index(
        conn,
        [
            AircraftIndexEntry("Airbus A320neo", "Airbus A320neo", "Airbus", "A", "p"),
            AircraftIndexEntry("Airbus A350", "Airbus A350", "Airbus", "A", "p"),
            AircraftIndexEntry("Boeing 747-8", "Boeing 747-8", "Boeing", "B", "p"),
        ],
    )
    results = discovery.search_index(conn, "Airbus")
    titles = {r.aircraft_title for r in results}
    assert titles == {"Airbus A320neo", "Airbus A350"}


def test_classify_candidate_uses_cache_on_second_call(tmp_path):
    conn = storage.get_connection(tmp_path / "pipeline.sqlite3")
    wikitext = (FIXTURES / "cessna_172_wikitext.txt").read_text()
    session = FakeSession(wikitext_by_title={"Cessna 172": wikitext})
    llm = _fake_llm_returning(
        AircraftExtraction(
            name="Cessna 172", is_single_aircraft=True, type=["Geral/Utilitário"]
        )
    )

    first = discovery.classify_candidate("Cessna 172", conn, session, llm)
    calls_after_first = len(session.get_calls)
    second = discovery.classify_candidate("Cessna 172", conn, session, llm)

    assert first == second == ["Geral/Utilitário"]
    assert len(session.get_calls) == calls_after_first  # cache hit, no new fetch


def test_classify_candidate_never_writes_raw_pages(tmp_path):
    conn = storage.get_connection(tmp_path / "pipeline.sqlite3")
    wikitext = (FIXTURES / "cessna_172_wikitext.txt").read_text()
    session = FakeSession(wikitext_by_title={"Cessna 172": wikitext})
    llm = _fake_llm_returning(AircraftExtraction(name="Cessna 172", is_single_aircraft=True))

    discovery.classify_candidate("Cessna 172", conn, session, llm)

    assert storage.get_raw_page_by_resolved_title(conn, "Cessna 172") is None


def test_classify_candidate_caches_empty_type_for_a_missing_page(tmp_path):
    """Regression test: index entries can be red links (bulleted on a "List of
    aircraft" page but never given their own article). This used to bubble up a
    bare KeyError('parse') and crash the whole classify-visible batch in the TUI --
    it should instead be treated like any other "couldn't determine a type" result:
    cached as [] so the same broken title isn't refetched every time."""
    conn = storage.get_connection(tmp_path / "pipeline.sqlite3")
    session = FakeSession(missing_titles={"1911 Oertz monoplane"})

    result = discovery.classify_candidate("1911 Oertz monoplane", conn, session)
    calls_after_first = len(session.get_calls)
    result_again = discovery.classify_candidate("1911 Oertz monoplane", conn, session)

    assert result == result_again == []
    assert len(session.get_calls) == calls_after_first  # cached, no second fetch


def test_load_targets_skips_blank_and_comment_lines(tmp_path):
    targets_path = tmp_path / "targets.txt"
    targets_path.write_text("# comment\nCessna 172\n\nBoeing 747-8\n")
    assert discovery.load_targets(targets_path) == ["Cessna 172", "Boeing 747-8"]


def test_append_targets_skips_titles_already_present(tmp_path):
    targets_path = tmp_path / "targets.txt"
    targets_path.write_text("Cessna 172\n")

    appended = discovery.append_targets(targets_path, ["Cessna 172", "Boeing 747-8"])

    assert appended == ["Boeing 747-8"]
    lines = discovery.load_targets(targets_path)
    assert lines.count("Cessna 172") == 1
    assert lines.count("Boeing 747-8") == 1


def test_append_targets_to_missing_file_creates_it(tmp_path):
    targets_path = tmp_path / "targets.txt"
    appended = discovery.append_targets(targets_path, ["Cessna 172"])
    assert appended == ["Cessna 172"]
    assert discovery.load_targets(targets_path) == ["Cessna 172"]
