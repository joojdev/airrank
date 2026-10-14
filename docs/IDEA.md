# IDEA

Um joguinho de frontend no estilo "Higher or Lower", com tema de aeronáutica. Projeto despretensioso, mas com acabamento profissional.

## Decisões de produto

- **Escopo geográfico:** mundial.
- **Idiomas da interface:** português (BR) e inglês, detectando o navegador, com troca manual. Nomes de aeroportos e companhias ficam no original.
- **Hospedagem:** Vercel (plano gratuito), tudo estático, incluindo as imagens.

## Referência de UI

https://claude.ai/artifact/4AsxEEpRrFA2hbaUKM4fG4

O artefato é um design system chamado **Paper UI**: interface estilo "recorte de papel", com folhas creme, contornos em tinta de 2px, sombras duras sem blur e poucas cores chapadas.

- **Formas e estados:** raios de 4px (controles) e 10px (cards e janelas); sombras `shadow-sm/md/lg` de 2/4/6px. Hover sobe 1px; pressionado desce 2px sem sombra; foco com outline sólido de 2px; desabilitado com contorno tracejado. Movimento curto (80ms), sem bounce.
- **Tipografia:** IBM Plex Mono (texto e UI), Space Grotesk (títulos), Patrick Hand (só para notas de margem).
- **Componentes:** `Paper.Button`, `Paper.Window`, `Icon` etc., em `window.Paper`, ou classes `pp-`.
- **Tom do texto:** sentence case, tratamento por "você", sem emoji.

### Paleta: Flight Journal

Mantém as formas, contornos, sombras e tipografia do Paper UI, mas troca os tokens de cor por esta paleta (papel envelhecido, tinta azul-marinho, detalhes de navegação):

| Token | Cor       |
| ----- | --------- |
| Paper | `#F5F0E6` |
| Card  | `#E4DAC8` |
| Ink   | `#182C3D` |
| Sage  | `#54766B` |
| Amber | `#D18A52` |

Um tema noturno será derivado dessa paleta (fundo em tinta azul-marinho), seguindo `prefers-color-scheme`, com contraste validado (texto 4.5:1).

### Como usar no código

Decisão: usar o `bundle.js` do Paper UI diretamente (componentes em `window.Paper`, com React 18). A troca de cores é feita sobrescrevendo os tokens de cor (variáveis CSS) por cima do `tokens.css`/`bundle.css`. A confirmar na implementação: tipagem TS do bundle (declarações `index.d.ts`) e como carregar o React 18 exigido por ele.

## Versão 1 (escopo)

### Tela 1: Seleção

Três seletores encadeados. Cada um só carrega depois do anterior.

1. **Categoria:** aeroporto ou companhia aérea.
2. **Métrica:** definida pela categoria, com um padrão já selecionado ao escolher a categoria (para reduzir cliques).
3. **Dificuldade:** fácil, médio ou difícil.

Métricas do MVP:

| Categoria       | Métrica padrão      | Segunda métrica |
| --------------- | ------------------- | --------------- |
| Aeroporto       | Passageiros por ano | Maior pista (m) |
| Companhia aérea | Tamanho da frota    | Ano de fundação |

A última seleção dos seletores é salva no `localStorage`.

### Dificuldade

Nesta versão, a dificuldade depende só da proximidade entre os dois valores comparados (razão maior ÷ menor):

| Nível   | Razão          |
| ------- | -------------- |
| Fácil   | maior que 3x   |
| Médio   | de 1,5x a 3x   |
| Difícil | menor que 1,5x |

Valores iniciais, mantidos em configuração para calibrar depois de ver a distribuição real dos dados. Pares com valores exatamente iguais são sempre descartados. A "fama" dos itens (sitelinks ou pageviews da Wikipedia) foi deixada de fora desta versão e fica como evolução.

### Tela 2: Jogo

- Mecânica do Higher or Lower: um item mostra seu valor, o outro não, e o jogador diz se o segundo tem mais ou menos.
- Fotos de boa qualidade, em várias resoluções e formatos modernos (AVIF/WebP) via `srcset`/`sizes`, para o navegador escolher conforme o dispositivo e carregar rápido. As variantes são geradas pelo data job.
- Cada acerto soma um ponto.
- Ao errar, vai para a tela 3.

### Tela 3: Fim de jogo

- Mensagem simples de derrota.
- Botão de compartilhar: Web Share API, com fallback para copiar o texto (ex.: "Fiz 12 pontos em Aeroportos / Passageiros / Difícil" + link).
- Pontuação: recorde salvo por combinação de categoria, métrica e dificuldade, no `localStorage`.
- Botão de recomeçar, que volta para a tela inicial.

## Data job (parte separada)

Componente independente do frontend, responsável por obter e preparar tudo que o jogo consome. O frontend não coleta nada em tempo de execução.

- **Linguagem e estrutura:** TypeScript, em monorepo (por exemplo `apps/web` e `apps/data-job`, mais um pacote compartilhado de tipos).
- **Tipagem:** Zod. Os schemas ficam em um pacote compartilhado, validam a saída do data job e a leitura dos dados no frontend, e os tipos TS são inferidos deles.
- **Fontes de dados:** Wikidata e OurAirports (gratuitas). Passageiros, frota e ano de fundação vêm principalmente da Wikidata; maior pista vem da OurAirports. Itens sem a métrica são excluídos daquela métrica.
- **Fotos:** Wikimedia Commons primeiro (ligadas via Wikidata, P18). Itens sem foto encontrada vão para uma lista de pendências, que o autor pesquisa manualmente depois; enquanto pendentes, não entram no jogo. Guardar autor e licença de cada foto para a atribuição.
- **Imagens:** o job baixa, redimensiona e converte em várias larguras (AVIF/WebP). Estimativa: cerca de 500 itens x 3 tamanhos, na faixa de 50 a 100 MB no total.
- **Execução:** manual e local. A saída (JSON e imagens) é commitada no repositório, e a Vercel só serve os arquivos estáticos. Reavaliar se o repositório ou a banda passarem dos limites do plano gratuito.

## Pontos em aberto

- Cobertura de dados (primeira execução do data job, ver o relatório de cobertura impresso ao final): a Wikidata não tem propriedade de tamanho da frota, então a métrica "tamanho da frota" não é oferecida até haver outra fonte (FR-028). Ano de fundação e as duas métricas de aeroporto têm cobertura suficiente.
- Tamanho final do conjunto: o job limita a 250 itens por categoria (os mais conhecidos, por número de páginas da Wikipedia, usado só para ordenar), para ficar na faixa de 50 a 100 MB de imagens. Configurável com `MAX_PER_CATEGORY`.
- Tipos e carregamento do bundle do Paper UI: ainda pendente. O app usa um wrapper local (`apps/web/src/paper/wrapper.tsx`) com os mesmos nomes de componentes; trocar pelo bundle é uma mudança em `apps/web/src/paper/index.ts`.
- Decidido: testes com Vitest e CI no GitHub Actions (typecheck, lint, testes, contraste), conforme a constituição. Analytics: não discutido ainda.
