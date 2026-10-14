"""Data collector CLI.

Runs the fetch -> filter -> clean -> export pipeline, one stage at a time or all at
once. Each stage is a thin wrapper around the real logic in wikipedia_client.py,
page_classifier.py, pipeline.py, and export.py -- see those modules and
docs/data-sources.md / docs/airplane-attributes.md for what each stage actually does.
"""

import argparse
from pathlib import Path

import requests

from data_collector import discovery, pipeline, storage
from data_collector.export import OUTPUT_PATH, export_airplanes_json
from data_collector.page_classifier import run_filter_stage
from data_collector.wikipedia_client import USER_AGENT

DEFAULT_TARGETS_PATH = Path(__file__).resolve().parents[1] / "targets.txt"


def _load_targets(path: Path) -> list[str]:
    return discovery.load_targets(path)


def _build_session() -> requests.Session:
    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT})
    return session


def run_fetch(args, conn) -> None:
    targets = _load_targets(Path(args.targets))
    session = _build_session()
    missing_images = pipeline.run_fetch_stage(targets, conn, session, force=args.force)
    print(f"Fetched {len(targets)} target title(s) into raw_pages.")
    if missing_images:
        print(f"Warning: no image found for: {', '.join(missing_images)}")


def run_filter(args, conn) -> None:
    decisions = run_filter_stage(conn)
    included = sum(1 for decision in decisions if decision.include)
    print(
        f"Classified {len(decisions)} page(s): "
        f"{included} included, {len(decisions) - included} excluded."
    )


def run_clean(args, conn) -> None:
    def on_progress(index: int, total: int, title: str) -> None:
        print(f"[{index}/{total}] Cleaning {title}...", flush=True)

    def on_retry(message: str) -> None:
        print(f"  {message}", flush=True)

    records = pipeline.run_clean_stage(conn, on_progress=on_progress, on_retry=on_retry)
    print(f"Cleaned {len(records)} included page(s) into cleaned_aircraft.")


def run_export(args, conn) -> None:
    output_path = export_airplanes_json(
        conn, Path(args.output), include_needs_review=args.include_needs_review
    )
    print(f"Exported to {output_path}")


def run_all(args, conn) -> None:
    run_fetch(args, conn)
    run_filter(args, conn)
    run_clean(args, conn)
    run_export(args, conn)


def run_browse(args, conn) -> None:
    from data_collector.tui.app import AircraftBrowserApp

    # The App manages its own connection(s) -- see AircraftBrowserApp.__init__ for why
    # (its background workers run on real threads, which can't share a sqlite3
    # connection with the main thread). Close the one main() opened for us unused.
    conn.close()
    session = _build_session()
    app = AircraftBrowserApp(
        db_path=storage.DEFAULT_DB_PATH, session=session, targets_path=Path(args.targets)
    )
    app.run()


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="data_collector")
    subparsers = parser.add_subparsers(dest="command", required=True)

    fetch_parser = subparsers.add_parser(
        "fetch", help="Fetch and store raw Wikipedia pages (Stage 1)"
    )
    fetch_parser.add_argument("--targets", default=str(DEFAULT_TARGETS_PATH))
    fetch_parser.add_argument("--force", action="store_true")
    fetch_parser.set_defaults(func=run_fetch)

    filter_parser = subparsers.add_parser(
        "filter", help="Classify raw pages by parseable shape (Stage 2)"
    )
    filter_parser.set_defaults(func=run_filter)

    clean_parser = subparsers.add_parser(
        "clean", help="Extract, validate, and normalize included pages (Stage 3)"
    )
    clean_parser.set_defaults(func=run_clean)

    export_parser = subparsers.add_parser(
        "export", help="Write cleaned records to airplanes.json (Stage 4)"
    )
    export_parser.add_argument("--output", default=str(OUTPUT_PATH))
    export_parser.add_argument("--include-needs-review", action="store_true")
    export_parser.set_defaults(func=run_export)

    run_all_parser = subparsers.add_parser(
        "run-all", help="Run fetch, filter, clean, and export in sequence"
    )
    run_all_parser.add_argument("--targets", default=str(DEFAULT_TARGETS_PATH))
    run_all_parser.add_argument("--force", action="store_true")
    run_all_parser.add_argument("--output", default=str(OUTPUT_PATH))
    run_all_parser.add_argument("--include-needs-review", action="store_true")
    run_all_parser.set_defaults(func=run_all)

    browse_parser = subparsers.add_parser(
        "browse", help="Interactive TUI to search Wikipedia's aircraft index and pick targets"
    )
    browse_parser.add_argument("--targets", default=str(DEFAULT_TARGETS_PATH))
    browse_parser.set_defaults(func=run_browse)

    return parser


def main(argv: list[str] = None) -> None:
    parser = build_parser()
    args = parser.parse_args(argv)
    conn = storage.get_connection()
    try:
        args.func(args, conn)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
