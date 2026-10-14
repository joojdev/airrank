"""Textual TUI for browsing Wikipedia's aircraft index and curating targets.txt.

Per the constitution's Principle I: the *behavior* this UI drives -- index building,
search, dedup, and running the fetch/filter/clean/export pipeline stages -- is
feature-level and already has `.feature` coverage in
`features/discover_and_select_aircraft.feature` and the pipeline's own four feature
files, all exercised directly against `discovery.py`/`pipeline.py` with no Textual in
the loop. This module is pure widget wiring -- layout, key bindings, rendering -- which
is the "unit-level detail" the constitution explicitly allows to be covered by pytest
(see tests/test_tui_app.py, using Textual's own Pilot test harness) rather than
Gherkin. Kept as a single screen (no Screen subclass) since there's only one: no
navigation stack to justify the extra indirection.
"""

from pathlib import Path
from typing import Optional

from langchain_core.language_models import BaseChatModel
from textual import work
from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.containers import Horizontal, Vertical
from textual.widgets import (
    DataTable,
    Footer,
    Header,
    Input,
    Label,
    ListItem,
    ListView,
    RichLog,
)

from data_collector import discovery, page_classifier, pipeline, storage
from data_collector.export import export_airplanes_json


class AircraftBrowserApp(App):
    """Search Wikipedia's aircraft index, multi-select titles, write them to
    targets.txt, and optionally run the pipeline immediately."""

    CSS = """
    #search-column { width: 7fr; }
    #selected-panel { width: 3fr; border: solid $accent; padding: 0 1; }
    #log-panel { height: 10; border-top: solid $accent; display: none; }
    #log-panel.visible { display: block; }
    """

    # Plain letters (space included) are deliberately NOT used here beyond `space`,
    # which only acts as "toggle row" while the DataTable itself has focus -- while
    # the search Input has focus, `space` must still type a literal space (searches
    # like "Boeing 747" need one). Every OTHER action below uses a ctrl+ combo
    # instead of a bare letter specifically so it fires regardless of which widget
    # has focus: Input only intercepts unmodified printable keys for text entry
    # (confirmed against Input.BINDINGS), so ctrl+r/ctrl+t/ctrl+s pass through to
    # these App-level bindings even while the user is mid-search, instead of typing
    # a stray letter into the search box. run_pipeline is on f5, not a ctrl+ combo,
    # because ctrl+p is Textual's own built-in command-palette binding (a *priority*
    # binding, so it always wins over an app binding on the same key) -- left enabled
    # rather than fighting it for the key.
    BINDINGS = [
        Binding("space", "toggle_row", "Select/deselect"),
        Binding("ctrl+t", "classify_visible", "Classify visible"),
        Binding("ctrl+s", "confirm_selection", "Confirm selection"),
        Binding("f5", "run_pipeline", "Run pipeline"),
        Binding("ctrl+r", "rebuild_index", "Rebuild index"),
    ]

    # Results are fetched a page at a time (LIMIT/OFFSET), not all at once -- with a
    # ~30k-row real index, building the whole result set and adding every row to the
    # DataTable synchronously on mount is what was freezing the terminal on startup.
    # A page this size is a near-instant SQLite query either way, so the first page
    # loads synchronously; later pages load the same way, triggered lazily as the
    # cursor nears the bottom of what's already loaded (see
    # on_data_table_row_highlighted).
    PAGE_SIZE = 200

    def __init__(
        self,
        db_path: Path,
        session,
        targets_path: Path,
        llm: Optional[BaseChatModel] = None,
    ):
        super().__init__()
        # sqlite3 connections can't cross threads (raises ProgrammingError), and the
        # @work(thread=True) methods below run on real OS threads, not just asyncio
        # tasks -- so only self.conn (opened here, on the main thread) is used for
        # UI-driven reads (search, cache lookups); every worker opens its own
        # short-lived connection to the same db_path instead of touching self.conn.
        self.db_path = db_path
        self.conn = storage.get_connection(db_path)
        self.session = session
        self.targets_path = targets_path
        # None until first actually needed (classify/run pipeline) -- built lazily by
        # discovery.classify_candidate/pipeline.run_clean_stage, so browsing/searching
        # never requires the active LLM provider's credentials to be set, only those
        # two actions do.
        self.llm = llm
        self.selected: set[str] = set()
        self._current_query = ""
        self._loaded_count = 0
        self._reached_end = False

    def compose(self) -> ComposeResult:
        yield Header()
        with Horizontal():
            with Vertical(id="search-column"):
                yield Input(
                    placeholder="Search aircraft or manufacturer…", id="search-input"
                )
                yield Label("", id="status-label")
                yield DataTable(id="results-table")
            with Vertical(id="selected-panel"):
                yield Label("Selected")
                yield ListView(id="selected-list")
        yield RichLog(id="log-panel")
        yield Footer()

    def on_mount(self) -> None:
        table = self.query_one("#results-table", DataTable)
        table.add_column("Sel", key="sel")
        table.add_column("Title", key="title")
        table.add_column("Manufacturer", key="manufacturer")
        table.add_column("Type", key="type")
        table.cursor_type = "row"
        self.query_one("#search-input", Input).focus()

        index_count = storage.get_aircraft_index_count(self.conn)
        if index_count == 0:
            self.notify(
                "Index is empty -- press Ctrl+R to build it from Wikipedia.",
                timeout=8,
            )
        else:
            self._refresh_current_search()
            self.notify(f"{index_count} aircraft indexed.", timeout=4)

    def on_input_changed(self, event: Input.Changed) -> None:
        if event.input.id == "search-input":
            self._refresh_results(event.value)

    def _refresh_current_search(self) -> None:
        """Re-runs whatever search (or default browse, if empty) is currently in the
        box -- called after a background index rebuild finishes so the table updates
        immediately instead of only on the next keystroke."""
        self._refresh_results(self.query_one("#search-input", Input).value)

    def on_data_table_row_selected(self, event: DataTable.RowSelected) -> None:
        self._toggle(str(event.row_key.value))

    def on_data_table_row_highlighted(self, event: DataTable.RowHighlighted) -> None:
        # Lazy-load the next page once the cursor gets close to the bottom of what's
        # already in the table -- this is what makes "scrolling down" feel like an
        # infinite list without ever having pulled the whole index into memory/widget
        # at once.
        table = event.data_table
        if not self._reached_end and event.cursor_row >= table.row_count - 5:
            self._load_next_page()

    def action_toggle_row(self) -> None:
        table = self.query_one("#results-table", DataTable)
        if table.row_count == 0:
            return
        row_key = table.coordinate_to_cell_key(table.cursor_coordinate).row_key
        self._toggle(str(row_key.value))

    def _toggle(self, title: str) -> None:
        if title in self.selected:
            self.selected.discard(title)
        else:
            self.selected.add(title)
        table = self.query_one("#results-table", DataTable)
        if title in table.rows:
            table.update_cell(title, "sel", "[x]" if title in self.selected else "[ ]")
        self._refresh_selected_list()

    def _refresh_selected_list(self) -> None:
        list_view = self.query_one("#selected-list", ListView)
        list_view.clear()
        for title in sorted(self.selected):
            list_view.append(ListItem(Label(title)))

    def _refresh_results(self, query: str) -> None:
        # An empty query still calls search_index (its `LIKE` pattern matches
        # everything when the query is ""), so the table shows real results right away
        # rather than looking empty/broken the moment the index finishes building --
        # before the user has typed anything. Only the first page loads here, though;
        # see _load_next_page for the rest.
        self._current_query = query
        self._loaded_count = 0
        self._reached_end = False
        table = self.query_one("#results-table", DataTable)
        table.clear()
        self._load_next_page()

    def _load_next_page(self) -> None:
        if self._reached_end:
            return
        table = self.query_one("#results-table", DataTable)
        entries = discovery.search_index(
            self.conn, self._current_query, limit=self.PAGE_SIZE, offset=self._loaded_count
        )
        self._loaded_count += len(entries)
        if len(entries) < self.PAGE_SIZE:
            self._reached_end = True
        for entry in entries:
            mark = "[x]" if entry.aircraft_title in self.selected else "[ ]"
            cached_type = storage.get_cached_type(self.conn, entry.aircraft_title)
            type_text = ", ".join(cached_type) if cached_type else ""
            table.add_row(
                mark,
                entry.aircraft_title,
                entry.manufacturer or "",
                type_text,
                key=entry.aircraft_title,
            )
        self._update_status()

    def _update_status(self) -> None:
        status = self.query_one("#status-label", Label)
        if self._loaded_count == 0:
            status.update("No matches.")
        elif self._reached_end:
            status.update(f"{self._loaded_count} aircraft (all loaded).")
        else:
            status.update(f"{self._loaded_count}+ aircraft loaded -- scroll for more.")

    def action_classify_visible(self) -> None:
        table = self.query_one("#results-table", DataTable)
        titles = [str(key.value) for key in table.rows]
        if titles:
            self._classify_titles(titles)

    def action_confirm_selection(self) -> None:
        self._confirm_selection()

    def _confirm_selection(self) -> list[str]:
        if not self.selected:
            self.notify("Nothing selected.")
            return []
        appended = discovery.append_targets(self.targets_path, sorted(self.selected))
        already_present = len(self.selected) - len(appended)
        self.notify(
            f"Added {len(appended)} new title(s)"
            + (f", {already_present} already present" if already_present else "")
            + f" to {self.targets_path.name}."
        )
        return appended

    def action_run_pipeline(self) -> None:
        self._confirm_selection()
        log_panel = self.query_one("#log-panel", RichLog)
        log_panel.add_class("visible")
        self._run_pipeline_worker()

    def action_rebuild_index(self) -> None:
        log_panel = self.query_one("#log-panel", RichLog)
        log_panel.add_class("visible")
        self._rebuild_index_worker()

    @work(thread=True)
    def _classify_titles(self, titles: list[str]) -> None:
        # classify_candidate already treats "page doesn't exist" as a normal, cached
        # outcome (see its docstring) -- this broader except is for anything else that
        # can go wrong talking to Wikipedia (timeouts, connection errors), so that one
        # bad title in a 200-title batch can't abort classification of the rest.
        conn = storage.get_connection(self.db_path)
        llm = self.llm
        if llm is None:
            from data_collector.llm_provider import build_default_llm

            llm = build_default_llm()
        failed = 0
        try:
            for title in titles:
                try:
                    types = discovery.classify_candidate(title, conn, self.session, llm)
                except Exception:
                    failed += 1
                    continue
                self.call_from_thread(self._apply_classified_type, title, types)
        finally:
            conn.close()
        if failed:
            self.call_from_thread(
                self.notify,
                f"{failed} of {len(titles)} title(s) could not be classified (fetch error).",
            )

    def _apply_classified_type(self, title: str, types: list[str]) -> None:
        table = self.query_one("#results-table", DataTable)
        if title in table.rows:
            table.update_cell(title, "type", ", ".join(types))

    @work(thread=True)
    def _run_pipeline_worker(self) -> None:
        log_panel = self.query_one("#log-panel", RichLog)
        conn = storage.get_connection(self.db_path)
        try:
            targets = discovery.load_targets(self.targets_path)

            self.call_from_thread(log_panel.write, f"Fetching {len(targets)} target(s)...")
            missing_images = pipeline.run_fetch_stage(targets, conn, self.session)
            if missing_images:
                self.call_from_thread(
                    log_panel.write,
                    f"No image found for: {', '.join(missing_images)}",
                )

            decisions = page_classifier.run_filter_stage(conn)
            included = sum(1 for d in decisions if d.include)
            self.call_from_thread(
                log_panel.write,
                f"Filtered {len(decisions)} page(s): {included} included.",
            )

            def on_progress(index: int, total: int, title: str) -> None:
                self.call_from_thread(log_panel.write, f"[{index}/{total}] Cleaning {title}...")

            def on_retry(message: str) -> None:
                self.call_from_thread(log_panel.write, f"  {message}")

            records = pipeline.run_clean_stage(
                conn, self.llm, on_progress=on_progress, on_retry=on_retry
            )
            self.call_from_thread(log_panel.write, f"Cleaned {len(records)} record(s).")

            output_path = export_airplanes_json(conn)
            self.call_from_thread(log_panel.write, f"Exported to {output_path}")
        finally:
            conn.close()

    @work(thread=True)
    def _rebuild_index_worker(self) -> None:
        log_panel = self.query_one("#log-panel", RichLog)
        conn = storage.get_connection(self.db_path)
        try:
            self.call_from_thread(log_panel.write, "Rebuilding aircraft index from Wikipedia...")
            count = discovery.build_aircraft_index(conn, self.session)
            self.call_from_thread(log_panel.write, f"Indexed {count} aircraft.")
            self.call_from_thread(self._refresh_current_search)
        finally:
            conn.close()
