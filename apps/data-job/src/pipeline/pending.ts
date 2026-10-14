import { PendingItemSchema, type PendingItem } from "@agg/shared";
import type { PhotoResult } from "../sources/commons";
import type { Candidate } from "../types";
import { itemId } from "./normalize";

export function buildPending(
  candidates: Candidate[],
  photos: Map<string, PhotoResult>,
): { pending: PendingItem[]; photographed: Candidate[] } {
  const pending: PendingItem[] = [];
  const photographed: Candidate[] = [];
  for (const c of candidates) {
    const result = c.imageFile ? photos.get(c.imageFile) : undefined;
    if (result?.ok) {
      photographed.push(c);
      continue;
    }
    pending.push(
      PendingItemSchema.parse({
        id: itemId(c),
        category: c.category,
        name: c.name,
        code: c.code,
        wikidataId: c.wikidataId,
        reason: result && !result.ok ? result.reason : "no-photo",
        metrics: c.metrics,
      }),
    );
  }
  pending.sort((a, b) => a.id.localeCompare(b.id, "en"));
  return { pending, photographed };
}
