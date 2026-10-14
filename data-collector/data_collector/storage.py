"""SQLite-backed working store for the fetch/filter/clean pipeline. This is local,
disposable, git-ignored state -- NOT the committed game data (that's
frontend/public/data/airplanes.json, written by export.py). Three tables, one per
stage, so each stage's expensive/cheap-to-recompute data stays independently
inspectable and re-runnable without touching the others."""

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from data_collector.models import (
    AircraftIndexEntry,
    AircraftRecord,
    FilterDecision,
    RawPage,
)

DEFAULT_DB_PATH = Path(__file__).resolve().parents[1] / ".data" / "pipeline.sqlite3"

_SCHEMA = """
CREATE TABLE IF NOT EXISTS raw_pages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    requested_title TEXT NOT NULL,
    resolved_title  TEXT NOT NULL,
    wikitext        TEXT NOT NULL,
    categories_json TEXT NOT NULL,
    fetched_at      TEXT NOT NULL,
    image_base64    TEXT,
    image_path      TEXT,
    UNIQUE (resolved_title)
);

CREATE TABLE IF NOT EXISTS filtered_pages (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    raw_page_id    INTEGER NOT NULL REFERENCES raw_pages(id),
    include        INTEGER NOT NULL CHECK (include IN (0, 1)),
    reason         TEXT,
    classified_at  TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (raw_page_id)
);

CREATE TABLE IF NOT EXISTS cleaned_aircraft (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    raw_page_id          INTEGER NOT NULL REFERENCES raw_pages(id),
    aircraft_id          TEXT NOT NULL,
    name                 TEXT NOT NULL,
    weight_kg            REAL,
    weight_source_field  TEXT,
    type_json            TEXT NOT NULL DEFAULT '[]',
    manufacturer_json    TEXT NOT NULL DEFAULT '[]',
    engine_count         INTEGER,
    wing_position        TEXT,
    landing_gear_type    TEXT,
    speed_regime         TEXT CHECK (speed_regime IN ('subsonic', 'supersonic') OR speed_regime IS NULL),
    max_speed            REAL,
    service_ceiling_m    REAL,
    image_path           TEXT,
    needs_review         INTEGER NOT NULL DEFAULT 0 CHECK (needs_review IN (0, 1)),
    review_reasons_json  TEXT NOT NULL DEFAULT '[]',
    cleaned_at           TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (raw_page_id)
);

CREATE TABLE IF NOT EXISTS aircraft_index (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    aircraft_title      TEXT NOT NULL,
    display_text        TEXT NOT NULL,
    manufacturer        TEXT,
    letter_section      TEXT,
    source_index_page   TEXT NOT NULL,
    indexed_at          TEXT NOT NULL,
    UNIQUE (aircraft_title, source_index_page)
);

CREATE TABLE IF NOT EXISTS aircraft_index_type_cache (
    aircraft_title  TEXT PRIMARY KEY,
    type_json       TEXT NOT NULL,
    classified_at   TEXT NOT NULL
);
"""


def get_connection(db_path: Path = DEFAULT_DB_PATH) -> sqlite3.Connection:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.executescript(_SCHEMA)
    conn.commit()
    return conn


def _row_to_raw_page(row: sqlite3.Row) -> RawPage:
    return RawPage(
        id=row["id"],
        requested_title=row["requested_title"],
        resolved_title=row["resolved_title"],
        wikitext=row["wikitext"],
        categories=json.loads(row["categories_json"]),
        fetched_at=row["fetched_at"],
        image_base64=row["image_base64"],
        image_path=row["image_path"],
    )


