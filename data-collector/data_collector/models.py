"""Plain dataclasses shared across the fetch/filter/clean/export pipeline stages."""

from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class RawPage:
    """Verbatim Stage 1 output: no parsing/interpretation applied yet."""

    id: Optional[int]
    requested_title: str
    resolved_title: str
    wikitext: str
    categories: list[str]
    fetched_at: str  # ISO 8601 UTC timestamp
    image_base64: Optional[str] = None  # data:<mime>;base64,<...> or None if no image
    image_path: Optional[str] = None  # relative to frontend/public/data/, or None


@dataclass(frozen=True)
class FilterDecision:
    """Stage 2 output: a parseable-shape judgment, nothing else."""

    raw_page_id: int
    include: bool
    reason: Optional[str] = None  # None when include=True


@dataclass(frozen=True)
class AircraftIndexEntry:
    """One entry from Wikipedia's "List of aircraft" index pages -- a lightweight
    discovery record (title/manufacturer/section), not the full per-aircraft data the
    real pipeline fetches into RawPage."""

    aircraft_title: str
    display_text: str
    manufacturer: Optional[str]
    letter_section: Optional[str]
    source_index_page: str


@dataclass
class AircraftRecord:
    """Final shape written to airplanes.json, one entry per element in the JSON array."""

    id: str
    name: str
    weight: Optional[float]
    type: list[str]
    manufacturer: list[str]
    engineCount: Optional[int]
    wingPosition: Optional[str]
    landingGearType: Optional[str]
    speedRegime: Optional[str]
    maxSpeed: Optional[float]
    serviceCeiling: Optional[float]
    image: Optional[str] = None  # relative to frontend/public/data/, or None
