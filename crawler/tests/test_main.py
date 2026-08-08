import json

from crawler.main import PLACEHOLDER_RECORDS, write_placeholder_data


def test_write_placeholder_data_writes_valid_single_record_json(tmp_path):
    output_path = tmp_path / "data" / "airplanes.json"

    result_path = write_placeholder_data(output_path)

    assert result_path == output_path
    records = json.loads(output_path.read_text())
    assert records == PLACEHOLDER_RECORDS
    assert len(records) == 1
    assert set(records[0].keys()) == {"id", "name"}
