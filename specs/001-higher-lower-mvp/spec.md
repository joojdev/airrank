# Feature Specification: Higher or Lower Aviation Game (MVP)

**Feature Branch**: `001-higher-lower-mvp`

**Created**: 2026-10-13

**Status**: Draft

**Input**: User description: "MVP, leia o IDEIA.md e comece a desenvolver"

## Clarifications

### Session 2026-10-13

- Q: Quais aeroportos e companhias aéreas entram no jogo? → A: Só itens comerciais: aeroportos com voos regulares de passageiros e companhias aéreas ativas.
- Q: Depois da resposta, o jogo avança sozinho ou espera um toque? → A: Revela o valor, pausa cerca de 1,5 s e avança sozinho; um toque pula a pausa.
- Q: Como ficam os botões de resposta para "Ano de fundação"? → A: Rótulos próprios por métrica: "Mais nova / Mais antiga" para ano de fundação, "Mais / Menos" nas demais.
- Q: Como medir a dificuldade para "Ano de fundação"? → A: Pela diferença em anos: fácil acima de 30, médio de 10 a 30, difícil abaixo de 10 (faixas configuráveis).
- Q: E se a cobertura de dados de uma métrica de companhias aéreas for insuficiente? → A: Lançar só as métricas que atingem o mínimo de itens; as demais ficam ocultas na seleção até terem dados.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Play a round of Higher or Lower (Priority: P1)

A player chooses a category (airport or airline), a metric and a difficulty, then plays a
Higher or Lower game. Two items are shown with photos: the first reveals its value, the second
hides it. The player says whether the hidden value is higher or lower. Each correct answer
earns one point and the game moves on to the next comparison, until the player gets one wrong.

**Why this priority**: this is the whole game. Without it there is no product.

**Independent Test**: start a game with a fixed category, metric and difficulty, answer
correctly several times, then answer wrongly. Score increases per hit and the game ends on the
first miss.

**Acceptance Scenarios**:

1. **Given** the player started a game, **When** the game screen loads, **Then** two items are
   shown with photo and name, the first with its value visible and the second with its value
   hidden.
2. **Given** a comparison is on screen, **When** the player answers correctly, **Then** the
   hidden value is revealed, the score increases by 1, and after a pause of about 1.5 seconds
   (or a tap, which skips the pause) a new comparison is shown.
3. **Given** a comparison is on screen, **When** the player answers wrongly, **Then** the
   hidden value is revealed and, after the same pause (or a tap), the player is taken to the
   game over screen.
4. **Given** the chosen difficulty, **When** any pair is generated, **Then** the ratio between
   the larger and the smaller value respects that difficulty range and the two values are never
   equal.

---

### User Story 2 - Choose what to play (Priority: P1)

On the start screen the player picks a category, then a metric, then a difficulty. Each
selector only becomes available after the previous one is chosen. Choosing a category
pre-selects its default metric, to reduce clicks. The last selection is remembered next time.

**Why this priority**: it defines what is played and is required to reach the game.

**Independent Test**: open the start screen, walk through the three selectors, start a game,
reload the page and confirm the last selection is restored.

**Acceptance Scenarios**:

1. **Given** the start screen, **When** the player has not chosen a category, **Then** metric
   and difficulty selectors are not available.
2. **Given** the player chooses "Airport", **When** the metric selector appears, **Then**
   "Passengers per year" is already selected, with "Longest runway (m)" as the alternative.
3. **Given** the player chooses "Airline", **When** the metric selector appears, **Then**
   "Fleet size" is already selected, with "Year founded" as the alternative.
4. **Given** the player previously played with a selection, **When** they return to the start
   screen, **Then** that selection is restored.

---

### User Story 3 - End of game, record and share (Priority: P2)

After a wrong answer the player sees a simple defeat message, the final score and their best
score for that category, metric and difficulty combination. They can share the result or
restart.

**Why this priority**: closes the loop and adds replay value, but the game is playable without
it.

**Independent Test**: lose a game with a score higher than the saved record, check the record
updates, share the result, then restart and land on the start screen.

**Acceptance Scenarios**:

1. **Given** the game ended, **When** the screen shows, **Then** it shows a defeat message, the
   final score and the best score for that combination.
2. **Given** the final score beats the saved best for that combination, **When** the game over
   screen shows, **Then** the best score is updated and persists across page reloads.
3. **Given** a device with native sharing, **When** the player taps share, **Then** the native
   share sheet opens with text such as "Fiz 12 pontos em Aeroportos / Passageiros / Difícil"
   and a link.
