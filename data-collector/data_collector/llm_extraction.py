"""Stage 3 extraction, via an LLM instead of regex. The model reads a page's raw
wikitext + categories directly and returns already-normalized data -- no `|param=value`
parsing, no per-format table regex, no manual unit-plausibility correction. The
`AircraftExtraction` schema's field descriptions carry the domain rules that used to
live in code comments (MTOW priority, Mach never converted to km/h, etc.), since
they're what actually steers the model's output.

Unit conversion is deliberately NOT left to the model's own arithmetic -- LLMs are
unreliable calculators. Instead the model is given real conversion functions as tools
(reusing `unit_conversion.py`'s pure, already-tested math, unchanged) and instructed to
always call them rather than compute a conversion itself. Verified live: given "max
takeoff weight lb=2450", the model calls the `lb_to_kg` tool with `value=2450` and its
final answer is the tool's exact return value, not an approximation.

Takes a `langchain_core.language_models.BaseChatModel` as a parameter everywhere,
never a concrete provider class -- that's the whole dependency-injection story: any
LangChain chat model works here (Gemini today, trivially swappable later), and tests
inject a fake one instead of hitting a real API (see tests/test_llm_extraction.py),
the same way this codebase already fakes `requests.Session` for HTTP.
"""

import re
import time
from typing import Any, Callable, Literal, Optional

from google.genai.errors import APIError
from langchain.agents import create_agent
from langchain_core.language_models import BaseChatModel
from langchain_core.tools import tool
from pydantic import BaseModel, Field

from data_collector import unit_conversion

_MAX_RETRIES = 6
# Used only when Google's response doesn't say how long to wait (see
# _retry_delay_seconds) -- grows each attempt so a sustained outage backs off instead
# of hammering the API every 20s forever.
_FALLBACK_BACKOFF_SECONDS = 20.0
_RETRY_DELAY_PATTERN = re.compile(r"([\d.]+)\s*s")

_SYSTEM_PROMPT = """You extract structured aircraft data from a raw Wikipedia article's \
wikitext (markup, templates, categories) for an aircraft-guessing game's database. Read \
the wikitext directly -- it may use a classic `{{Aircraft specs}}` template, a \
multi-variant comparison wikitable, or something else entirely; extract whatever real \
data is actually present regardless of the source formatting.

Only report a value when the source text actually supports it. Never invent, estimate, \
or infer a plausible-sounding number -- leave a field null and list it in \
uncertain_fields instead of guessing. When a number could be read two ways (wrong unit, \
ambiguous variant, conflicting values across the page), pick your best reading but add \
the field name to uncertain_fields with a short reason in notes.

For ANY unit conversion (pounds to kilograms, feet to meters, mph or knots to km/h),
you MUST call the matching tool with the raw source number. Never compute a conversion
yourself, even a simple-looking one -- always use the tool and report its exact result."""


@tool
def lb_to_kg(value: float) -> float:
    """Convert a weight from pounds (lb) to kilograms (kg)."""
    return unit_conversion.lb_to_kg(value)


@tool
def ft_to_m(value: float) -> float:
    """Convert a length/altitude from feet (ft) to meters (m)."""
    return unit_conversion.ft_to_m(value)


@tool
def mph_to_kmh(value: float) -> float:
    """Convert a speed from miles per hour (mph) to kilometers per hour (km/h)."""
    return unit_conversion.mph_to_kmh(value)


@tool
def kts_to_kmh(value: float) -> float:
    """Convert a speed from knots (kts) to kilometers per hour (km/h)."""
    return unit_conversion.kts_to_kmh(value)


_CONVERSION_TOOLS = [lb_to_kg, ft_to_m, mph_to_kmh, kts_to_kmh]


