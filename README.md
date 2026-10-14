# AirRank

A static "Higher or Lower" style game about airports and airlines, in pt-BR and English.

## Layout

- `packages/shared`: Zod schemas, metric configuration and the pure game rules.
- `apps/data-job`: manual local job that builds the dataset (Wikidata, OurAirports, Wikimedia Commons).
- `apps/web`: Vite + React single-page app. It only reads static files from `apps/web/public`.

## Commands

```sh
npm install
npm run typecheck && npm run lint && npm test
npm run dev -w @agg/web          # play locally
npm run data-job                 # rebuild the dataset and images (network, a few minutes)
npm run validate                 # validate the committed dataset
```

The data job output (`apps/web/public/data`, `apps/web/public/img`) is committed. Never edit it by
hand; rerun the job. Items without a usable photo are listed in `apps/data-job/pending.json`.
A metric below the minimum coverage (150 items) is not offered in the game.

### Resuming an interrupted data job

Just run `npm run data-job` again. Images already on disk are skipped, and the Wikidata and
Commons results are cached in `apps/data-job/.cache/` after the first full fetch. Pass
`-- --refresh` to ignore that cache (`npm run data-job -- --refresh`). Nothing is written to
`apps/web/public/data` until validation passes.

## Deploy (Cloudflare Pages)

Production URL: https://airrank.piovezan.dev.br

First time only: `npx wrangler login`, then create the project with
`npx wrangler pages project create airrank --production-branch main`, and attach the custom domain
in the Cloudflare dashboard (Workers & Pages, airrank, Custom domains).

Every deploy: `npm run deploy` (builds `apps/web` and uploads `apps/web/dist`).
`VITE_SITE_URL` for the share text lives in `apps/web/.env.production`.
Cache rules for images, data and assets are in `apps/web/public/_headers`.
