import json
from pathlib import Path

from behave import given, when, then

from data_collector import storage
from data_collector.models import RawPage
from data_collector.page_classifier import run_filter_stage

FIXTURES = Path(__file__).resolve().parents[2] / "tests" / "fixtures"

FIXTURE_PREFIX_BY_TITLE = {
    "Cessna 172": "cessna_172",
    "Airbus A320 family": "a320_family",
}


@given('a raw_pages row for "{title}" loaded from its fixture')
def step_impl(context, title):
    prefix = FIXTURE_PREFIX_BY_TITLE[title]
    wikitext = (FIXTURES / f"{prefix}_wikitext.txt").read_text()
    categories = json.loads((FIXTURES / f"{prefix}_categories.json").read_text())

    if not hasattr(context, "conn"):
        context.conn = storage.get_connection(context.db_path)

    storage.upsert_raw_page(
        context.conn,
        RawPage(
            id=None,
            requested_title=title,
            resolved_title=title,
            wikitext=wikitext,
            categories=categories,
            fetched_at="2026-08-08T00:00:00Z",
        ),
    )


@given('a raw_pages row for "{title}" with wikitext:')
def step_impl(context, title):
    if not hasattr(context, "conn"):
        context.conn = storage.get_connection(context.db_path)
    storage.upsert_raw_page(
        context.conn,
        RawPage(
            id=None,
            requested_title=title,
            resolved_title=title,
            wikitext=context.text,
            categories=[],
            fetched_at="2026-08-08T00:00:00Z",
        ),
    )


@when("stage 2 classifies all raw pages")
def step_impl(context):
    context.filter_decisions = run_filter_stage(context.conn)


@then("the filtered_pages row for \"{title}\" has include {expected}")
def step_impl(context, title, expected):
    raw_page = storage.get_raw_page_by_resolved_title(context.conn, title)
    row = context.conn.execute(
        "SELECT include, reason FROM filtered_pages WHERE raw_page_id = ?",
        (raw_page.id,),
    ).fetchone()
    assert row is not None, f"no filtered_pages row for {title}"
    expected_bool = expected.strip().lower() == "true"
    assert bool(row[0]) == expected_bool
    context.last_reason = row[1]


@then('its reason mentions "{text}"')
def step_impl(context, text):
    assert context.last_reason is not None
    assert text in context.last_reason