class AircraftExtraction(BaseModel):
    name: str = Field(description="The aircraft's name/title.")
    is_single_aircraft: bool = Field(
        description="True only if this page is about one specific aircraft type with "
        "its own specifications. False for family/overview/list articles covering "
        "multiple variants with no single set of specs (e.g. 'Airbus A320 family')."
    )
    weight_kg: Optional[float] = Field(
        default=None,
        description="Maximum takeoff weight (MTOW) in kg, converting from lb if "
        "that's the only unit given. Fall back to gross weight, then empty weight, "
        "only if MTOW isn't available. null if no weight is usable.",
    )
    type: list[
        Literal["Comercial", "Militar", "Carga", "Executivo", "Geral/Utilitário", "Treinador"]
    ] = Field(
        default_factory=list,
        description="Zero or more categories that genuinely apply; empty list if none do.",
    )
    manufacturer: list[str] = Field(
        default_factory=list, description="One or more manufacturer names; empty if unknown."
    )
    engine_count: Optional[int] = Field(default=None, description="Total number of engines.")
    wing_position: Optional[Literal["Alta", "Média", "Baixa"]] = Field(
        default=None, description="null if genuinely unknown, not a guess."
    )
    landing_gear_type: Optional[Literal["Triciclo", "Convencional (bequilha)"]] = Field(
        default=None, description="null if genuinely unknown, not a guess."
    )
    speed_regime: Optional[Literal["subsonic", "supersonic"]] = Field(
        default=None,
        description="supersonic only if a Mach number >= 1.0 is stated for this aircraft.",
    )
    max_speed: Optional[float] = Field(
        default=None,
        description="If speed_regime is subsonic: max speed in km/h (convert from "
        "mph/kts if needed). If supersonic: the raw Mach number, NEVER converted to "
        "km/h (accurate Mach->km/h conversion needs altitude/temperature, which isn't "
        "reliably known here). null if unavailable.",
    )
    service_ceiling_m: Optional[float] = Field(
        default=None, description="Service ceiling in meters, converting from ft if needed."
    )
    uncertain_fields: list[str] = Field(
        default_factory=list,
        description="Names of fields above you weren't confident about (ambiguous "
        "source text, conflicting values, an implausible number, etc.) -- err on the "
        "side of flagging rather than guessing silently.",
    )
    notes: Optional[str] = Field(
        default=None, description="Why, for anything listed in uncertain_fields."
    )


def _as_api_error(error: BaseException) -> Optional[APIError]:
    if isinstance(error, APIError):
        return error
    if isinstance(error.__cause__, APIError):
        return error.__cause__
    return None


def _retry_delay_seconds(error: BaseException, attempt: int) -> Optional[float]:
    """None means "don't retry, this wasn't a 429". Google's 429 responses usually
    include a `google.rpc.RetryInfo` detail with the exact wait time it computed from
    your account's actual current usage against its actual current limit -- reusing
    that instead of guessing a fixed RPM/TPM number is both simpler and more accurate,
    since Google (unlike this code) actually knows both numbers."""
    api_error = _as_api_error(error)
    if api_error is None or api_error.code != 429:
        return None

    details = api_error.details if isinstance(api_error.details, dict) else {}
    for detail in details.get("error", {}).get("details", []):
        if not isinstance(detail, dict):
            continue
        if str(detail.get("@type", "")).endswith("RetryInfo"):
            match = _RETRY_DELAY_PATTERN.match(str(detail.get("retryDelay", "")))
            if match:
                return float(match.group(1))

    return _FALLBACK_BACKOFF_SECONDS * (attempt + 1)  # 429 but no explicit delay given


def _invoke_with_retry(
    agent: Any, payload: dict, on_retry: Optional[Callable[[str], None]] = None
) -> dict:
    for attempt in range(_MAX_RETRIES):
        try:
            return agent.invoke(payload)
        except Exception as error:
            delay = _retry_delay_seconds(error, attempt)
            if delay is None or attempt == _MAX_RETRIES - 1:
                raise
            if on_retry is not None:
                on_retry(
                    f"Rate limited (attempt {attempt + 1}/{_MAX_RETRIES}), "
                    f"waiting {delay:.0f}s before retrying..."
                )
            time.sleep(delay)
    raise AssertionError("unreachable")  # loop always returns or raises


def extract_aircraft(
    llm: BaseChatModel,
    wikitext: str,
    categories: list[str],
    on_retry: Optional[Callable[[str], None]] = None,
) -> AircraftExtraction:
    agent = create_agent(
        model=llm,
        tools=_CONVERSION_TOOLS,
        system_prompt=_SYSTEM_PROMPT,
        response_format=AircraftExtraction,
    )
    categories_text = "\n".join(categories) if categories else "(none)"
    result = _invoke_with_retry(
        agent,
        {
            "messages": [
                {
                    "role": "user",
                    "content": f"Categories:\n{categories_text}\n\nWikitext:\n{wikitext}",
                }
            ]
        },
        on_retry=on_retry,
    )
    structured = result["structured_response"]
    assert isinstance(structured, AircraftExtraction)
    return structured
