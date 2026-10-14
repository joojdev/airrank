# Contract: Static dataset (data job → web app)

The data job writes these files; the web app only reads them. Shapes are the Zod schemas
described in [data-model.md](../data-model.md), owned by `packages/shared`.

## Location

Served from `apps/web/public`, so at runtime:

| Path                         | Content                              |
| ---------------------------- | ------------------------------------ |
| `/data/manifest.json`        | `Manifest`                           |
| `/data/items-airport.json`   | array of `Item` (category `airport`) |
| `/data/items-airline.json`   | array of `Item` (category `airline`) |
| `/img/<itemId>/<width>.avif` | image variant                        |
| `/img/<itemId>/<width>.webp` | image variant                        |

Not served and not part of the contract: `apps/data-job/pending.json` and the coverage report.

## Guarantees from the job

1. Every file validates against the shared schemas before it is written; on failure the job
   exits non-zero and writes nothing.
2. Every `Item` has a photo with author, license and source URL, and every file implied by
   `photo.widths` × `photo.formats` exists.
3. No item appears in two files; `id` values are unique across the dataset.
4. Every item has at least one metric value, and metric ids belong to the item's category.
5. `manifest.metrics` lists exactly the metrics that meet `minimumItems`, and `itemCount`
   matches the number of items carrying that metric.
6. Output is deterministic for the same inputs (stable ordering), so diffs stay small.

## Guarantees expected from the web app

1. Load `manifest.json` first, then the item file of the chosen category, and validate with the
   shared schemas. A validation failure shows a clear error screen; data is never silently
   coerced.
2. Build selectors only from `manifest.metrics`.
3. Use `srcset`/`sizes` with the listed widths, AVIF first and WebP as fallback, and show the
   photo's author and license.
4. Never request any other origin for data.

## Versioning

`schemaVersion` is bumped on any breaking change. The web app refuses a dataset whose
`schemaVersion` it does not support and shows an error instead of guessing.
