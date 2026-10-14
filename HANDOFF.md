# Handoff

State of the `001-higher-lower-mvp` implementation (see `specs/001-higher-lower-mvp/tasks.md`).

## Done

- Tasks T001 to T072 and T074 to T075 are implemented and marked `[X]`, including T036 (real dataset).
- `npm run typecheck`, `npm run lint`, `npm test` (63 tests) and `npm run validate` all pass.
- Real dataset committed to the working tree (not yet committed to git): 500 items (250 airports,
  250 airlines), written to `apps/web/public/data` and `apps/web/public/img`.
- Nothing has been committed to git yet.

## Open

- **T073**: run the quickstart scenarios in `specs/001-higher-lower-mvp/quickstart.md` against the
  real data (`npm run dev -w @agg/web`): blocked storage, blocked images, keyboard-only play and
  the mobile throttling check (SC-005). Fix what fails.
- **Image size**: `apps/web/public/img` is 138 MB, above the 50-100 MB budget. Options: lower
  `MAX_PER_CATEGORY` (default 250, for example to 180) or drop the 1600 px width in
  `apps/data-job/src/images/process.ts`, then rerun the job.
- **Paper UI bundle** (T018): not vendored. `apps/web/src/paper/wrapper.tsx` is a local stand-in with
  the same component names (`Button`, `Window`, `Icon`). Swapping in the real bundle is a change to
  `apps/web/src/paper/index.ts` only (see research.md R3).
- **Production URL**: set `VITE_SITE_URL` in Vercel (`apps/web/.env.example`), used in the share text.

## Decisions and findings

- **Fleet size is not offered.** Wikidata has no fleet size property, so the metric has 0 items and
  is left out of the manifest (FR-028). It needs another data source.
- **Dataset cap.** Without a cap the job produced about 3,800 items. It now keeps the best-known
  `MAX_PER_CATEGORY` (default 250) per category, ranked by Wikipedia sitelinks. The ranking is used
  only to pick items, never in gameplay.
- **Coverage on the last run:** passengers 246, runway 250, founded 250, fleet 0. 1,320 items
  have no free photo and are listed in `apps/data-job/pending.json`.
- **Airport eligibility** requires a match in OurAirports with scheduled service and a real airport
  type (no heliports, closed fields or seaplane bases).
- **Wikidata queries are split** (base data, passenger counts, images, sitelinks) and merged in
  code, because one joined query returns tens of millions of rows and times out.

## Data job

- Run: `npm run data-job`. Validate: `npm run validate`.
- Resumable: images already on disk are skipped, and Wikidata and Commons results are cached in
  `apps/data-job/.cache/` (gitignored). `npm run data-job -- --refresh` ignores the cache.
- Nothing is written to `apps/web/public/data` until validation passes.
- Requests have a 60 s timeout and retry with backoff. A full image run takes a long time (AVIF
  encoding), so run it in the background.

## Caveats

- `prettier --write .` was run once at the repository root by mistake and reformatted untracked
  files in `specs/`, `docs/`, `.specify/` and `.claude/`. Formatting only, but not revertible
  through git. Run prettier on specific folders only.
- `apps/web/public` once held a hand-made sample dataset (generator at
  `apps/web/scripts/make-sample.ts`). It was replaced by the real data and is no longer needed.