4. **Given** a device without native sharing, **When** the player taps share, **Then** the same
   text is copied and the player is told it was copied.
5. **Given** the game over screen, **When** the player taps restart, **Then** they return to the
   start screen.

---

### User Story 4 - Use the game in my language and theme (Priority: P2)

The interface appears in Brazilian Portuguese or English according to the browser language, with
a manual switch. The look follows the system light or dark preference until the player picks one
with a theme button, and that choice is remembered. Airport and airline names
are never translated.

**Why this priority**: part of the professional finish promised for the project, but not needed
to validate the core game.

**Independent Test**: open the game with a browser set to each language, switch manually, and
toggle the system theme and the theme button.

**Acceptance Scenarios**:

1. **Given** a browser set to Portuguese (Brazil), **When** the game opens, **Then** the
   interface is in Portuguese.
2. **Given** a browser set to any other language, **When** the game opens, **Then** the
   interface is in English.
3. **Given** the player switches the language manually, **When** they reload the page, **Then**
   the chosen language is kept.
4. **Given** the system prefers a dark theme, **When** the game opens, **Then** the dark theme
   is used.
5. **Given** the player taps the theme button, **When** they reload the page, **Then** the
   chosen theme is kept, whatever the system prefers.

---

### User Story 5 - Game data is prepared ahead of time (Priority: P1)

The maintainer runs a separate preparation step that collects airports and airlines, their
metrics and their photos, validates everything, and produces the dataset the game reads. The
game itself never collects data while being played.

**Why this priority**: the game cannot run without a dataset.

**Independent Test**: run the preparation step, check that the output validates, that each item
has the metric values and a photo with author and license, and that items without a photo are
listed as pending and absent from the game.

**Acceptance Scenarios**:

1. **Given** the preparation step finishes, **When** its output is checked, **Then** every item
   in the game has a name, at least one metric value, and a photo with author and license.
2. **Given** an item has no photo found, **When** the step finishes, **Then** it appears in a
   pending list and is not offered in any game.
3. **Given** an item has no value for a metric, **When** the dataset is built, **Then** it is
   excluded from that metric only.
4. **Given** the output is malformed, **When** the step validates it, **Then** it fails with a
   clear error and does not publish the data.

---

### Edge Cases

- What happens when a category, metric and difficulty combination does not have enough items to
  form pairs? The game must not start with an empty or repeated pool; it handles this with a
  clear message.
- How does the game avoid showing the same item twice in a row, or the same pair repeating
  within one game?
- What happens if the player runs out of possible pairs? The game ends as a win state with the
  final score.
- What happens when a photo fails to load? A placeholder is shown, and the game stays playable.
- What happens when local storage is unavailable or blocked? The game stays playable; selection
  and records just are not remembered.
- What happens when two values are exactly equal? That pair is never generated.
- How does the game treat very large or very small values? They are shown in a readable
  format, with units where applicable.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The game MUST offer two categories (airport, airline), each with two metrics:
  airport = passengers per year (default) and longest runway in meters; airline = fleet size
  (default) and year founded.
- **FR-002**: The start screen MUST present category, metric and difficulty as chained
  selectors, where each only becomes available after the previous one is chosen.
- **FR-003**: Choosing a category MUST pre-select its default metric.
- **FR-004**: The game MUST remember the last selection between visits.
- **FR-005**: Each comparison MUST show two items, with photo and name, the first with its value
  visible and the second with its value hidden.
- **FR-006**: The player MUST be able to answer whether the hidden value is higher or lower than
  the visible one, using answer labels specific to each metric: "More / Less" for passengers,
  runway and fleet size, and "Newer / Older" for year founded (a later year counts as newer).
- **FR-007**: A correct answer MUST reveal the value, add one point and, after a pause of about
  1.5 seconds, automatically show the next comparison, where the item just revealed becomes the
  visible one. A tap or key press MUST skip the pause, and answers MUST be locked during it.
- **FR-008**: A wrong answer MUST reveal the value and, after the same pause (skippable the same
  way), end the game.
- **FR-009**: Pair generation MUST respect difficulty by the ratio of larger to smaller value:
  easy above 3x, medium from 1.5x to 3x, hard below 1.5x. For year founded, difficulty MUST
  instead use the difference in years: easy above 30, medium from 10 to 30, hard below 10.
  All thresholds MUST be adjustable without changing game logic.
- **FR-010**: Pairs with exactly equal values MUST never be generated.
- **FR-011**: The game over screen MUST show a defeat message, the final score and the best
  score for the combination of category, metric and difficulty.
