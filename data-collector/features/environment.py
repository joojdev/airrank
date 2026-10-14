import shutil
import tempfile
from pathlib import Path


def before_scenario(context, scenario):
    context.tmp_dir = Path(tempfile.mkdtemp(prefix="data-collector-behave-"))
    context.db_path = context.tmp_dir / "pipeline.sqlite3"


def after_scenario(context, scenario):
    shutil.rmtree(context.tmp_dir, ignore_errors=True)
