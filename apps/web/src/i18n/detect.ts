import type { Language } from "@agg/shared";

export function detectLanguage(
  browserLanguages: readonly string[],
  stored: Language | null,
): Language {
  if (stored) return stored;
  const first = browserLanguages[0]?.toLowerCase() ?? "";
  return first === "pt" || first.startsWith("pt-") ? "pt-BR" : "en";
}
