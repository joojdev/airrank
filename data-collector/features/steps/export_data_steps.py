import json
import re

from behave import given, when, then

from data_collector import storage
from data_collector.export import export_airplanes_json
from data_collector.models import RawPage, AircraftRecord


def _slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


@given('a cleaned_aircraft row for "{name}" with needs_review {value}')
def step_impl(context, name, value):
    if not hasattr(context, "conn"):
        context.conn = storage.get_connection(context.db_path)

    raw_page_id = storage.upsert_raw_page(
        context.conn,
        RawPage(None, name, name, "wikitext", [], "2026-08-08T00:00:00Z"),
    )
    record = AircraftRecord(
        id=_slugify(name),
        name=name,
        weight=1000.0,
        type=["Comercial"],
        manufacturer=["Test Manufacturer"],
        engineCount=2,
        wingPosition="Baixa",
        landingGearType="Triciclo",
        speedRegime="subsonic",
        maxSpeed=900.0,
        serviceCeiling=12000.0,
    )
    needs_review = value.strip().lower() == "true"
    storage.upsert_cleaned_aircraft(
        context.conn, raw_page_id, record, needs_review=needs_review, review_reasons=[]
    )


@when("the export step runs")
def step_impl(context):
    context.output_path = context.tmp_dir / "airplanes.json"
    export_airplanes_json(context.conn, context.output_path)
    context.exported_records = json.loads(context.output_path.read_text())


@then('the exported file contains a record with id "{aircraft_id}"')
def step_impl(context, aircraft_id):
    ids = [r["id"] for r in context.exported_records]
    assert aircraft_id in ids, ids


@then('the exported file does not contain a record for "{name}"')
def step_impl(context, name):
    names = [r["name"] for r in context.exported_records]
    assert name not in names, names


@then('every exported record\'s "type" field is a JSON array')
def step_impl(context):
    for record in context.exported_records:
        assert isinstance(record["type"], list)
