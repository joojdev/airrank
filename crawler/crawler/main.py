"""Crawler entry point.

At boilerplate scope this has no real collection target: it writes a single
placeholder record to the frontend's committed data file, proving the
crawler -> frontend hand-off works. Real collection logic is a future feature.
"""

import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
OUTPUT_PATH = REPO_ROOT / "frontend" / "public" / "data" / "airplanes.json"

PLACEHOLDER_RECORDS = [
    {"id": "placeholder-1", "name": "Placeholder Aircraft"},
]


def write_placeholder_data(output_path: Path = OUTPUT_PATH) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(PLACEHOLDER_RECORDS, indent=2) + "\n")
    return output_path


def main() -> None:
    output_path = write_placeholder_data()
    print(f"Wrote {len(PLACEHOLDER_RECORDS)} placeholder record(s) to {output_path}")


if __name__ == "__main__":
    main()
