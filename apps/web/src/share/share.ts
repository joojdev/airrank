import type { Language, Selection } from "@agg/shared";
import { dictionaries } from "../i18n";

export const SITE_URL: string =
  (import.meta.env?.VITE_SITE_URL as string | undefined) ?? "http://localhost:5173";

export function buildShareText(
  score: number,
  selection: Selection,
  language: Language,
  url = SITE_URL,
): string {
  const d = dictionaries[language];
  const text = d["share.text"]
    .replace("{score}", String(score))
    .replace("{category}", d[`category.${selection.category}`])
    .replace("{metric}", d[`metric.${selection.metric}`])
    .replace("{difficulty}", d[`difficulty.${selection.difficulty}`]);
  return `${text} ${url}`;
}

export type ShareResult = "shared" | "copied" | "failed" | "cancelled";

export async function share(
  text: string,
  nav: Pick<Navigator, "share" | "clipboard"> | undefined = typeof navigator === "undefined"
    ? undefined
    : navigator,
): Promise<ShareResult> {
  if (nav?.share) {
    try {
      await nav.share({ text });
      return "shared";
    } catch (error) {
      // the player closed the share sheet: not an error, and no reason to copy behind their back
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    }
  }
  try {
    if (nav?.clipboard?.writeText) {
      await nav.clipboard.writeText(text);
      return "copied";
    }
  } catch {
    // fall through
  }
  return "failed";
}
