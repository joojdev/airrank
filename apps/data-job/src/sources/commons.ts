import { politeFetch, type Fetcher } from "../http";

const API = "https://commons.wikimedia.org/w/api.php";
export const MAX_THUMB_WIDTH = 1600;
/** Cards are cover-cropped panes; extreme panoramas and tall shots lose the subject. */
const ASPECT_RANGE = [0.6, 2.2] as const;

export interface CommonsPhoto {
  fileName: string;
  author: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
  /** URL to download: a 1600px thumbnail, or the original when smaller. */
  downloadUrl: string;
}

export type PhotoResult =
  | { ok: true; photo: CommonsPhoto }
  | { ok: false; reason: "no-photo" | "unfree-license" | "bad-aspect" };

interface ExtValue {
  value?: string;
}
interface ImageInfo {
  url?: string;
  thumburl?: string;
  width?: number;
  height?: number;
  descriptionurl?: string;
  extmetadata?: Record<string, ExtValue>;
}
interface Page {
  title: string;
  imageinfo?: ImageInfo[];
  missing?: string;
}
export interface CommonsResponse {
  query?: {
    pages?: Record<string, Page>;
    normalized?: { from: string; to: string }[];
  };
}

const FREE = /^(CC[ -]BY(?![ -](NC|ND))|CC0|Public domain|PD[ -]|GFDL|Attribution)/i;
const NON_FREE = /(\bNC\b|\bND\b|-NC|-ND|fair use|non-?free)/i;

export function isFreeLicense(name: string): boolean {
  return FREE.test(name) && !NON_FREE.test(name);
}

const stripHtml = (html: string) =>
  html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

const MAX_AUTHOR_LENGTH = 80;
/** Licence and usage boilerplate that Commons often appends to the Artist field. */
const BOILERPLATE =
  /\s*(Create the proper attribution|You are free|This image is in the public domain|This photo was taken by|Feel free to use|If you use this work|\(file log\)).*$/i;

/**
 * The Artist field is free-form HTML: besides the name it can hold whole licence notices, so
 * the credit shown on a card is reduced to the name and kept short.
 */
export function cleanAuthor(text: string): string {
  let author = text;
  const assumed = /^No machine-readable author provided\.\s*(.+?) assumed\b/i.exec(author);
  if (assumed) author = assumed[1]!;
  // a bare link is shown as its address, links inside a credit are dropped
  author = /^https?:\/\/\S+$/i.test(author.trim())
    ? author
        .trim()
        .replace(/^https?:\/\/(www\.)?/i, "")
        .replace(/\/$/, "")
    : author.replace(/\s*https?:\/\/\S+/gi, "");
  const uploader = /^(?:The )?original uploader was (.+?) at [\w. -]+Wikipedia/i.exec(author);
  if (uploader) author = uploader[1]!;
  author = author
    .replace(BOILERPLATE, "")
    .replace(/~\w+wiki\b/i, "")
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/, "")
    .replace(/^(Unknown author)+$/i, "Unknown author")
    .replace(/[\s:,;-]+$/, "")
    .trim();
  if (author.length > MAX_AUTHOR_LENGTH) {
    author = author.slice(0, MAX_AUTHOR_LENGTH).replace(/\s+\S*$/, "") + "…";
  }
  return author || "Unknown author";
}

export function parsePhotos(
  fileNames: string[],
  response: CommonsResponse,
): Map<string, PhotoResult> {
  const results = new Map<string, PhotoResult>();
  const normalized = new Map((response.query?.normalized ?? []).map((n) => [n.from, n.to]));
  const pages = new Map(Object.values(response.query?.pages ?? {}).map((p) => [p.title, p]));

  for (const fileName of fileNames) {
    const title = `File:${fileName}`;
    const page = pages.get(normalized.get(title) ?? title);
    const info = page?.imageinfo?.[0];
    if (!page || page.missing !== undefined || !info) {
      results.set(fileName, { ok: false, reason: "no-photo" });
      continue;
    }
    const meta = info.extmetadata ?? {};
    const license = meta.LicenseShortName?.value ?? "";
    const author = cleanAuthor(stripHtml(meta.Artist?.value ?? ""));
    if (!isFreeLicense(license) || !stripHtml(meta.Artist?.value ?? "")) {
      results.set(fileName, { ok: false, reason: "unfree-license" });
      continue;
    }
    const ratio = info.width && info.height ? info.width / info.height : null;
    if (ratio !== null && (ratio < ASPECT_RANGE[0] || ratio > ASPECT_RANGE[1])) {
      results.set(fileName, { ok: false, reason: "bad-aspect" });
      continue;
    }
    const sourceUrl =
      info.descriptionurl ?? `https://commons.wikimedia.org/wiki/${encodeURIComponent(title)}`;
    results.set(fileName, {
      ok: true,
      photo: {
        fileName,
        author,
        license,
        licenseUrl: meta.LicenseUrl?.value ?? sourceUrl,
        sourceUrl,
        downloadUrl: info.thumburl ?? info.url ?? "",
      },
    });
  }
  return results;
}

/** Resolves metadata for many file names, 40 per API request. */
export async function resolvePhotos(
  fileNames: string[],
  fetcher?: Fetcher,
): Promise<Map<string, PhotoResult>> {
  const all = new Map<string, PhotoResult>();
  const unique = [...new Set(fileNames)];
  for (let i = 0; i < unique.length; i += 40) {
    const batch = unique.slice(i, i + 40);
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      prop: "imageinfo",
      iiprop: "url|size|extmetadata",
      iiurlwidth: String(MAX_THUMB_WIDTH),
      titles: batch.map((f) => `File:${f}`).join("|"),
    });
    const response = await politeFetch(`${API}?${params}`, {}, { fetcher });
    for (const [k, v] of parsePhotos(batch, (await response.json()) as CommonsResponse))
      all.set(k, v);
  }
  return all;
}
