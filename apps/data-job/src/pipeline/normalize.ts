import { ItemSchema, type Item } from "@agg/shared";
import type { CommonsPhoto } from "../sources/commons";
import type { Candidate } from "../types";

export interface ProcessedPhoto {
  widths: number[];
  formats: ("avif" | "webp")[];
  width: number;
  height: number;
}

const slug = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function itemId(c: Candidate): string {
  return c.category === "airport" ? `apt-${slug(c.code)}` : `air-${slug(c.name)}`;
}

export function toItem(
  c: Candidate,
  commons: CommonsPhoto,
  processed: ProcessedPhoto,
  id = itemId(c),
): Item {
  return ItemSchema.parse({
    id,
    category: c.category,
    name: c.name,
    code: c.code,
    country: c.country && /^[A-Z]{2}$/.test(c.country) ? c.country : null,
    photo: {
      widths: processed.widths,
      formats: processed.formats,
      author: commons.author,
      license: commons.license,
      licenseUrl: commons.licenseUrl,
      sourceUrl: commons.sourceUrl,
      width: processed.width,
      height: processed.height,
    },
    metrics: c.metrics,
  });
}

/** Stable ids: a repeated id gets the Wikidata id appended so the output stays deterministic. */
export function assignIds(candidates: Candidate[]): Map<Candidate, string> {
  const ids = new Map<Candidate, string>();
  const used = new Set<string>();
  for (const c of [...candidates].sort((a, b) =>
    a.wikidataId.localeCompare(b.wikidataId, "en", { numeric: true }),
  )) {
    let id = itemId(c);
    if (used.has(id)) id = `${id}-${c.wikidataId.toLowerCase()}`;
    used.add(id);
    ids.set(c, id);
  }
  return ids;
}

export const sortItems = (items: Item[]): Item[] =>
  [...items].sort((a, b) => a.id.localeCompare(b.id, "en"));
