import json

from data_collector import storage
from data_collector.export import export_airplanes_json
from data_collector.models import RawPage, AircraftRecord


def _seed(conn, aircraft_id, needs_review, image=None):
    raw_page_id = storage.upsert_raw_page(
        conn,
        RawPage(None, aircraft_id, aircraft_id, "wikitext", [], "2026-08-08T00:00:00Z"),
    )
    record = AircraftRecord(
        id=aircraft_id,
        name=aircraft_id,
        weight=1000.0,
        type=["Comercial"],
        manufacturer=["Test Manufacturer"],
        engineCount=2,
        wingPosition="Baixa",
        landingGearType="Triciclo",
        speedRegime="subsonic",
        maxSpeed=900.0,
        serviceCeiling=12000.0,
        image=image,
    )
    storage.upsert_cleaned_aircraft(
        conn, raw_page_id, record, needs_review=needs_review, review_reasons=[]
    )


def test_export_writes_only_non_blocking_records(tmp_path):
    conn = storage.get_connection(tmp_path / "pipeline.sqlite3")
    _seed(conn, "good-plane", needs_review=False)
    _seed(conn, "flagged-plane", needs_review=True)

    output_path = tmp_path / "data" / "airplanes.json"
    result_path = export_airplanes_json(conn, output_path)

    assert result_path == output_path
    records = json.loads(output_path.read_text())
    assert [r["id"] for r in records] == ["good-plane"]


def test_export_creates_missing_parent_directories(tmp_path):
    conn = storage.get_connection(tmp_path / "pipeline.sqlite3")
    _seed(conn, "good-plane", needs_review=False)

    output_path = tmp_path / "nested" / "dir" / "airplanes.json"
    export_airplanes_json(conn, output_path)

    assert output_path.is_file()


def test_export_record_shape_has_array_type_field(tmp_path):
    conn = storage.get_connection(tmp_path / "pipeline.sqlite3")
    _seed(conn, "good-plane", needs_review=False)

    output_path = tmp_path / "airplanes.json"
    export_airplanes_json(conn, output_path)

    records = json.loads(output_path.read_text())
    assert isinstance(records[0]["type"], list)
    assert records[0]["type"] == ["Comercial"]


def test_export_can_include_needs_review_when_requested(tmp_path):
    conn = storage.get_connection(tmp_path / "pipeline.sqlite3")
    _seed(conn, "good-plane", needs_review=False)
    _seed(conn, "flagged-plane", needs_review=True)

    output_path = tmp_path / "airplanes.json"
    export_airplanes_json(conn, output_path, include_needs_review=True)

    records = json.loads(output_path.read_text())
    assert {r["id"] for r in records} == {"good-plane", "flagged-plane"}


def test_export_removes_images_orphaned_by_the_filter_stage(tmp_path):
    """Regression test: fetch downloads an image for every target before filter has
    decided anything, so a page the filter later excludes (e.g. a family/overview
    page) still gets an image file written to disk that no cleaned_aircraft row ever
    references. Export should clean those up."""
    conn = storage.get_connection(tmp_path / "pipeline.sqlite3")
    _seed(conn, "good-plane", needs_review=False, image="images/good-plane.jpg")

    images_dir = tmp_path / "data" / "images"
    images_dir.mkdir(parents=True)
    (images_dir / "good-plane.jpg").write_bytes(b"real")
    (images_dir / "excluded-family-page.jpg").write_bytes(b"orphan")

    export_airplanes_json(conn, tmp_path / "data" / "airplanes.json")

    assert (images_dir / "good-plane.jpg").exists()
    assert not (images_dir / "excluded-family-page.jpg").exists()


def test_export_keeps_needs_review_images_even_when_excluded_from_this_export(tmp_path):
    """A needs-review aircraft is still a real cleaned_aircraft row (just excluded by
    default) -- its image must survive a normal export so --include-needs-review can
    use it later without re-fetching."""
    conn = storage.get_connection(tmp_path / "pipeline.sqlite3")
    _seed(conn, "good-plane", needs_review=False, image="images/good-plane.jpg")
    _seed(conn, "flagged-plane", needs_review=True, image="images/flagged-plane.jpg")

    images_dir = tmp_path / "data" / "images"
    images_dir.mkdir(parents=True)
    (images_dir / "good-plane.jpg").write_bytes(b"real")
    (images_dir / "flagged-plane.jpg").write_bytes(b"real too")

    export_airplanes_json(conn, tmp_path / "data" / "airplanes.json")

    assert (images_dir / "good-plane.jpg").exists()
    assert (images_dir / "flagged-plane.jpg").exists()
