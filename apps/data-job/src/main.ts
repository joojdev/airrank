import { MINIMUM_ITEMS, type Item } from "@agg/shared";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { processImage } from "./images/process";
import { airlineCandidates, airportCandidates } from "./pipeline/eligibility";
import {
  buildCoverage,
  buildManifest,
  capPerCategory,
  formatCoverage,
  keepOffered,
  offeredMetrics,
} from "./pipeline/coverage";
import { assignIds, sortItems, toItem } from "./pipeline/normalize";
import { buildPending } from "./pipeline/pending";
import { resolvePhotos } from "./sources/commons";
import { fetchOurAirports } from "./sources/ourairports";
import { fetchRouteStats } from "./sources/routes";
import { fetchAirlines, fetchAirports } from "./sources/wikidata";
import { PUBLIC_DIR, validateDataset, validateOnDisk } from "./validate";

const MAX_PER_CATEGORY = Number(process.env.MAX_PER_CATEGORY ?? 250);
const CACHE_DIR = fileURLToPath(new URL("../.cache", import.meta.url));
const PENDING_PATH = fileURLToPath(new URL("../pending.json", import.meta.url));
const json = (v: unknown) => JSON.stringify(v, null, 2) + "\n";

async function mapLimit<T, R>(list: T[], limit: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(list.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (next < list.length) {
        const i = next++;
        out[i] = await fn(list[i]!);
      }
    }),
  );
  return out;
}

/** Caches a network step on disk so an interrupted run resumes fast. `--refresh` ignores it. */
async function cachedStep<T>(name: string, produce: () => Promise<T>): Promise<T> {
  const path = `${CACHE_DIR}/${name}.json`;
  if (!process.argv.includes("--refresh") && existsSync(path)) {
    console.log(`using cached ${name}`);
    return JSON.parse(readFileSync(path, "utf8")) as T;
  }
  const value = await produce();
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(path, JSON.stringify(value));
  return value;
}

async function main() {
  console.log("fetching sources...");
  const [airports, airlines, ourairports, routes] = await Promise.all([
    cachedStep("wikidata-airports", () => fetchAirports()),
    cachedStep("wikidata-airlines", () => fetchAirlines()),
    fetchOurAirports(CACHE_DIR),
    fetchRouteStats(CACHE_DIR),
  ]);
  const eligible = [
    ...airportCandidates(airports, ourairports, routes),
    ...airlineCandidates(airlines, routes),
  ];
  console.log(`eligible candidates: ${eligible.length}`);

  console.log("resolving Commons photos...");
  const photoEntries = await cachedStep("commons-photos", async () => [
    ...(await resolvePhotos(eligible.flatMap((c) => (c.imageFile ? [c.imageFile] : [])))),
  ]);
  const photos = new Map(photoEntries);
  const { pending, photographed: allPhotographed } = buildPending(eligible, photos);
  // keep the dataset near the 50-100 MB image budget: best-known items first
  const photographed = capPerCategory(allPhotographed, MAX_PER_CATEGORY);

  const coverage = buildCoverage(eligible, photographed, MINIMUM_ITEMS);
  const offered = offeredMetrics(coverage);
  console.log(formatCoverage(coverage));

  const finalCandidates = keepOffered(photographed, offered);
  const ids = assignIds(finalCandidates);

  console.log(`processing ${finalCandidates.length} images...`);
  const imgDir = `${PUBLIC_DIR}/img`;
  const built = await mapLimit(finalCandidates, 4, async (c): Promise<Item | null> => {
    const id = ids.get(c)!;
    const result = photos.get(c.imageFile!);
    if (!result?.ok) return null;
    try {
      return toItem(c, result.photo, await processImage(id, result.photo.downloadUrl, imgDir), id);
    } catch (error) {
      console.warn(`skipping ${id}: ${error}`);
      return null;
    }
  });
  const items = sortItems(built.filter((i): i is Item => i !== null));

  // recompute offered metrics in case image failures dropped items below the minimum
  const manifest = buildManifest(items, offered, MINIMUM_ITEMS, new Date().toISOString());
  const files: Record<string, Item[]> = {
    "items-airport.json": items.filter((i) => i.category === "airport"),
    "items-airline.json": items.filter((i) => i.category === "airline"),
  };
  const errors = validateDataset(manifest, files, (p) => existsSync(`${imgDir}/${p}`));
  if (errors.length) {
    console.error(errors.slice(0, 50).join("\n"));
    console.error("validation failed; nothing written");
    process.exit(1);
  }

  mkdirSync(`${PUBLIC_DIR}/data`, { recursive: true });
  for (const [file, list] of Object.entries(files))
    writeFileSync(`${PUBLIC_DIR}/data/${file}`, json(list));
  writeFileSync(`${PUBLIC_DIR}/data/manifest.json`, json(manifest));
  writeFileSync(PENDING_PATH, json(pending));
  console.log(`wrote ${items.length} items, ${pending.length} pending`);

  const after = validateOnDisk();
  if (after.length) {
    console.error(after.join("\n"));
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