- **FR-012**: The best score MUST be stored per combination and survive page reloads.
- **FR-013**: The game over screen MUST offer sharing: native sharing when available, otherwise
  copying the text, with confirmation. The text includes the score, category, metric,
  difficulty and a link.
- **FR-014**: The game over screen MUST offer restart, returning to the start screen.
- **FR-015**: The interface MUST be available in Portuguese (Brazil) and English, default to
  the browser language, fall back to English, and allow manual switching that is remembered.
- **FR-016**: Airport and airline names MUST be shown in their original form in both languages.
- **FR-017**: The interface MUST support light and dark themes following the system
  preference by default, allow a manual switch that is remembered, and keep text contrast of at least 4.5:1 in both.
- **FR-018**: Photos MUST display the author and license required for attribution.
- **FR-019**: Photos MUST load in sizes suited to the device, using modern formats, so the game
  feels fast on mobile connections.
- **FR-020**: The game MUST NOT collect any data from external sources while being played; it
  only reads a prepared dataset.
- **FR-021**: A separate preparation step MUST produce the dataset from public sources
  (Wikidata, OurAirports, Wikimedia Commons), validate it, and refuse to publish invalid data.
- **FR-022**: Items without a found photo MUST be recorded in a pending list and MUST NOT appear
  in the game.
- **FR-023**: Items without a value for a metric MUST be excluded from that metric only.
- **FR-027**: Only commercial items MUST be eligible for the game: airports with scheduled
  passenger service and airlines that are currently active. Private airfields, military-only
  airports, heliports and defunct airlines MUST be excluded.
- **FR-028**: A metric MUST be offered on the start screen only if it meets the minimum item
  coverage (SC-007 and SC-008); otherwise it MUST stay hidden until enough data exists. If a
  category is left with a single metric, that metric is pre-selected.
- **FR-024**: The game MUST stay playable if browser storage or sharing is unavailable.
- **FR-025**: Copy MUST use sentence case, address the user informally ("você" in Portuguese),
  and have no emoji.
- **FR-026**: Controls MUST be usable by keyboard with a visible focus indicator, and the
  layout MUST adapt from phone to desktop screens.

### Key Entities _(include if feature involves data)_

- **Item**: a commercial airport (with scheduled passenger service) or an active airline. Has a
  name, a category, a photo and the values for its metrics.
- **Metric**: a measurable attribute of an item (passengers per year, longest runway, fleet
  size, year founded). Belongs to one category, with a unit and a default flag.
- **Photo**: an image of an item, in several sizes and formats, with author and license.
- **Difficulty**: easy, medium or hard, defined by a ratio range between two values (or a
  range of year differences, for year founded).
- **Pair**: two items of the same category compared on one metric.
- **Game session**: the current run, with category, metric, difficulty and score.
- **Best score**: the highest score for one combination of category, metric and difficulty.
- **Pending item**: an item left out of the game because no photo was found yet.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A new player can go from opening the game to answering the first comparison in
  under 15 seconds and at most 4 interactions.
- **SC-002**: A returning player can start a game with their previous selection in 1 interaction.
- **SC-003**: 100% of generated pairs respect the chosen difficulty range (ratio, or year
  difference for year founded) and never have equal values.
- **SC-004**: 100% of items offered in the game have a photo with author and license, and a
  value for the chosen metric.
- **SC-005**: The game screen is usable (first comparison visible and answerable) within 3
  seconds on a typical mobile connection.
- **SC-006**: Every interactive element can be reached and used with the keyboard only, in both
  languages and both themes.
- **SC-007**: Every combination of category, metric and difficulty offered on the start screen
  has enough items to play at least 10 comparisons.
- **SC-008**: Every metric offered has at least 150 eligible items with a value and a photo.

## Assumptions

- The audience is casual players on phones and desktops, with no accounts and no login.
- The dataset size target is around 500 items in total; the exact count per category depends on
  data coverage, and metrics with poor coverage may be released with fewer items.
- Wikidata coverage of fleet size and founding year for airlines is not yet known; a metric
  that does not reach the minimum coverage is released later (see FR-028), possibly with another
  data source.
- Item "fame" as a difficulty factor is out of scope for this version.
- Game state, last selection, language choice and records live only in the player's browser;
  there are no global rankings.
- Analytics are out of scope for this version.
- The visual identity (Paper UI with the Flight Journal palette) and the technical decisions
  are defined by the project constitution and `docs/IDEA.md`, and are handled in planning.
- The game is worldwide in geographic scope.
- Running the preparation step is a manual, local task done by the maintainer.
