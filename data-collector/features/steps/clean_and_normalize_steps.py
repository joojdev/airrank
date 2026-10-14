import json
from pathlib import Path

from behave import given, when, then
from langchain_core.language_models.fake_chat_models import FakeMessagesListChatModel
from langchain_core.messages import AIMessage

from data_collector import storage, pipeline
from data_collector.llm_extraction import AircraftExtraction
from data_collector.models import RawPage, FilterDecision

FIXTURES = Path(__file__).resolve().parents[2] / "tests" / "fixtures"

FIXTURE_PREFIX_BY_TITLE = {
    "Cessna 172": "cessna_172",
    "F-16": "f16",
    "Airbus A320 family": "a320_family",
}

_LIST_FIELDS = {"type", "manufacturer", "uncertain_fields"}


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


def _parse_scalar(raw: str):
    if raw == "":
        return None
    if raw.lower() in ("true", "false"):
        return raw.lower() == "true"
    for cast in (int, float):
        try:
            return cast(raw)
        except ValueError:
            continue
    return raw


def _ensure_conn(context):
    if not hasattr(context, "conn"):
        context.conn = storage.get_connection(context.db_path)
    return context.conn


def _insert_included_raw_page(context, title, wikitext, categories):
    conn = _ensure_conn(context)
    raw_page_id = storage.upsert_raw_page(
        conn,
        RawPage(
            id=None,
            requested_title=title,
            resolved_title=title,
            wikitext=wikitext,
            categories=categories,
            fetched_at="2026-08-08T00:00:00Z",
        ),
    )
    storage.upsert_filter_decision(
        conn, FilterDecision(raw_page_id=raw_page_id, include=True, reason=None)
    )


@given('its fetched image_path is "{image_path}"')
def step_impl(context, image_path):
    conn = _ensure_conn(context)
    conn.execute(
        "UPDATE raw_pages SET image_path = ? WHERE id = (SELECT MAX(id) FROM raw_pages)",
        (image_path,),
    )
    conn.commit()


@given('an included raw_pages row for "{title}" loaded from its fixture')
def step_impl(context, title):
    prefix = FIXTURE_PREFIX_BY_TITLE[title]
    wikitext = (FIXTURES / f"{prefix}_wikitext.txt").read_text()
    categories = json.loads((FIXTURES / f"{prefix}_categories.json").read_text())
    _insert_included_raw_page(context, title, wikitext, categories)


@given('an included raw_pages row for "{title}" with wikitext:')
def step_impl(context, title):
    _insert_included_raw_page(context, title, context.text, [])


@given("the LLM extracts:")
def step_impl(context):
    fields = {}
    for row in context.table:
        name, value = row["field"], row["value"]
        if name in _LIST_FIELDS:
            fields[name] = [v.strip() for v in value.split(",")] if value else []
        else:
            fields[name] = _parse_scalar(value)
    fields.setdefault("is_single_aircraft", True)
    context.llm = _fake_llm_returning(AircraftExtraction(**fields))


@given("the LLM reports this is not a single aircraft")
def step_impl(context):
    context.llm = _fake_llm_returning(
        AircraftExtraction(name="unused", is_single_aircraft=False)
    )


@when("stage 3 cleans all included pages")
def step_impl(context):
    context.cleaned = pipeline.run_clean_stage(context.conn, context.llm)


def _cleaned_row(context, title):
    raw_page = storage.get_raw_page_by_resolved_title(context.conn, title)
    row = context.conn.execute(
        "SELECT * FROM cleaned_aircraft WHERE raw_page_id = ?", (raw_page.id,)
    ).fetchone()
    assert row is not None, f"no cleaned_aircraft row for {title}"
    return row


@then('no cleaned_aircraft row exists for "{title}"')
def step_impl(context, title):
    raw_page = storage.get_raw_page_by_resolved_title(context.conn, title)
    row = context.conn.execute(
        "SELECT * FROM cleaned_aircraft WHERE raw_page_id = ?", (raw_page.id,)
    ).fetchone()
    assert row is None, f"expected no cleaned_aircraft row for {title}, found one"


@then('the cleaned_aircraft row for "{title}" has manufacturer "{value}"')
def step_impl(context, title, value):
    row = _cleaned_row(context, title)
    assert value in json.loads(row["manufacturer_json"])


@then('the cleaned_aircraft row for "{title}" has image_path "{value}"')
def step_impl(context, title, value):
    row = _cleaned_row(context, title)
    assert row["image_path"] == value


@then('the cleaned_aircraft row for "{title}" has engine_count {value:d}')
def step_impl(context, title, value):
    row = _cleaned_row(context, title)
    assert row["engine_count"] == value


@then('the cleaned_aircraft row for "{title}" has wing_position "{value}"')
def step_impl(context, title, value):
    row = _cleaned_row(context, title)
    assert row["wing_position"] == value


@then('the cleaned_aircraft row for "{title}" has landing_gear_type "{value}"')
def step_impl(context, title, value):
    row = _cleaned_row(context, title)
    assert row["landing_gear_type"] == value


@then('the cleaned_aircraft row for "{title}" has speed_regime "{value}"')
def step_impl(context, title, value):
    row = _cleaned_row(context, title)
    assert row["speed_regime"] == value


@then('the cleaned_aircraft row for "{title}" has needs_review {value}')
def step_impl(context, title, value):
    row = _cleaned_row(context, title)
    expected = value.strip().lower() == "true"
    assert bool(row["needs_review"]) == expected


@then('the cleaned_aircraft row for "{title}" has service_ceiling_m approximately {value:g}')
def step_impl(context, title, value):
    row = _cleaned_row(context, title)
    assert abs(row["service_ceiling_m"] - value) < 1.0


@then('the cleaned_aircraft row for "{title}" has max_speed {value:g}')
def step_impl(context, title, value):
    row = _cleaned_row(context, title)
    assert abs(row["max_speed"] - value) < 0.01


@then('its review reasons mention "{text}"')
def step_impl(context, text):
    row = context.conn.execute(
        "SELECT review_reasons_json FROM cleaned_aircraft ORDER BY id DESC LIMIT 1"
    ).fetchone()
    reasons = json.loads(row[0])
    assert any(text in reason for reason in reasons), reasons
