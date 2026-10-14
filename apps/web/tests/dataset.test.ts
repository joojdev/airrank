import { ItemSchema, ManifestSchema } from "@agg/shared";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { z } from "zod";

const pub = new URL("../public/", import.meta.url).pathname;
const readJson = (p: string): unknown => JSON.parse(readFileSync(`${pub}${p}`, "utf8"));

describe("committed dataset", () => {
  const manifest = ManifestSchema.parse(readJson("data/manifest.json"));

  it("validates against the shared schemas and has unique ids", () => {
    const ids = new Set<string>();
    for (const [category, entry] of Object.entries(manifest.categories)) {
      const items = z.array(ItemSchema).parse(readJson(`data/${entry.file}`));
      expect(items.length).toBe(entry.itemCount);
      for (const item of items) {
        expect(item.category).toBe(category);
        expect(ids.has(item.id)).toBe(false);
        ids.add(item.id);
      }
    }
  });

  it("has every referenced image file and matching metric counts", () => {
    const counts: Record<string, number> = {};
    for (const entry of Object.values(manifest.categories)) {
      for (const item of z.array(ItemSchema).parse(readJson(`data/${entry.file}`))) {
        for (const w of item.photo.widths)
          for (const f of item.photo.formats)
            expect(existsSync(`${pub}img/${item.id}/${w}.${f}`)).toBe(true);
        for (const m of Object.keys(item.metrics)) counts[m] = (counts[m] ?? 0) + 1;
      }
    }
    for (const m of manifest.metrics) expect(counts[m.id]).toBe(m.itemCount);
  });
});
