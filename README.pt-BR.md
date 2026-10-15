# AirRank

[English](README.md) | Português

Um jogo estático no estilo "Mais ou Menos" sobre aeroportos e companhias aéreas, em pt-BR e inglês.

## Como foi feito

Este projeto foi feito com **Spec-Driven Development** (desenvolvimento orientado a especificação),
usando o [GitHub Spec Kit](https://github.com/github/spec-kit) e um assistente de código com IA
(Claude Code), com uma pessoa tomando as decisões e revisando cada etapa.

- **Especificação primeiro.** Uma constituição do projeto (`.specify/memory/constitution.md`)
  define os princípios (dados guiados por schema, entrega apenas estática, origem e atribuição dos
  dados). A funcionalidade em si passa por spec → plan → tasks (`specs/001-higher-lower-mvp/`)
  antes de qualquer código.
- **IA usada com segurança e senso crítico.** O código gerado nunca é aceito às cegas: toda mudança
  é revisada, passa por typecheck, lint e testes (Vitest), localmente e no CI, antes de ir ao ar.
  Os dados são validados com schemas Zod, o deploy é condicionado a essas mesmas verificações e os
  segredos ficam fora do repositório (token da Cloudflare restrito ao Pages, guardado como secret
  de environment no GitHub).
- **Pessoa no controle.** As decisões de design, escopo e trade-offs são minhas; a IA propõe e
  implementa, e eu aprovo cada mudança antes de ela ser commitada.

## Estrutura

- `packages/shared`: schemas Zod, configuração das métricas e as regras puras do jogo.
- `apps/data-job`: job manual e local que monta o dataset (Wikidata, OurAirports, Wikimedia Commons).
- `apps/web`: SPA em Vite + React. Só lê arquivos estáticos de `apps/web/public`.

## Comandos

```sh
npm install
npm run typecheck && npm run lint && npm test
npm run dev -w @agg/web          # jogar localmente
npm run data-job                 # refaz o dataset e as imagens (rede, alguns minutos)
npm run validate                 # valida o dataset commitado
```

A saída do data job (`apps/web/public/data`, `apps/web/public/img`) é commitada. Nunca edite à
mão; rode o job de novo. Itens sem foto utilizável ficam listados em `apps/data-job/pending.json`.
Uma métrica abaixo da cobertura mínima (150 itens) não é oferecida no jogo.

### Retomando um data job interrompido

Basta rodar `npm run data-job` de novo. Imagens que já estão no disco são puladas, e os resultados
do Wikidata e do Commons ficam em cache em `apps/data-job/.cache/` após a primeira busca completa.
Passe `-- --refresh` para ignorar o cache (`npm run data-job -- --refresh`). Nada é escrito em
`apps/web/public/data` até a validação passar.

## Deploy (Cloudflare Pages)

URL de produção: https://airrank.piovezan.dev.br

Só na primeira vez: `npx wrangler login`, depois crie o projeto com
`npx wrangler pages project create airrank --production-branch main` e associe o domínio
customizado no dashboard da Cloudflare (Workers & Pages, airrank, Custom domains).

Todo push na `main` faz deploy automático pelo GitHub Actions (`.github/workflows/deploy.yml`):
typecheck, testes, build e upload de `apps/web/dist`. O job usa o environment `production` com dois
secrets: `CLOUDFLARE_API_TOKEN` (Account, Cloudflare Pages, Edit) e `CLOUDFLARE_ACCOUNT_ID`.
`npm run deploy` continua como alternativa manual.
A `VITE_SITE_URL` do texto de compartilhamento fica em `apps/web/.env.production`.
As regras de cache de imagens, dados e assets estão em `apps/web/public/_headers`.