def upsert_raw_page(conn: sqlite3.Connection, raw_page: RawPage) -> int:
    existing = conn.execute(
        "SELECT id FROM raw_pages WHERE resolved_title = ?",
        (raw_page.resolved_title,),
    ).fetchone()
    categories_json = json.dumps(raw_page.categories)
    if existing:
        conn.execute(
            """UPDATE raw_pages
               SET requested_title = ?, wikitext = ?, categories_json = ?, fetched_at = ?,
                   image_base64 = ?, image_path = ?
               WHERE id = ?""",
            (
                raw_page.requested_title,
                raw_page.wikitext,
                categories_json,
                raw_page.fetched_at,
                raw_page.image_base64,
                raw_page.image_path,
                existing["id"],
            ),
        )
        conn.commit()
        return existing["id"]

    cursor = conn.execute(
        """INSERT INTO raw_pages
           (requested_title, resolved_title, wikitext, categories_json, fetched_at,
            image_base64, image_path)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (
            raw_page.requested_title,
            raw_page.resolved_title,
            raw_page.wikitext,
            categories_json,
            raw_page.fetched_at,
            raw_page.image_base64,
            raw_page.image_path,
        ),
    )
    conn.commit()
    return cursor.lastrowid


def get_raw_page_by_resolved_title(
    conn: sqlite3.Connection, resolved_title: str
) -> Optional[RawPage]:
    row = conn.execute(
        "SELECT * FROM raw_pages WHERE resolved_title = ?", (resolved_title,)
    ).fetchone()
    return _row_to_raw_page(row) if row else None


def list_raw_pages(conn: sqlite3.Connection) -> list[RawPage]:
    rows = conn.execute("SELECT * FROM raw_pages").fetchall()
    return [_row_to_raw_page(row) for row in rows]


def upsert_filter_decision(conn: sqlite3.Connection, decision: FilterDecision) -> None:
    existing = conn.execute(
        "SELECT id FROM filtered_pages WHERE raw_page_id = ?", (decision.raw_page_id,)
    ).fetchone()
    if existing:
        conn.execute(
            """UPDATE filtered_pages
               SET include = ?, reason = ?, classified_at = datetime('now')
               WHERE raw_page_id = ?""",
            (int(decision.include), decision.reason, decision.raw_page_id),
        )
    else:
        conn.execute(
            """INSERT INTO filtered_pages (raw_page_id, include, reason)
               VALUES (?, ?, ?)""",
            (decision.raw_page_id, int(decision.include), decision.reason),
        )
    conn.commit()


def get_included_raw_pages(conn: sqlite3.Connection) -> list[RawPage]:
    rows = conn.execute(
        """SELECT raw_pages.* FROM raw_pages
           JOIN filtered_pages ON filtered_pages.raw_page_id = raw_pages.id
           WHERE filtered_pages.include = 1"""
    ).fetchall()
    return [_row_to_raw_page(row) for row in rows]


def upsert_cleaned_aircraft(
    conn: sqlite3.Connection,
    raw_page_id: int,
    record: AircraftRecord,
    needs_review: bool,
    review_reasons: list[str],
) -> None:
    params = (
        record.id,
        record.name,
        record.weight,
        None,  # weight_source_field: not tracked on AircraftRecord itself
        json.dumps(record.type),
        json.dumps(record.manufacturer),
        record.engineCount,
        record.wingPosition,
        record.landingGearType,
        record.speedRegime,
        record.maxSpeed,
        record.serviceCeiling,
        record.image,
        int(needs_review),
        json.dumps(review_reasons),
        raw_page_id,
    )
    existing = conn.execute(
        "SELECT id FROM cleaned_aircraft WHERE raw_page_id = ?", (raw_page_id,)
    ).fetchone()
    if existing:
        conn.execute(
            """UPDATE cleaned_aircraft
               SET aircraft_id = ?, name = ?, weight_kg = ?, weight_source_field = ?,
                   type_json = ?, manufacturer_json = ?, engine_count = ?, wing_position = ?,
                   landing_gear_type = ?, speed_regime = ?, max_speed = ?,
                   service_ceiling_m = ?, image_path = ?, needs_review = ?,
                   review_reasons_json = ?, cleaned_at = datetime('now')
               WHERE raw_page_id = ?""",
            params,
        )
    else:
        conn.execute(
            """INSERT INTO cleaned_aircraft
               (aircraft_id, name, weight_kg, weight_source_field, type_json,
                manufacturer_json, engine_count, wing_position, landing_gear_type,
                speed_regime, max_speed, service_ceiling_m, image_path, needs_review,
                review_reasons_json, raw_page_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            params,
        )
    conn.commit()


def _row_to_aircraft_record(row: sqlite3.Row) -> AircraftRecord:
    return AircraftRecord(
        id=row["aircraft_id"],
        name=row["name"],
        weight=row["weight_kg"],
        type=json.loads(row["type_json"]),
        manufacturer=json.loads(row["manufacturer_json"]),
        engineCount=row["engine_count"],
        wingPosition=row["wing_position"],
        landingGearType=row["landing_gear_type"],
        speedRegime=row["speed_regime"],
        maxSpeed=row["max_speed"],
        serviceCeiling=row["service_ceiling_m"],
        image=row["image_path"],
    )


def list_exportable_cleaned_aircraft(
    conn: sqlite3.Connection, include_needs_review: bool = False
) -> list[AircraftRecord]:
    if include_needs_review:
        rows = conn.execute("SELECT * FROM cleaned_aircraft").fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM cleaned_aircraft WHERE needs_review = 0"
        ).fetchall()
    return [_row_to_aircraft_record(row) for row in rows]


