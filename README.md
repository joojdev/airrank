# AirRank

English | [Português](README.pt-BR.md)

A static "Higher or Lower" style game about airports and airlines, in pt-BR and English.

## How it was built

This project was built with **Spec-Driven Development** using
[GitHub Spec Kit](https://github.com/github/spec-kit) and an AI coding assistant (Claude Code),
with a human making the decisions and reviewing every step.

- **Specification first.** A project constitution (`.specify/memory/constitution.md`) defines the
  principles (schema-first data, static-only delivery, data provenance and attribution). The
  feature itself goes spec → plan → tasks (`specs/001-higher-lower-mvp/`) before any code.
- **AI used with safety and critical judgment.** Generated code is never trusted blindly: every
  change is reviewed, typechecked, linted and tested (Vitest) locally and in CI before it ships.
  Data is validated against Zod schemas, deploys are gated by those same checks, and secrets
  stay out of the repo (Cloudflare token scoped to Pages only, stored as a GitHub environment
  secret).
- **Human in the loop.** Design, scope and trade-off decisions are mine; the AI proposes and
  implements, I approve each change before it is committed.

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

Every push to `main` deploys automatically through GitHub Actions
(`.github/workflows/deploy.yml`): typecheck, tests, build, then upload of `apps/web/dist`. The job
uses the `production` environment with two secrets: `CLOUDFLARE_API_TOKEN` (Account, Cloudflare
Pages, Edit) and `CLOUDFLARE_ACCOUNT_ID`. `npm run deploy` remains as a manual fallback.
`VITE_SITE_URL` for the share text lives in `apps/web/.env.production`.
Cache rules for images, data and assets are in `apps/web/public/_headers`.
