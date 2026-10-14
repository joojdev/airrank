# Data Model: Higher or Lower Aviation Game (MVP)

All shapes are Zod schemas in `packages/shared`; TypeScript types are inferred from them.

## Category

`"airport" | "airline"`

## Metric (configuration, not dataset)

| Field          | Type                          | Notes                                      |
| -------------- | ----------------------------- | ------------------------------------------ |
| `id`           | enum                          | `passengers`, `runway`, `fleet`, `founded` |
| `category`     | Category                      | each metric belongs to one category        |
| `isDefault`    | boolean                       | exactly one default per category           |
| `unit`         | string \| null                | `m` for runway; none for the others        |
| `comparison`   | `"ratio" \| "difference"`     | `difference` only for `founded`            |
| `answerLabels` | `{ higher, lower }` i18n keys | "More/Less" or "Newer/Older"               |

## Difficulty

`"easy" | "medium" | "hard"`, with thresholds in configuration:

| Comparison               | easy | medium   | hard  |
| ------------------------ | ---- | -------- | ----- |
| ratio (larger ÷ smaller) | > 3  | 1.5 to 3 | < 1.5 |
| difference (years)       | > 30 | 10 to 30 | < 10  |

Boundaries: medium is inclusive on both ends; hard is below the lower bound. Pairs with equal
values are never generated, whatever the difficulty.

## Photo

| Field             | Type                   | Notes                                                        |
| ----------------- | ---------------------- | ------------------------------------------------------------ |
| `widths`          | number[]               | e.g. `[480, 960, 1600]`                                      |
| `formats`         | `("avif" \| "webp")[]` |                                                              |
| `author`          | string                 | required                                                     |
| `license`         | string                 | required, SPDX-like or Commons license name                  |
| `licenseUrl`      | string (URL)           |                                                              |
| `sourceUrl`       | string (URL)           | Commons file page                                            |
| `width`, `height` | number                 | intrinsic size of the largest variant, to avoid layout shift |

Files live at `img/<itemId>/<width>.<format>`.

## Item

| Field      | Type                                 | Notes                                              |
| ---------- | ------------------------------------ | -------------------------------------------------- |
| `id`       | string                               | stable slug, e.g. `apt-gru`, `air-latam`           |
| `category` | Category                             |                                                    |
| `name`     | string                               | original form, never translated                    |
| `code`     | string                               | IATA code (ICAO if no IATA)                        |
| `country`  | string \| null                       | ISO 3166-1 alpha-2, optional context line          |
| `photo`    | Photo                                | required; items without one are not in the dataset |
| `metrics`  | partial record of metric id → number | only metrics of its category; absent when unknown  |

Rules: at least one metric value; metric values are finite numbers; `passengers`, `fleet` and
`runway` are positive; `founded` is an integer year.

## Manifest

| Field           | Type         | Notes                                               |
| --------------- | ------------ | --------------------------------------------------- |
| `schemaVersion` | number       | bumped on breaking changes                          |
| `generatedAt`   | ISO datetime |                                                     |
| `categories`    | record       | per category: file name and item count              |
| `metrics`       | array        | one entry per **offered** metric: `id`, `itemCount` |
| `minimumItems`  | number       | threshold used to decide which metrics are offered  |

A metric appears in `metrics` only if it meets the minimum coverage (FR-028). The web app builds
its selectors from this list.

## PendingItem (job output, not served)

| Field                            | Type                                                   |
| -------------------------------- | ------------------------------------------------------ |
| `id`, `category`, `name`, `code` | as in Item                                             |
| `wikidataId`                     | string                                                 |
| `reason`                         | `"no-photo" \| "unfree-license" \| "bad-aspect"`       |
| `metrics`                        | partial record, kept so the maintainer can judge value |

## CoverageReport (job output, not served)

Per metric: eligible items, items with a value, items with a photo, final count, and whether it
meets `minimumItems`. Printed at the end of each run.

## Game session (in memory)

| Field                              | Type                                   |
| ---------------------------------- | -------------------------------------- |
| `category`, `metric`, `difficulty` | selection                              |
| `current`                          | Item (value visible)                   |
| `challenger`                       | Item (value hidden)                    |
| `score`                            | number                                 |
| `usedPairs`                        | set of unordered item id pairs         |
| `phase`                            | `"answering" \| "revealing" \| "over"` |

State transitions: `answering` → (answer) → `revealing` (answers locked, ~1.5 s or tap) →
`answering` with a new pair if correct, or `over` if wrong or no pairs remain.

## Stored in the browser

See [contracts/browser-storage.md](contracts/browser-storage.md): `Selection`, `Language`,
`BestScores` (keyed by `category/metric/difficulty`).
