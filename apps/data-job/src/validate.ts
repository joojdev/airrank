import { ItemSchema, ManifestSchema, SCHEMA_VERSION, type Item, type Manifest } from "@agg/shared";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";

/** Returns a list of problems; an empty list means the output satisfies the dataset contract. */
export function validateDataset(
  manifestInput: unknown,
  itemsByFile: Record<string, unknown>,
  imageExists: (path: string) => boolean,
): string[] {
  const errors: string[] = [];
  const manifest = ManifestSchema.safeParse(manifestInput);
  if (!manifest.success) return [`manifest: ${manifest.error.message}`];
  const m: Manifest = manifest.data;
  if (m.schemaVersion !== SCHEMA_VERSION)
    errors.push(`unsupported schemaVersion ${m.schemaVersion}`);

  const ids = new Set<string>();
  const metricCounts = new Map<string, number>();
  for (const [category, entry] of Object.entries(m.categories)) {
    const parsed = z.array(ItemSchema).safeParse(itemsByFile[entry.file]);
    if (!parsed.success) {
      errors.push(`${entry.file}: ${parsed.error.message}`);
      continue;
    }
    const items: Item[] = parsed.data;
    if (items.length !== entry.itemCount)
      errors.push(`${entry.file}: itemCount ${entry.itemCount} != ${items.length}`);
    const offered = new Set(m.metrics.map((x) => x.id));
    for (const item of items) {
      if (item.category !== category)
        errors.push(`${item.id}: category ${item.category} in ${entry.file}`);
      if (ids.has(item.id)) errors.push(`${item.id}: duplicate id`);
      ids.add(item.id);
      for (const metric of Object.keys(item.metrics)) {
        if (!offered.has(metric as never))
          errors.push(`${item.id}: metric ${metric} is not offered`);
        metricCounts.set(metric, (metricCounts.get(metric) ?? 0) + 1);
      }
      for (const w of item.photo.widths)
        for (const f of item.photo.formats) {
          if (!imageExists(`${item.id}/${w}.${f}`))
            errors.push(`${item.id}: missing image ${w}.${f}`);
        }
    }
  }
  for (const metric of m.metrics) {
    const actual = metricCounts.get(metric.id) ?? 0;
    if (actual !== metric.itemCount)
      errors.push(`metric ${metric.id}: itemCount ${metric.itemCount} != ${actual}`);
    if (metric.itemCount < m.minimumItems) errors.push(`metric ${metric.id}: below minimumItems`);
  }
  return errors;
}

export const PUBLIC_DIR = fileURLToPath(new URL("../../web/public", import.meta.url));

export function validateOnDisk(publicDir = PUBLIC_DIR): string[] {
  const readJson = (p: string): unknown => JSON.parse(readFileSync(`${publicDir}/${p}`, "utf8"));
  try {
    const manifest = readJson("data/manifest.json");
    const files = ["items-airport.json", "items-airline.json"];
    const itemsByFile = Object.fromEntries(files.map((f) => [f, readJson(`data/${f}`)]));
    return validateDataset(manifest, itemsByFile, (p) => existsSync(`${publicDir}/img/${p}`));
  } catch (error) {
    return [String(error)];
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const errors = validateOnDisk();
  if (errors.length) {
    console.error(errors.slice(0, 50).join("\n"));
    console.error(`${errors.length} problem(s)`);
    process.exit(1);
  }
  console.log("dataset valid");
}
