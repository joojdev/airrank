# Contract: Browser storage (`localStorage`)

All keys are prefixed `agg:`. Values are JSON, validated with Zod on read; an invalid or missing
value is treated as absent. Every read and write is wrapped so a blocked or full storage never
throws into the UI (FR-024).

| Key             | Value                                                | Written when                                   |
| --------------- | ---------------------------------------------------- | ---------------------------------------------- |
| `agg:selection` | `{ category, metric, difficulty }`                   | the player starts a game                       |
| `agg:language`  | `"pt-BR" \| "en"`                                    | the player switches language manually          |
| `agg:best`      | `Record<"<category>/<metric>/<difficulty>", number>` | a game ends with a score above the stored best |

## Rules

- On the start screen, a stored `selection` is restored only if its category, metric and
  difficulty are still offered by the current manifest; otherwise it is ignored.
- `agg:language` wins over browser detection; with no value, any `pt*` language maps to
  `pt-BR` and everything else to `en`.
- Best score keys use the same ids as the dataset (`airport/passengers/hard`).
- No personal data is stored, and nothing is sent anywhere.
