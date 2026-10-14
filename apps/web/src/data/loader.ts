import {
  ItemSchema,
  ManifestSchema,
  SCHEMA_VERSION,
  type Category,
  type Item,
  type Manifest,
} from "@agg/shared";
import { z } from "zod";

export class DatasetError extends Error {}

type Fetcher = (url: string) => Promise<Response>;

const base = (): string =>
  typeof import.meta !== "undefined" ? (import.meta.env?.BASE_URL ?? "/") : "/";

async function getJson(url: string, fetcher: Fetcher): Promise<unknown> {
  let response: Response;
  try {
    response = await fetcher(url);
  } catch (cause) {
    throw new DatasetError(`failed to fetch ${url}`, { cause });
  }
  if (!response.ok) throw new DatasetError(`failed to fetch ${url}: ${response.status}`);
  try {
    return await response.json();
  } catch (cause) {
    throw new DatasetError(`invalid JSON in ${url}`, { cause });
  }
}

export async function loadManifest(fetcher: Fetcher = fetch, root = base()): Promise<Manifest> {
  const raw = await getJson(`${root}data/manifest.json`, fetcher);
  const parsed = ManifestSchema.safeParse(raw);
  if (!parsed.success) throw new DatasetError(`invalid manifest: ${parsed.error.message}`);
  if (parsed.data.schemaVersion !== SCHEMA_VERSION) {
    throw new DatasetError(`unsupported schemaVersion ${parsed.data.schemaVersion}`);
  }
  return parsed.data;
}

export async function loadItems(
  category: Category,
  manifest: Manifest,
  fetcher: Fetcher = fetch,
  root = base(),
): Promise<Item[]> {
  const entry = manifest.categories[category];
  if (!entry) throw new DatasetError(`category ${category} is not in the manifest`);
  const raw = await getJson(`${root}data/${entry.file}`, fetcher);
  const parsed = z.array(ItemSchema).safeParse(raw);
  if (!parsed.success) throw new DatasetError(`invalid items: ${parsed.error.message}`);
  return parsed.data;
}
