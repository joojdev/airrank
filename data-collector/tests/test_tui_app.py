"""Light, pragmatic pytest coverage for TUI widget wiring using Textual's own Pilot
test harness -- see the module docstring in data_collector/tui/app.py for why this is
pytest (not Gherkin) per the constitution's Principle I carve-out for unit-level
detail. This is a personal productivity tool, not game logic, so coverage here is
scoped to a couple of smoke tests rather than every keybinding.

Pilot's App.run_test() is async; wrapped in asyncio.run() inside plain sync test
functions so no pytest-asyncio dependency is needed.
"""

import asyncio

from langchain_core.language_models.fake_chat_models import FakeMessagesListChatModel
from langchain_core.messages import AIMessage

from data_collector import discovery, storage
from data_collector.llm_extraction import AircraftExtraction
from data_collector.models import AircraftIndexEntry
from data_collector.tui.app import AircraftBrowserApp


class _FakeToolCallingChatModel(FakeMessagesListChatModel):
    """See tests/test_llm_extraction.py for why bind_tools needs overriding here."""

    def bind_tools(self, tools, **kwargs):
        return self


def _fake_llm() -> _FakeToolCallingChatModel:
    """Cycles the same "no type determined" extraction for every title classified --
    these tests only care that classify-visible completes without crashing, not what
    type it guesses."""
    response = AIMessage(
        content="",
        tool_calls=[
            {
                "name": "AircraftExtraction",
                "args": AircraftExtraction(name="unused", is_single_aircraft=True).model_dump(),
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


class _FakeSession:
    """Minimal stand-in for requests.Session -- enough for classify_candidate's
    single wikitext fetch per title, no real network call."""

    def __init__(self, wikitext_by_title, missing_titles=None):
        self.wikitext_by_title = wikitext_by_title
        self.missing_titles = missing_titles or set()

    def get(self, url, params=None, timeout=None):
        title = params.get("page") or params.get("titles")
        if title in self.missing_titles:
            return _FakeResponse(
                {"error": {"code": "missingtitle", "info": "The page you specified doesn't exist."}}
            )
        return _FakeResponse(
            {"parse": {"title": title, "wikitext": {"*": self.wikitext_by_title.get(title, "")}}}
        )


def _make_app(tmp_path, session=None, entries=None, llm=None):
    db_path = tmp_path / "pipeline.sqlite3"
    seed_conn = storage.get_connection(db_path)
    storage.replace_aircraft_index(
        seed_conn,
        entries
        if entries is not None
        else [
            AircraftIndexEntry("Cessna 172", "Cessna 172", "Cessna", "C", "p"),
            AircraftIndexEntry("Boeing 747-8", "Boeing 747-8", "Boeing", "B", "p"),
        ],
    )
    seed_conn.close()
    targets_path = tmp_path / "targets.txt"
    app = AircraftBrowserApp(
        db_path=db_path, session=session, targets_path=targets_path, llm=llm
    )
    return app, targets_path


def test_search_populates_results_table(tmp_path):
    async def scenario():
        app, _ = _make_app(tmp_path)
        async with app.run_test() as pilot:
            await pilot.click("#search-input")
            await pilot.press(*"Cessna")
            await pilot.pause()
            from textual.widgets import DataTable

            table = app.query_one("#results-table", DataTable)
            assert table.row_count == 1

    asyncio.run(scenario())


def test_empty_search_shows_the_whole_index_by_default(tmp_path):
    """The table must not look empty/broken just because nothing has been typed yet
    -- with no query, it shows as much of the index as it can (uncapped), not just
    what a real search would return."""

    async def scenario():
        app, _ = _make_app(tmp_path)
        async with app.run_test() as pilot:
            from textual.widgets import DataTable

            await pilot.pause()
            table = app.query_one("#results-table", DataTable)
            assert table.row_count == 2  # both seeded entries, no query typed

    asyncio.run(scenario())


def test_default_browse_loads_only_the_first_page(tmp_path):
    """Regression test for the real-world freeze with a ~30k-row index: the table
    must only ever pull one page (PAGE_SIZE) into memory/widget at a time, not the
    whole index, even for the default empty-query browse view."""

    async def scenario():
        entries = [
            AircraftIndexEntry(f"Aircraft {i}", f"Aircraft {i}", "Mfr", "A", "p")
            for i in range(14)
        ]
        app, _ = _make_app(tmp_path, entries=entries)
        app.PAGE_SIZE = 6
        async with app.run_test() as pilot:
            from textual.widgets import DataTable

            await pilot.pause()
            table = app.query_one("#results-table", DataTable)
            assert table.row_count == 6
            assert app._reached_end is False

    asyncio.run(scenario())


def test_scrolling_near_the_bottom_lazily_loads_the_next_page(tmp_path):
    async def scenario():
        entries = [
            AircraftIndexEntry(f"Aircraft {i}", f"Aircraft {i}", "Mfr", "A", "p")
            for i in range(14)
        ]
        app, _ = _make_app(tmp_path, entries=entries)
        app.PAGE_SIZE = 6
        async with app.run_test() as pilot:
            from textual.widgets import DataTable

            await pilot.pause()
            table = app.query_one("#results-table", DataTable)
            await pilot.click("#results-table")
            for _ in range(20):  # walk the cursor down to trigger more page loads
                await pilot.press("down")
            await pilot.pause()
            assert table.row_count == 14
            assert app._reached_end is True

    asyncio.run(scenario())


def test_space_toggles_row_selection(tmp_path):
    async def scenario():
        app, _ = _make_app(tmp_path)
        async with app.run_test() as pilot:
            await pilot.click("#search-input")
            await pilot.press(*"Cessna")
            await pilot.pause()
            await pilot.press("tab")  # move focus from input to results table
            await pilot.press("space")
            await pilot.pause()
            assert "Cessna 172" in app.selected

    asyncio.run(scenario())


def test_ctrl_shortcuts_do_not_leak_into_search_input_while_focused(tmp_path):
    """Regression test: plain-letter shortcuts (the original "r"/"shift+r"/"c") typed
    a stray character into the search box instead of firing while it had focus, since
    Input consumes unmodified printable keys for text entry before any App-level
    binding sees them. ctrl+ combos are a different key event Input doesn't claim, so
    they must reach the App bindings instead of appearing in the search text.

    Exercises ctrl+t (classify_visible) since the results table is populated by
    default now (empty search shows the whole index -- see
    test_empty_search_shows_the_whole_index_by_default), so this needs a real,
    fake-but-working session for the classify worker to complete instead of crashing.
    ctrl+r/f5 (rebuild_index/run_pipeline) aren't exercised here since they touch the
    network-fetch side of discovery/pipeline, out of scope for this widget-wiring
    smoke test.
    """

    async def scenario():
        session = _FakeSession(
            {"Cessna 172": "{{Infobox aircraft}}", "Boeing 747-8": "{{Infobox aircraft}}"}
        )
        app, _ = _make_app(tmp_path, session=session, llm=_fake_llm())
        async with app.run_test() as pilot:
            from textual.widgets import Input

            await pilot.click("#search-input")
            await pilot.press("ctrl+t")
            await pilot.pause()
            assert app.query_one("#search-input", Input).value == ""

    asyncio.run(scenario())


def test_classify_visible_survives_a_missing_page_among_the_batch(tmp_path):
    """Regression test for a real crash: Ctrl+T over the default browse view hit a
    red-link title ("1911 Oertz monoplane" -- bulleted on a Wikipedia list page but
    never given its own article), and the whole 200-title worker died with an
    unhandled KeyError instead of classifying the other 199. One bad title must not
    stop the rest from being classified."""

    async def scenario():
        session = _FakeSession(
            {"Cessna 172": "{{Infobox aircraft}}"},
            missing_titles={"Boeing 747-8"},
        )
        app, _ = _make_app(tmp_path, session=session, llm=_fake_llm())
        async with app.run_test() as pilot:
            from textual.widgets import DataTable

            await pilot.pause()
            await pilot.click("#search-input")
            await pilot.press("ctrl+t")
            await pilot.pause()

            table = app.query_one("#results-table", DataTable)
            # The missing title is cached as "no type known" instead of crashing...
            assert table.get_cell("Boeing 747-8", "type") == ""
            assert storage.get_cached_type(app.conn, "Boeing 747-8") == []
            # ...and the batch kept going: the other title still got processed.
            assert storage.get_cached_type(app.conn, "Cessna 172") is not None

    asyncio.run(scenario())


def test_confirm_selection_appends_to_targets_file(tmp_path):
    async def scenario():
        app, targets_path = _make_app(tmp_path)
        async with app.run_test() as pilot:
            app.selected.add("Cessna 172")
            await pilot.press("ctrl+s")
            await pilot.pause()
            assert discovery.load_targets(targets_path) == ["Cessna 172"]

    asyncio.run(scenario())
