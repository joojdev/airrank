# Quickstart: validating the MVP

Prerequisites: Node.js 24 and npm 11. Commands assume the repository root and the layout in
[plan.md](plan.md). Scenarios map to user stories in [spec.md](spec.md).

## 1. Install and check

```bash
npm install
npm run typecheck
npm run lint
npm test
```

Expected: all pass, including the test that validates the committed dataset against the shared
schemas.

## 2. Prepare the data (User Story 5)

```bash
npm run data-job -w apps/data-job
```

Expected:

- `apps/web/public/data/manifest.json` and `items-*.json` are written, and images appear under
  `apps/web/public/img/`.
- A coverage report is printed with, per metric, the final item count and whether it meets the
  minimum. Metrics below it are absent from the manifest.
- `apps/data-job/pending.json` lists items without a usable photo, and none of them is in the
  dataset.
- Corrupting an item (for example, removing a photo's `author`) and rerunning validation makes
  the job fail and leave the previous output untouched.

## 3. Run the game (User Stories 1 to 4)

```bash
npm run dev -w apps/web
```

Open the printed local URL, then check:

1. **Selection**: metric and difficulty selectors are unavailable until the previous one is
   chosen. Picking "Airport" pre-selects "Passengers per year". Reload and the last selection
   returns.
2. **Game**: two items with photos; the first shows its value. A correct answer reveals the
   value, adds a point and moves on after about 1.5 s, or immediately on tap. A wrong answer
   reveals the value, then goes to the game over screen.
3. **Difficulty**: on "easy" no pair has a ratio below 3x; on "hard", none above 1.5x; no pair
   has equal values. For "Year founded", the same holds for year differences.
4. **Game over**: defeat message, score and best score. A better score updates the best and
   survives a reload. Share opens the native sheet or copies the text with a confirmation.
   Restart returns to the start screen.
5. **Language and theme**: with the browser set to Portuguese the UI is in Portuguese, otherwise
   English; the manual switch persists. Toggle the system dark mode and check contrast.
6. **Resilience**: block site storage in the browser and confirm the game still plays; block an
   image request and confirm a placeholder appears.
7. **Keyboard**: complete a whole game without a mouse; focus is always visible.

## 4. Production build

```bash
npm run build -w apps/web
npm run preview -w apps/web
```

Expected: static output only; the first comparison is answerable within 3 s on a throttled
mobile profile (SC-005).
