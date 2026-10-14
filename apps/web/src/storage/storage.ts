import {
  BestScoresSchema,
  LanguageSchema,
  SelectionSchema,
  type BestScores,
  type Language,
  type Selection,
} from "@agg/shared";
import { z, type ZodType } from "zod";

const KEYS = {
  selection: "agg:selection",
  language: "agg:language",
  best: "agg:best",
  theme: "agg:theme",
} as const;

const ThemeSchema = z.enum(["light", "dark"]);
export type Theme = z.infer<typeof ThemeSchema>;

function read<T>(key: string, schema: ZodType<T>): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // blocked or full storage must never break the game
  }
}

export const loadSelection = (): Selection | null => read(KEYS.selection, SelectionSchema);
export const saveSelection = (s: Selection): void => write(KEYS.selection, s);
export const loadLanguage = (): Language | null => read(KEYS.language, LanguageSchema);
export const saveLanguage = (l: Language): void => write(KEYS.language, l);
export const loadTheme = (): Theme | null => read(KEYS.theme, ThemeSchema);
export const saveTheme = (t: Theme): void => write(KEYS.theme, t);
export const loadBest = (): BestScores => read(KEYS.best, BestScoresSchema) ?? {};
export const saveBest = (b: BestScores): void => write(KEYS.best, b);
