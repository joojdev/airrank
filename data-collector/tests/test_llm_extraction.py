import pytest
from google.genai.errors import APIError
from langchain_core.messages import AIMessage
from langchain_core.language_models.fake_chat_models import FakeMessagesListChatModel

from data_collector import llm_extraction
from data_collector.llm_extraction import (
    AircraftExtraction,
    extract_aircraft,
    ft_to_m,
    kts_to_kmh,
    lb_to_kg,
    mph_to_kmh,
)


def _rate_limit_error(retry_delay: str = None) -> APIError:
    error_body = {"error": {"code": 429, "message": "quota exceeded", "status": "RESOURCE_EXHAUSTED"}}
    if retry_delay is not None:
        error_body["error"]["details"] = [
            {"@type": "type.googleapis.com/google.rpc.RetryInfo", "retryDelay": retry_delay}
        ]
    return APIError(429, error_body)


class FakeToolCallingChatModel(FakeMessagesListChatModel):
    """FakeMessagesListChatModel doesn't implement bind_tools (BaseChatModel leaves
    it abstract for real providers to fill in) -- create_agent calls it while
    building its graph regardless of whether the fake actually needs real
    tool-calling, so this override just has to not raise. The scripted responses in
    `responses` are what actually drive behavior in these tests."""

    def bind_tools(self, tools, **kwargs):
        return self


def _fake_llm_returning(extraction: AircraftExtraction) -> FakeToolCallingChatModel:
    """A fake whose single scripted response is a tool call to the structured-output
    schema itself -- create_agent's synthetic "return AircraftExtraction" tool,
    verified against the real API to be named after the Pydantic model class."""
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
    return FakeToolCallingChatModel(responses=[response])


def test_extract_aircraft_returns_the_structured_response():
    expected = AircraftExtraction(
        name="Cessna 172",
        is_single_aircraft=True,
        weight_kg=1111.3,
        type=["Geral/Utilitário"],
        manufacturer=["Cessna"],
        engine_count=1,
        wing_position="Alta",
        landing_gear_type="Triciclo",
        speed_regime="subsonic",
        max_speed=226.0,
        service_ceiling_m=4114.8,
        uncertain_fields=[],
        notes=None,
    )
    llm = _fake_llm_returning(expected)

    result = extract_aircraft(llm, "{{Infobox aircraft | name = Cessna 172}}", [])

    assert result == expected


def test_extract_aircraft_passes_through_uncertain_fields_and_notes():
    expected = AircraftExtraction(
        name="Some Aircraft",
        is_single_aircraft=True,
        uncertain_fields=["max_speed"],
        notes="Only cruise speed is stated, not max speed.",
    )
    llm = _fake_llm_returning(expected)

    result = extract_aircraft(llm, "irrelevant wikitext", [])

    assert result.uncertain_fields == ["max_speed"]
    assert result.notes == "Only cruise speed is stated, not max speed."


def test_extract_aircraft_can_report_not_a_single_aircraft():
    expected = AircraftExtraction(name="Airbus A320 family", is_single_aircraft=False)
    llm = _fake_llm_returning(expected)

    result = extract_aircraft(llm, "irrelevant wikitext", [])

    assert result.is_single_aircraft is False


def test_conversion_tools_wrap_unit_conversion_correctly():
    """The tools the model is given must do exact arithmetic (see the module
    docstring for why) -- these call the same tested unit_conversion.py functions,
    just wrapped as LangChain tools, so the wrapping itself doesn't break the math."""
    assert lb_to_kg.invoke({"value": 2450.0}) == pytest.approx(1111.301, abs=0.01)
    assert ft_to_m.invoke({"value": 13500.0}) == pytest.approx(4114.8, abs=0.1)
    assert mph_to_kmh.invoke({"value": 100.0}) == pytest.approx(160.934, abs=0.01)
    assert kts_to_kmh.invoke({"value": 100.0}) == pytest.approx(185.2, abs=0.01)


def test_retry_delay_seconds_reads_googles_own_retry_info():
    error = _rate_limit_error(retry_delay="31s")
    assert llm_extraction._retry_delay_seconds(error, attempt=0) == pytest.approx(31.0)


def test_retry_delay_seconds_falls_back_when_429_has_no_retry_info():
    error = _rate_limit_error(retry_delay=None)
    assert llm_extraction._retry_delay_seconds(error, attempt=0) == pytest.approx(
        llm_extraction._FALLBACK_BACKOFF_SECONDS
    )
    # Grows with each attempt so a sustained outage backs off further, not forever
    # at the same interval.
    assert llm_extraction._retry_delay_seconds(
        error, attempt=2
    ) > llm_extraction._retry_delay_seconds(error, attempt=0)


def test_retry_delay_seconds_none_for_non_429_errors():
    assert llm_extraction._retry_delay_seconds(ValueError("boom"), attempt=0) is None


class _FakeAgent:
    """Scripted `.invoke()` -- raises the given errors in order, then returns
    `final_result` -- used to test _invoke_with_retry's loop without a real agent."""

    def __init__(self, errors, final_result):
        self._errors = list(errors)
        self.final_result = final_result
        self.call_count = 0

    def invoke(self, payload):
        self.call_count += 1
        if self._errors:
            raise self._errors.pop(0)
        return self.final_result


def test_invoke_with_retry_retries_on_429_then_succeeds(monkeypatch):
    monkeypatch.setattr(llm_extraction.time, "sleep", lambda seconds: None)
    agent = _FakeAgent(
        errors=[_rate_limit_error("1s"), _rate_limit_error("1s")],
        final_result={"structured_response": "ok"},
    )

    result = llm_extraction._invoke_with_retry(agent, {})

    assert result == {"structured_response": "ok"}
    assert agent.call_count == 3


def test_invoke_with_retry_reraises_non_429_immediately(monkeypatch):
    slept = []
    monkeypatch.setattr(llm_extraction.time, "sleep", lambda seconds: slept.append(seconds))
    agent = _FakeAgent(errors=[ValueError("not a rate limit")], final_result={})

    with pytest.raises(ValueError):
        llm_extraction._invoke_with_retry(agent, {})

    assert agent.call_count == 1
    assert slept == []  # never waited -- a non-429 error isn't retryable


def test_invoke_with_retry_gives_up_after_max_retries(monkeypatch):
    monkeypatch.setattr(llm_extraction.time, "sleep", lambda seconds: None)
    agent = _FakeAgent(
        errors=[_rate_limit_error("1s") for _ in range(llm_extraction._MAX_RETRIES)],
        final_result={},
    )

    with pytest.raises(APIError):
        llm_extraction._invoke_with_retry(agent, {})

    assert agent.call_count == llm_extraction._MAX_RETRIES
