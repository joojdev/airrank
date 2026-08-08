import json
import subprocess
import sys
from pathlib import Path

from behave import given, when, then

REPO_ROOT = Path(__file__).resolve().parents[3]
OUTPUT_PATH = REPO_ROOT / "frontend" / "public" / "data" / "airplanes.json"


@given("the shared data file does not exist yet")
def step_impl(context):
    OUTPUT_PATH.unlink(missing_ok=True)
    assert not OUTPUT_PATH.exists()


@when("the crawler is run")
def step_impl(context):
    context.result = subprocess.run(
        [sys.executable, "-m", "crawler.main"],
        cwd=REPO_ROOT / "crawler",
        capture_output=True,
        text=True,
    )
    assert context.result.returncode == 0, context.result.stderr


@then('a JSON file exists at "{path}"')
def step_impl(context, path):
    file_path = REPO_ROOT / path
    assert file_path.is_file(), f"Expected {file_path} to exist"
    context.written_records = json.loads(file_path.read_text())


@then("it contains exactly one placeholder aircraft record")
def step_impl(context):
    assert len(context.written_records) == 1
    record = context.written_records[0]
    assert set(record.keys()) == {"id", "name"}
