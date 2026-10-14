# Atributos da Aeronave (MVP)

Atributos que cada registro de aeronave deve ter na fonte de dados (`airplanes.json`)
para suportar o MVP do jogo de adivinhação.

| Atributo | Campo (sugerido) | Tipo | Exemplo |
|---|---|---|---|
| Nome | `name` | string | "Boeing 747-8" |
| Peso | `weight` | number (kg) | 447696 |
| Tipo | `type` | array de string (enum) | ["Comercial"], ["Comercial", "Executivo"] |
| Fabricante | `manufacturer` | array de string | ["Boeing"], ["Sud Aviation", "British Aircraft Corporation"] |
| Número de motores | `engineCount` | number | 4 |
| Posição da(s) asa(s) | `wingPosition` | string (enum) ou `null` | "Alta", "Média", "Baixa", `null` (desconhecido) |
| Tipo de trem de pouso | `landingGearType` | string (enum) ou `null` | "Triciclo", "Convencional (bequilha)", `null` (desconhecido) |
| Regime de velocidade | `speedRegime` | string (enum) | "subsonic", "supersonic" |
| Velocidade máxima | `maxSpeed` | number — unidade implícita pelo `speedRegime` | 987 (km/h, se subsônico) ou 2.0 (Mach, se supersônico) |
| Teto de serviço | `serviceCeiling` | number (m, armazenado) / exibido em pés (ft) | 13100 (≈ 42979 ft) |
| Imagem | `image` | string (caminho relativo) ou `null` | "images/f-16-fighting-falcon.jpg", `null` (nenhuma imagem encontrada) |

## Observações

### Unidades e armazenamento
- Unidades: kg, km/h (subsônico) e metros, para manter consistência com o resto do
  banco. A ser confirmado/documentado no `data-model.md` do data collector quando a
  coleta desses campos for implementada.
- `serviceCeiling` é a única exceção à convenção de exibir na mesma unidade em que é
  armazenado: é **armazenado em metros** no banco/JSON (consistente com os demais
  campos métricos), mas **exibido em pés (ft)** na interface. A conversão (m → ft,
  fator ≈ 3.28084) deve ser feita na camada de apresentação (frontend), não na fonte
  de dados.

### `type` é uma lista, não um valor único
Aeronaves reais frequentemente pertencem a mais de uma categoria (ex.: uma variante
VIP/BBJ de um avião comercial é ao mesmo tempo "Comercial" e "Executivo"; um cargueiro
militar é "Militar" e "Carga"). Por isso `type` é um array — pode ter um, vários, ou
(no limite) nenhum valor reconhecido.

Enum expandido (evidência: texto livre de tipo/role de fontes como a Wikipédia inclui
categorias que não cabiam nas 4 originais, ex. "civil utility aircraft", "trainer
aircraft"):
- `Comercial`, `Militar`, `Carga`, `Executivo` (originais)
- `Geral/Utilitário` — aviação geral / uso utilitário sem se encaixar nas anteriores
- `Treinador` — aeronaves de treinamento

### `manufacturer` também é uma lista
Pela mesma razão de `type`: aeronaves de consórcios/joint ventures têm mais de um
fabricante de verdade (ex.: o Concorde foi construído por Sud Aviation e British
Aircraft Corporation). Array vazio (`[]`) significa que nenhum fabricante foi
reconhecido na fonte, não que a aeronave não tem fabricante.

### `speedRegime` + `maxSpeed`: por que não um único campo em km/h
Caças e outras aeronaves supersônicas às vezes só têm a velocidade documentada em Mach,
não em km/h — e converter Mach → km/h exige saber a altitude/temperatura (a velocidade
do som varia com elas), então essa conversão é imprecisa e enganosa para um jogo que
lida com fatos. Por isso a velocidade é um par de campos:
- `speedRegime`: `"subsonic"` ou `"supersonic"`.
- `maxSpeed`: número cuja unidade é implícita pelo regime — km/h quando subsônico
  (convertido com precisão a partir de mph/kts quando necessário, sem perda), Mach puro
  quando supersônico (nunca convertido para km/h).
- Se a fonte não tiver nenhuma velocidade utilizável em nenhum regime, `maxSpeed` fica
  ausente/`null` para essa aeronave — nunca um número inventado.

### Confiabilidade de dados (unidade errada na fonte, ambiguidade)
Fontes como a Wikipédia são editadas pela comunidade e ocasionalmente têm erro de
unidade ou valores ambíguos/conflitantes. A extração (um LLM, via LangChain — ver
`data-sources.md`) é instruída a nunca inventar ou estimar um valor plausível: quando
um campo é ambíguo, ele fica de fora da lista de campos incertos do registro e o
registro inteiro é marcado para revisão (`needs_review`), em vez de confiar ou
descartar silenciosamente. Conversões de unidade são feitas por ferramentas de
aritmética exata (não pelo próprio modelo) para evitar erro de "calculadora de LLM".

### `image` é um arquivo local, não um link direto para a Wikipédia
O data collector baixa a imagem principal do infobox (via a prop `pageimages` da API do
MediaWiki) durante a etapa de fetch e salva um arquivo real em
`frontend/public/data/images/`. `image` guarda apenas o caminho relativo a
`frontend/public/data/`. A constituição trata o JSON committado como a única fonte de
dados do jogo, então o frontend nunca busca imagens direto na Wikipédia. Nem toda
aeronave tem imagem encontrada — nesse caso `image` é `null`, e isso não é motivo para
excluir a aeronave do jogo.

### Escopo e status
- Este documento cobre apenas os atributos a serem exibidos/usados como pistas ou
  resposta no jogo — não define ainda qual(is) campo(s) é(são) a resposta a ser
  adivinhada nem quais são mostrados como dica, para não expor a resposta
  trivialmente (ver constitution.md, seção Technology & Platform Constraints).
- Estes campos (incluindo os ajustes de `type`/`speedRegime` acima) ainda não existem
  no `data-model.md` de `specs/001-project-boilerplate/` (que só define o registro
  placeholder); esta lista é a referência para quando a coleta real de dados for
  especificada/implementada.
