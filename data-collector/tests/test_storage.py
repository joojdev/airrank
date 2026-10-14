from data_collector import storage
from data_collector.models import RawPage, FilterDecision, AircraftRecord


def test_get_connection_creates_tables_idempotently(tmp_path):
    db_path = tmp_path / "pipeline.sqlite3"
    conn1 = storage.get_connection(db_path)
    conn1.close()
    # Second call on the same path must not raise (CREATE TABLE IF NOT EXISTS).
    conn2 = storage.get_connection(db_path)
    tables = {
        row[0]
        for row in conn2.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ).fetchall()
    }
    conn2.close()
    assert {"raw_pages", "filtered_pages", "cleaned_aircraft"} <= tables


def test_upsert_and_fetch_raw_page_round_trips(tmp_path):
    conn = storage.get_connection(tmp_path / "pipeline.sqlite3")
    raw_page = RawPage(
        id=None,
        requested_title="Cessna 172",
        resolved_title="Cessna 172",
        wikitext="{{Infobox aircraft}}",
        categories=["Category:High-wing aircraft"],
        fetched_at="2026-08-08T00:00:00Z",
    )
    raw_page_id = storage.upsert_raw_page(conn, raw_page)
    assert raw_page_id is not None

    fetched = storage.get_raw_page_by_resolved_title(conn, "Cessna 172")
    assert fetched is not None
    assert fetched.id == raw_page_id
    assert fetched.wikitext == "{{Infobox aircraft}}"
    assert fetched.categories == ["Category:High-wing aircraft"]


def test_upsert_raw_page_is_idempotent_on_resolved_title(tmp_path):
    conn = storage.get_connection(tmp_path / "pipeline.sqlite3")
    raw_page = RawPage(
        id=None,
        requested_title="Cessna 172",
        resolved_title="Cessna 172",
        wikitext="first fetch",
        categories=[],
        fetched_at="2026-08-08T00:00:00Z",
    )
    first_id = storage.upsert_raw_page(conn, raw_page)
    refetched = RawPage(
        id=None,
        requested_title="Cessna 172",
        resolved_title="Cessna 172",
        wikitext="second fetch (refreshed)",
        categories=[],
        fetched_at="2026-08-08T01:00:00Z",
    )
    second_id = storage.upsert_raw_page(conn, refetched)
    assert first_id == second_id
    assert storage.get_raw_page_by_resolved_title(conn, "Cessna 172").wikitext == (
        "second fetch (refreshed)"
    )


def test_filter_decision_round_trips_and_get_included_raw_pages(tmp_path):
    conn = storage.get_connection(tmp_path / "pipeline.sqlite3")
    included_id = storage.upsert_raw_page(
        conn,
        RawPage(None, "Cessna 172", "Cessna 172", "wikitext", [], "2026-08-08T00:00:00Z"),
    )
    excluded_id = storage.upsert_raw_page(
        conn,
        RawPage(None, "A320 family", "A320 family", "wikitext", [], "2026-08-08T00:00:00Z"),
    )
    storage.upsert_filter_decision(
        conn, FilterDecision(raw_page_id=included_id, include=True, reason=None)
    )
    storage.upsert_filter_decision(
        conn,
        FilterDecision(
            raw_page_id=excluded_id, include=False, reason="no parseable specs block"
        ),
    )

    included_pages = storage.get_included_raw_pages(conn)
    assert [p.resolved_title for p in included_pages] == ["Cessna 172"]


def test_cleaned_aircraft_round_trip_and_export_filtering(tmp_path):
    conn = storage.get_connection(tmp_path / "pipeline.sqlite3")
    raw_page_id = storage.upsert_raw_page(
        conn,
        RawPage(None, "Cessna 172", "Cessna 172", "wikitext", [], "2026-08-08T00:00:00Z"),
    )
    clean_record = AircraftRecord(
        id="cessna-172",
        name="Cessna 172",
        weight=1111.3,
        type=["Geral/Utilitário"],
        manufacturer=["Cessna"],
        engineCount=1,
        wingPosition="Alta",
        landingGearType="Triciclo",
        speedRegime="subsonic",
        maxSpeed=225.9,
        serviceCeiling=4114.8,
    )
    storage.upsert_cleaned_aircraft(
        conn, raw_page_id, clean_record, needs_review=False, review_reasons=[]
    )

    review_raw_page_id = storage.upsert_raw_page(
        conn,
        RawPage(None, "Needs Review Plane", "Needs Review Plane", "wikitext", [], "2026-08-08T00:00:00Z"),
    )
    flagged_record = AircraftRecord(
        id="needs-review-plane",
        name="Needs Review Plane",
        weight=None,
        type=[],
        manufacturer=[],
        engineCount=None,
        wingPosition=None,
        landingGearType=None,
        speedRegime=None,
        maxSpeed=None,
        serviceCeiling=4100.0,
    )
    storage.upsert_cleaned_aircraft(
        conn,
        review_raw_page_id,
        flagged_record,
        needs_review=True,
        review_reasons=["ceiling: corrected ft->m"],
    )

    exportable = storage.list_exportable_cleaned_aircraft(conn)
    assert [r.id for r in exportable] == ["cessna-172"]

    everything = storage.list_exportable_cleaned_aircraft(conn, include_needs_review=True)
    assert {r.id for r in everything} == {"cessna-172", "needs-review-plane"}
