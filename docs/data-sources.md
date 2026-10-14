# Fontes de Dados para o Data Collector

Pesquisa de fontes candidatas para popular `airplanes.json` com os atributos
definidos em [`airplane-attributes.md`](./airplane-attributes.md). Critérios usados:
volume razoável de aeronaves, interface/estrutura consistente entre registros (para
facilitar extração e manter consistência de dados) e cobertura dos 9 atributos do MVP.

## Fonte recomendada: Wikipédia (en.wikipedia.org), via API

**Não fazer scraping de HTML renderizado.** Usar a API oficial do MediaWiki:

- `action=query&prop=categories|pageimages&titles=<Nome>&piprop=original&format=json` —
  lista as categorias do artigo (usado para posição da asa e trem de pouso, ver abaixo)
  **e** a URL da imagem principal do infobox, combinadas na mesma chamada em vez de uma
  requisição separada só para a imagem.
- `action=parse&page=<Nome>&prop=wikitext&format=json` — retorna o wikitext bruto,
  de onde os templates `Infobox aircraft` e o template de especificações (variantes
  de "Aircraft specs") são parseados por nome de parâmetro.

Motivos para preferir a API à raspagem de HTML:
- Campos vêm por nome de parâmetro (`manufacturer=`, `eng1 number=`, `ceiling ft=`
  etc.), não por posição/CSS, então é muito mais robusto a mudanças de layout.
- `robots.txt` da Wikipédia libera `/wiki/<artigo>` para user-agents genéricos, e a
  API é o caminho de acesso programático oficialmente sancionado — sem necessidade
  de Selenium (a constituição do projeto reserva Selenium só para páginas que
  realmente precisam de renderização JS).
- Licença CC BY-SA/GFDL; specs numéricas (fatos) não são passíveis de copyright de
  qualquer forma.

**Volume**: o índice ["List of aircraft"](https://en.wikipedia.org/wiki/Lists_of_aircraft)
(dividido alfabeticamente em dezenas de sub-páginas) cobre praticamente todo avião já
produzido — dezenas de milhares de entradas, muito acima do necessário para o MVP.

**Consistência**: a maior parte dos artigos usa dois templates padronizados com os
mesmos nomes de campo:
- `Infobox aircraft` — nome, tipo/role, fabricante, status, primeiro voo.
- Template de especificações (`General characteristics` / `Performance`) — tripulação,
  pesos, motores, velocidades, teto de serviço, envergadura, em pés/metros e
  kts/mph/km-h conforme o artigo.

Nem todo artigo tem 100% dos campos preenchidos (artigos mais antigos/raros podem
faltar algum), mas o suficiente têm dados completos para dar volume ao MVP.

### Extração: LLM em vez de mapeamento fixo de campos

A extração de stage 3 (clean) não faz mais `|param=value` parsing por regex. O motivo:
Wikipédia tem formatos reais demais para um mapa fixo de nomes de campo acompanhar —
o template clássico `{{Aircraft specs}}`, mas também páginas de aeronaves modernas com
uma wikitable comparando variantes lado a lado (`==Specifications==`), aspas
tipográficas por erro de digitação, `{{cvt}}` vs `{{convert}}`, Mach escrito em ordens
diferentes ("Mach 0.78" vs "0.78 Mach"), etc.

Em vez disso, o wikitext bruto (mais as categorias já buscadas) vai direto pra um LLM
via LangChain, com um schema Pydantic (`AircraftExtraction`, em
`data_collector/llm_extraction.py`) cujas descrições de campo carregam as mesmas regras
de domínio que antes viviam em comentários de código (prioridade de MTOW, Mach nunca
convertido pra km/h, `null` significa desconhecido e não zero, etc.). O modelo recebe
ferramentas de conversão de unidade reais (`lb_to_kg`, `ft_to_m`, `mph_to_kmh`,
`kts_to_kmh`, que chamam a mesma matemática pura e testada de `unit_conversion.py`) e é
instruído a sempre usá-las em vez de calcular ele mesmo — LLM não é calculadora
confiável. Campos que o modelo não tem certeza ficam em `uncertain_fields`, virando
`needs_review=true` em vez de um palpite silencioso.

O provedor concreto (hoje, o tier gratuito do Google AI Studio) fica isolado em
`data_collector/llm_provider.py` — todo o resto do código depende só de
`langchain_core.language_models.BaseChatModel`, então trocar de provedor é editar essa
única função.

## Alternativas avaliadas e descartadas para o MVP

### aerocorner.com
- ~910 perfis de aeronaves (comercial, militar, privada, histórica), organizados por
  fabricante, com abas por aeronave (INFO / SIZE / WEIGHT / PERFORMANCE) e toggle de
  unidades (US / Metric / Both) — teto de serviço já vem em ft **e** m.
- `robots.txt` libera tudo (`Disallow:` vazio), mas é site comercial monetizado por
  ads/tracking pesado, com página "Terms of Content Use" que não foi revisada em
  detalhe — checar antes de qualquer scraping em volume.
- **Sem campo explícito** de posição da asa nem tipo de trem de pouso em nenhuma aba.
- Dados renderizados via JS (abas exigem clique) — exigiria Selenium, ao contrário da
  Wikipédia.

### flugzeuginfo.net
- 1258 tipos de aeronave, tabela de especificações rica por aeronave (tripulação,
  motores, velocidades, teto de serviço, pesos, dimensões).
- Conteúdo majoritariamente em alemão.
- **Sem campo explícito** de posição da asa nem tipo de trem de pouso (só aparecem,
  quando aparecem, em texto livre).
- Copyright "todos os direitos reservados" de pessoa física, sem política de reuso
  documentada — mais arriscado para redistribuir dados extraídos em volume.

## Próximos passos (fora do escopo desta pesquisa)

- Definir a lista fechada de valores possíveis para `wingPosition` e
  `landingGearType` a partir das categorias da Wikipédia realmente encontradas nas
  aeronaves que entrarem no jogo.
