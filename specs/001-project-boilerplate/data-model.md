# Phase 1 Data Model: Two-Sided Project Boilerplate

This feature introduces no real game domain data. The only data shape it establishes
is the placeholder record written by the crawler and read by the frontend, which exists
solely to prove the write → commit → read pipeline works end-to-end.

## Entity: Placeholder Aircraft Record

Represents one item in the committed JSON file. At boilerplate scope it carries no real
aircraft facts — its only purpose is to have a stable, documented shape that a future
feature can extend with real fields (name, manufacturer, image, specs, etc.) without
changing the file's location or top-level structure.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | Yes | Stable identifier for the record; unique within the file. |
| `name` | string | Yes | Human-readable placeholder label (e.g., "Placeholder Aircraft"). Not a real aircraft name at this stage. |

**Validation rules**:
- `id` MUST be non-empty and unique across all records in the file.
- `name` MUST be non-empty.
- The file MUST NOT contain any field that reveals a "correct answer" to a guess, per
  the constitution — not applicable yet since no guessing mechanic exists, but the
  shape is defined now so future additions don't accidentally violate it.

**Lifecycle**: The entire file is overwritten each time the crawler is run — there is
no per-record update/delete semantics at this stage, only whole-file regeneration.

## Container: `airplanes.json`

- **Location**: `frontend/public/data/airplanes.json` (fixed by clarification).
- **Shape**: A JSON array of zero or more Placeholder Aircraft Record objects. For this
  feature, the crawler MUST write exactly one record to prove the pipeline works.
- **Ownership**: Written only by the crawler; read-only from the frontend's
  perspective. The frontend MUST NOT attempt to write to this file.

See `contracts/airplanes-data.schema.json` for the machine-checkable version of this
shape.
