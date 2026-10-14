"""Thin orchestration across the fetch/filter/clean/export stages. Each stage's real
logic lives in its own module (wikipedia_client, page_classifier, llm_extraction,
llm_provider, export); this module just wires them together against a shared
sqlite3.Connection."""

import re
from typing import Callable, Optional

from langchain_core.language_models import BaseChatModel

from data_collector import llm_extraction, storage
from data_collector.models import AircraftRecord


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def run_fetch_stage(
    titles: list[str], conn, session, force: bool = False, images_dir=None
) -> list[str]:
    from data_collector import wikipedia_client
    from data_collector.wikipedia_client import fetch_and_store_page

    if images_dir is None:
        images_dir = wikipedia_client.IMAGES_DIR

    missing_images = []
    for title in titles:
        raw_page = fetch_and_store_page(
            title, conn, session, force=force, images_dir=images_dir
        )
        if raw_page.image_path is None:
            missing_images.append(raw_page.resolved_title)
    return missing_images


def run_clean_stage(
    conn,
    llm: Optional[BaseChatModel] = None,
    on_progress: Optional[Callable[[int, int, str], None]] = None,
    on_retry: Optional[Callable[[str], None]] = None,
) -> list[AircraftRecord]:
    """`on_progress(index, total, title)`, called just before each page's LLM call --
    each call is a real network round-trip (roughly a second or more), so a caller
    running this over dozens of pages needs live per-page feedback or it looks hung.
    `on_retry(message)` fires from inside a single page's call when it hits a 429 and
    is waiting to retry -- without it, that wait looks identical to a hang too."""
    if llm is None:
        from data_collector.llm_provider import build_default_llm

        llm = build_default_llm()

    included_pages = storage.get_included_raw_pages(conn)
    records = []
    for index, raw_page in enumerate(included_pages, start=1):
        if on_progress is not None:
            on_progress(index, len(included_pages), raw_page.resolved_title)
        extraction = llm_extraction.extract_aircraft(
            llm, raw_page.wikitext, raw_page.categories, on_retry=on_retry
        )

        # is_single_aircraft=False doesn't discard the record -- verified live that a
        # page like "Boeing 777" (multiple variants, no single canonical spec set)
        # still yields real, usable data (weight, type, manufacturer, ...); throwing
        # that away would defeat the whole point of moving off the old regex/wikitable
        # approach that already couldn't handle these pages. Instead it's one more
        # needs_review signal, same as uncertain_fields -- nothing ships to export
        # without a human look, but nothing is silently discarded either.
        review_reasons = list(extraction.uncertain_fields)
        if extraction.notes:
            review_reasons.append(extraction.notes)
        if not extraction.is_single_aircraft:
            review_reasons.append(
                "not clearly a single, well-specified aircraft (LLM judgment)"
            )

        record = AircraftRecord(
            id=slugify(extraction.name),
            name=extraction.name,
            weight=extraction.weight_kg,
            type=extraction.type,
            manufacturer=extraction.manufacturer,
            engineCount=extraction.engine_count,
            wingPosition=extraction.wing_position,
            landingGearType=extraction.landing_gear_type,
            speedRegime=extraction.speed_regime,
            maxSpeed=extraction.max_speed,
            serviceCeiling=extraction.service_ceiling_m,
            image=raw_page.image_path,
        )
        storage.upsert_cleaned_aircraft(
            conn,
            raw_page.id,
            record,
            needs_review=bool(review_reasons),
            review_reasons=review_reasons,
        )
        records.append(record)
    return records
