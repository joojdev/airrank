import { existsSync, mkdirSync } from "node:fs";
import sharp from "sharp";
import { politeFetch, type Fetcher } from "../http";
import type { ProcessedPhoto } from "../pipeline/normalize";

export const TARGET_WIDTHS = [480, 960, 1600];
const FORMATS = ["avif", "webp"] as const;

/** Largest width of the variants already on disk, so reruns can skip the download. */
async function existingResult(dir: string, widths: number[]): Promise<ProcessedPhoto | null> {
  const present = widths.filter((w) => FORMATS.every((f) => existsSync(`${dir}/${w}.${f}`)));
  if (present.length === 0) return null;
  const largest = Math.max(...present);
  const meta = await sharp(`${dir}/${largest}.webp`).metadata();
  return {
    widths: present,
    formats: [...FORMATS],
    width: meta.width ?? largest,
    height: meta.height ?? 0,
  };
}

export async function processImage(
  itemId: string,
  downloadUrl: string,
  outDir: string,
  fetcher?: Fetcher,
): Promise<ProcessedPhoto> {
  const dir = `${outDir}/${itemId}`;
  const existing = await existingResult(dir, TARGET_WIDTHS);
  if (existing) return existing;

  const buffer = Buffer.from(await (await politeFetch(downloadUrl, {}, { fetcher })).arrayBuffer());
  const source = sharp(buffer).rotate();
  const meta = await source.metadata();
  const originalWidth = meta.width ?? 0;
  if (originalWidth === 0) throw new Error(`unreadable image for ${itemId}`);

  // never upscale: keep widths up to the source width, but always at least the smallest
  const widths = TARGET_WIDTHS.filter((w) => w <= originalWidth);
  if (widths.length === 0) widths.push(Math.min(originalWidth, TARGET_WIDTHS[0]!));

  mkdirSync(dir, { recursive: true });
  let height = 0;
  for (const width of widths) {
    const resized = source.clone().resize({ width, withoutEnlargement: true });
    const info = await resized.clone().webp({ quality: 75 }).toFile(`${dir}/${width}.webp`);
    await resized.clone().avif({ quality: 50, effort: 4 }).toFile(`${dir}/${width}.avif`);
    height = info.height;
  }
  return { widths, formats: [...FORMATS], width: Math.max(...widths), height };
}
