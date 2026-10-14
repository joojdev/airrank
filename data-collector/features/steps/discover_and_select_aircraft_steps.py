from pathlib import Path

from behave import given, when, then
from langchain_core.language_models.fake_chat_models import FakeMessagesListChatModel
from langchain_core.messages import AIMessage

from data_collector import discovery, page_classifier, pipeline, storage
from data_collector.llm_extraction import AircraftExtraction

FIXTURES = Path(__file__).resolve().parents[2] / "tests" / "fixtures"


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


class _FakeSession:
    """Serves categorymembers (index discovery), parse (wikitext), and
    query&prop=categories (aircraft categories) -- no real network call is made."""

    def __init__(self, index_page_titles, wikitext_by_title, categories_by_title=None):
        self.index_page_titles = index_page_titles
        self.wikitext_by_title = wikitext_by_title
        self.categories_by_title = categories_by_title or {}
        self.get_calls = []

    def get(self, url, params=None, timeout=None):
        self.get_calls.append(params)
        action = params.get("action")
        if action == "query" and params.get("list") == "categorymembers":
            return _FakeResponse(
                {
                    "query": {
                        "categorymembers": [
                            {"title": title} for title in self.index_page_titles
                        ]
                    }
                }
            )
        title = params.get("page") or params.get("titles")
        if action == "parse":
            return _FakeResponse(
                {"parse": {"title": title, "wikitext": {"*": self.wikitext_by_title[title]}}}
            )
        cats = self.categories_by_title.get(title, [])
        return _FakeResponse(
            {
                "query": {
                    "pages": {
                        "1": {"title": title, "categories": [{"title": c} for c in cats]}
                    }
                }
            }
        )


def _ensure_conn(context):
    if not hasattr(context, "conn"):
        context.conn = storage.get_connection(context.db_path)
    return context.conn


@given('the "{index_title}" index page is available')
def step_impl(context, index_title):
    wikitext = (FIXTURES / "list_of_aircraft_a_wikitext.txt").read_text()
    context.session = _FakeSession(
        index_page_titles=[index_title], wikitext_by_title={index_title: wikitext}
    )


@given('the aircraft index has been built from "{index_title}"')
def step_impl(context, index_title):
    wikitext = (FIXTURES / "list_of_aircraft_a_wikitext.txt").read_text()
    context.session = _FakeSession(
        index_page_titles=[index_title], wikitext_by_title={index_title: wikitext}
    )
    discovery.build_aircraft_index(_ensure_conn(context), context.session)


@when("the aircraft index is built")
def step_impl(context):
    discovery.build_aircraft_index(_ensure_conn(context), context.session)


@when('searching the index for "{query}"')
def step_impl(context, query):
    context.search_results = discovery.search_index(_ensure_conn(context), query)


@then('searching the index for "{query}" returns "{title}"')
def step_impl(context, query, title):
    results = discovery.search_index(_ensure_conn(context), query)
    assert title in [r.aircraft_title for r in results], results


@then('the results include "{title}"')
def step_impl(context, title):
    assert title in [r.aircraft_title for r in context.search_results]


@given('targets.txt already contains "{title}"')
def step_impl(context, title):
    context.targets_path = context.tmp_dir / "targets.txt"
    context.targets_path.write_text(f"{title}\n")


@when('the selection "{title_a}" and "{title_b}" is confirmed')
def step_impl(context, title_a, title_b):
    discovery.append_targets(context.targets_path, [title_a, title_b])


@then('targets.txt contains "{title}" exactly once')
def step_impl(context, title):
    lines = [
        line.strip()
        for line in context.targets_path.read_text().splitlines()
        if line.strip() == title
    ]
    assert len(lines) == 1, lines


@given('the selection "{title}" has been confirmed into targets.txt')
def step_impl(context, title):
    context.targets_path = context.tmp_dir / "targets.txt"
    context.targets_path.write_text("")
    discovery.append_targets(context.targets_path, [title])


@given('the Wikipedia page "{title}" is fetchable with a parseable aircraft infobox')
def step_impl(context, title):
    wikitext = (FIXTURES / "cessna_172_wikitext.txt").read_text()
    context.session = _FakeSession(
        index_page_titles=[],
        wikitext_by_title={title: wikitext},
        categories_by_title={title: []},
    )


@when("the pipeline is run against the updated targets")
def step_impl(context):
    conn = _ensure_conn(context)
    titles = discovery.load_targets(context.targets_path)
    pipeline.run_fetch_stage(titles, conn, context.session)
    page_classifier.run_filter_stage(conn)
    llm = _fake_llm_returning(AircraftExtraction(name="Cessna 172", is_single_aircraft=True))
    pipeline.run_clean_stage(conn, llm)


@then('a cleaned_aircraft row exists for "{title}"')
def step_impl(context, title):
    raw_page = storage.get_raw_page_by_resolved_title(context.conn, title)
    assert raw_page is not None, "raw page not fetched"
    row = context.conn.execute(
        "SELECT * FROM cleaned_aircraft WHERE raw_page_id = ?", (raw_page.id,)
    ).fetchone()
    assert row is not None, "no cleaned_aircraft row"
