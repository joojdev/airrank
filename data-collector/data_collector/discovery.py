"""Discovery layer for the aircraft-selection TUI: builds a searchable index from
Wikipedia's editorially-maintained "List of aircraft" pages (NOT Wikipedia categories,
which live research showed are too noisy -- dominated by concept articles and obscure
one-offs rather than real, notable aircraft), and manages targets.txt.

Plain functions only, no Textual import anywhere in this module -- see tui/app.py for
the widget wiring that calls into this.
"""

import re
from pathlib import Path
from typing import Optional

from langchain_core.language_models import BaseChatModel

from data_collector import llm_extraction, storage, wikipedia_client
from data_collector.models import AircraftIndexEntry

_REF_TAG = re.compile(r"<ref\b[^>]*/>|<ref\b[^>]*>.*?</ref>", re.DOTALL | re.IGNORECASE)
_MANUFACTURER_HEADING = re.compile(r"^===([^=].*?)===\s*$")
_LETTER_HEADING = re.compile(r"^==([^=].*?)==\s*$")
_BULLET_LINK = re.compile(r"^\*\s*\[\[([^|\]]+)(?:\|([^\]]+))?\]\]")
_WIKILINK_ONLY = re.compile(r"^\[\[([^|\]]+)(?:\|[^\]]+)?\]\]$")

_INDEX_CATEGORY = "Category:Lists of aircraft"


def fetch_index_page_titles(session) -> list[str]:
    response = session.get(
        wikipedia_client.API_URL,
        params={
            "action": "query",
            "list": "categorymembers",
            "cmtitle": _INDEX_CATEGORY,
            "cmlimit": 500,
            "format": "json",
        },
        timeout=30,
    )
    members = response.json()["query"]["categorymembers"]
    return [member["title"] for member in members]


def parse_index_page(wikitext: str, source_index_page: str) -> list[AircraftIndexEntry]:
    wikitext = _REF_TAG.sub("", wikitext)
    entries: list[AircraftIndexEntry] = []
    current_letter = None
    current_manufacturer = None

    for raw_line in wikitext.splitlines():
        line = raw_line.strip()

        manufacturer_match = _MANUFACTURER_HEADING.match(line)
        if manufacturer_match:
            heading_text = manufacturer_match.group(1).strip()
            wikilink_match = _WIKILINK_ONLY.match(heading_text)
            current_manufacturer = (
                wikilink_match.group(1) if wikilink_match else heading_text
            )
            continue

        letter_match = _LETTER_HEADING.match(line)
        if letter_match:
            current_letter = letter_match.group(1).strip()
            current_manufacturer = None
            continue

        bullet_match = _BULLET_LINK.match(line)
        if bullet_match and current_manufacturer is not None:
            title = bullet_match.group(1).strip()
            display = (bullet_match.group(2) or title).strip()
            entries.append(
                AircraftIndexEntry(
                    aircraft_title=title,
                    display_text=display,
                    manufacturer=current_manufacturer,
                    letter_section=current_letter,
                    source_index_page=source_index_page,
                )
            )

    return entries


def build_aircraft_index(conn, session) -> int:
    index_titles = fetch_index_page_titles(session)
    all_entries: list[AircraftIndexEntry] = []
    for title in index_titles:
        _, wikitext = wikipedia_client.fetch_page_wikitext(title, session)
        all_entries.extend(parse_index_page(wikitext, title))
    storage.replace_aircraft_index(conn, all_entries)
    return len(all_entries)


def search_index(
    conn, query: str, limit: int = 200, offset: int = 0
) -> list[AircraftIndexEntry]:
    return storage.search_aircraft_index(conn, query, limit=limit, offset=offset)


def classify_candidate(
    title: str, conn, session, llm: Optional[BaseChatModel] = None
) -> list[str]:
    """Lazy, cached hint only -- never writes raw_pages/cleaned_aircraft. The real
    pipeline's clean stage re-derives type authoritatively from the actual
    fetched-and-included page; this is purely for the TUI to show a quick guess.

    Index entries can be red links (bulleted on a "List of aircraft" page but never
    given their own article) -- fetch failure there is expected, not exceptional, so
    it's cached as "no type known" the same as a page that fetched fine but didn't
    match any known type keywords, rather than raised up to the caller."""
    cached = storage.get_cached_type(conn, title)
    if cached is not None:
        return cached

    try:
        _, wikitext = wikipedia_client.fetch_page_wikitext(title, session)
    except wikipedia_client.PageNotFoundError:
        storage.upsert_cached_type(conn, title, [])
        return []

    if llm is None:
        from data_collector.llm_provider import build_default_llm

        llm = build_default_llm()

    extraction = llm_extraction.extract_aircraft(llm, wikitext, categories=[])
    storage.upsert_cached_type(conn, title, extraction.type)
    return extraction.type


def load_targets(targets_path: Path) -> list[str]:
    if not targets_path.exists():
        return []
    lines = targets_path.read_text().splitlines()
    return [
        line.strip()
        for line in lines
        if line.strip() and not line.strip().startswith("#")
    ]


def append_targets(targets_path: Path, titles: list[str]) -> list[str]:
    """Appends titles not already present (exact string match). Returns the titles
    actually appended. Does a full read before a single append-write rather than
    reformatting the file, so existing comments/ordering survive untouched."""
    existing = set(load_targets(targets_path))
    to_append = [title for title in titles if title not in existing]
    if to_append:
        with targets_path.open("a") as handle:
            for title in to_append:
                handle.write(f"{title}\n")
    return to_append
