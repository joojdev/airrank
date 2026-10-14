"""Stage 4: read non-blocking cleaned records and write the committed
frontend/public/data/airplanes.json -- the game's sole data source."""

import json
from dataclasses import asdict
from pathlib import Path

from data_collector import storage

REPO_ROOT = Path(__file__).resolve().parents[2]
OUTPUT_PATH = REPO_ROOT / "frontend" / "public" / "data" / "airplanes.json"


def export_airplanes_json(
    conn, output_path: Path = OUTPUT_PATH, include_needs_review: bool = False
) -> Path:
    records = storage.list_exportable_cleaned_aircraft(
        conn, include_needs_review=include_needs_review
    )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps([asdict(record) for record in records], indent=2, ensure_ascii=False)
        + "\n"
    )
    _remove_orphaned_images(conn, output_path.parent / "images")
    return output_path


def _remove_orphaned_images(conn, images_dir: Path) -> None:
    """Deletes image files that don't belong to any cleaned_aircraft row -- e.g. a
    page the filter stage excluded after fetch had already downloaded its image.
    Checked against *every* cleaned_aircraft row regardless of needs_review, not just
    this export's included set, so a needs-review aircraft's image survives a normal
    export and is still there if it's later included with --include-needs-review."""
    if not images_dir.exists():
        return
    referenced_filenames = {
        Path(row["image_path"]).name
        for row in conn.execute(
            "SELECT image_path FROM cleaned_aircraft WHERE image_path IS NOT NULL"
        ).fetchall()
    }
    for file in images_dir.iterdir():
        if file.is_file() and file.name not in referenced_filenames:
            file.unlink()