def _row_to_aircraft_index_entry(row: sqlite3.Row) -> AircraftIndexEntry:
    return AircraftIndexEntry(
        aircraft_title=row["aircraft_title"],
        display_text=row["display_text"],
        manufacturer=row["manufacturer"],
        letter_section=row["letter_section"],
        source_index_page=row["source_index_page"],
    )


def replace_aircraft_index(
    conn: sqlite3.Connection, entries: list[AircraftIndexEntry]
) -> None:
    """Wholesale-rebuild the discovery index in one transaction. Cheap to redo from
    scratch (~30 Wikipedia pages), unlike raw_pages, so no per-row diffing is needed."""
    now = datetime.now(timezone.utc).isoformat()
    conn.execute("DELETE FROM aircraft_index")
    conn.executemany(
        """INSERT OR IGNORE INTO aircraft_index
           (aircraft_title, display_text, manufacturer, letter_section,
            source_index_page, indexed_at)
           VALUES (?, ?, ?, ?, ?, ?)""",
        [
            (
                entry.aircraft_title,
                entry.display_text,
                entry.manufacturer,
                entry.letter_section,
                entry.source_index_page,
                now,
            )
            for entry in entries
        ],
    )
    conn.commit()


def search_aircraft_index(
    conn: sqlite3.Connection, query: str, limit: int = 200, offset: int = 0
) -> list[AircraftIndexEntry]:
    """Always paginated (LIMIT/OFFSET) -- the caller (the TUI) fetches one page at a
    time, even for the empty/no-query browse view, instead of pulling the whole index
    into memory and the widget at once. `ORDER BY aircraft_title` is unique per
    GROUP BY row here, so offsets stay stable across successive calls for the same
    query."""
    like = f"%{query}%"
    sql = """SELECT aircraft_title, display_text, manufacturer, letter_section,
                    source_index_page
             FROM aircraft_index
             WHERE aircraft_title LIKE ? OR display_text LIKE ? OR manufacturer LIKE ?
             GROUP BY aircraft_title
             ORDER BY aircraft_title
             LIMIT ? OFFSET ?"""
    rows = conn.execute(sql, (like, like, like, limit, offset)).fetchall()
    return [_row_to_aircraft_index_entry(row) for row in rows]


def get_aircraft_index_count(conn: sqlite3.Connection) -> int:
    row = conn.execute("SELECT COUNT(*) AS n FROM aircraft_index").fetchone()
    return row["n"]


def get_aircraft_index_built_at(conn: sqlite3.Connection) -> Optional[str]:
    row = conn.execute(
        "SELECT MAX(indexed_at) AS built_at FROM aircraft_index"
    ).fetchone()
    return row["built_at"] if row else None


def get_cached_type(
    conn: sqlite3.Connection, aircraft_title: str
) -> Optional[list[str]]:
    row = conn.execute(
        "SELECT type_json FROM aircraft_index_type_cache WHERE aircraft_title = ?",
        (aircraft_title,),
    ).fetchone()
    return json.loads(row["type_json"]) if row else None


def upsert_cached_type(
    conn: sqlite3.Connection, aircraft_title: str, types: list[str]
) -> None:
    now = datetime.now(timezone.utc).isoformat()
    existing = conn.execute(
        "SELECT aircraft_title FROM aircraft_index_type_cache WHERE aircraft_title = ?",
        (aircraft_title,),
    ).fetchone()
    if existing:
        conn.execute(
            """UPDATE aircraft_index_type_cache
               SET type_json = ?, classified_at = ?
               WHERE aircraft_title = ?""",
            (json.dumps(types), now, aircraft_title),
        )
    else:
        conn.execute(
            """INSERT INTO aircraft_index_type_cache (aircraft_title, type_json, classified_at)
               VALUES (?, ?, ?)""",
            (aircraft_title, json.dumps(types), now),
        )
    conn.commit()
