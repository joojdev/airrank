import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildCoverage,
  buildManifest,
  capPerCategory,
  keepOffered,
  offeredMetrics,
} from "../src/pipeline/coverage";
import { assignIds, itemId } from "../src/pipeline/normalize";
import { buildPending } from "../src/pipeline/pending";
import {
  isFreeLicense,
  parsePhotos,
  type CommonsResponse,
  type PhotoResult,
} from "../src/sources/commons";
import { validateDataset } from "../src/validate";
import type { Candidate } from "../src/types";

const cand = (over: Partial<Candidate> & { id: string }): Candidate => ({
  category: "airport",
  wikidataId: over.id,
  name: over.id,
  code: over.id.toUpperCase(),
  country: "BR",
  metrics: { passengers: 100 },
  imageFile: `${over.id}.jpg`,
  fame: 1,
  ...over,
});

describe("coverage", () => {
  const eligible = Array.from({ length: 5 }, (_, i) =>
    cand({
      id: `a${i}`,
      metrics: i < 4 ? { passengers: 10 + i, runways: 3000 } : { runways: 2000 },
    }),
  );

  it("excludes an item from a metric it has no value for, not from the others", () => {
    const report = buildCoverage(eligible, eligible, 1);
    expect(report.passengers?.withValue).toBe(4);
    expect(report.runways?.withValue).toBe(5);
  });
  it("leaves metrics below the minimum out of the manifest and strips them", () => {
    const report = buildCoverage(eligible, eligible, 5);
    const offered = offeredMetrics(report);
    expect(offered).toEqual(["runways"]);
    const kept = keepOffered(eligible, offered);
    expect(kept.every((c) => Object.keys(c.metrics).join() === "runways")).toBe(true);
    const manifest = buildManifest(
      kept.map((c) => ({ category: c.category, metrics: c.metrics })),
      offered,
      5,
      "2026-01-01T00:00:00.000Z",
    );
    expect(manifest.metrics).toEqual([{ id: "runways", itemCount: 5 }]);
  });
  it("drops candidates whose only metric is not offered", () => {
    const only = [cand({ id: "z", metrics: { passengers: 5 } })];
    expect(keepOffered(only, ["runways"])).toEqual([]);
  });
});

describe("cap", () => {
  it("keeps the best-known items per category, deterministically", () => {
    const list = [
      cand({ id: "a", fame: 5 }),
      cand({ id: "b", fame: 9 }),
      cand({ id: "c", fame: 9 }),
      cand({ id: "x", category: "airline", fame: 1 }),
    ];
    expect(capPerCategory(list, 2).map((c) => c.wikidataId)).toEqual(["b", "c", "x"]);
  });
});

describe("pending list and Commons", () => {
  const files = JSON.parse(
    readFileSync(new URL("../fixtures/commons-files.json", import.meta.url), "utf8"),
  ) as string[];
  const response = JSON.parse(
    readFileSync(new URL("../fixtures/commons.json", import.meta.url), "utf8"),
  ) as CommonsResponse;
  const photos = parsePhotos(files, response);

  it("resolves author and license from real Commons metadata", () => {
    const ok = [...photos.values()].filter((p) => p.ok);
    expect(ok.length).toBeGreaterThan(0);
    for (const p of ok) {
      if (!p.ok) continue;
      expect(p.photo.author).not.toMatch(/</);
      expect(p.photo.author.length).toBeGreaterThan(0);
      expect(p.photo.license.length).toBeGreaterThan(0);
      expect(p.photo.downloadUrl).toMatch(/^https:/);
    }
  });
  it("marks a missing file as no-photo", () => {
    expect(photos.get("This_file_does_not_exist_zzz.jpg")).toEqual({
      ok: false,
      reason: "no-photo",
    });
  });
  it("accepts free licenses and rejects non-free ones", () => {
    for (const l of ["CC BY 4.0", "CC BY-SA 3.0", "CC0", "Public domain", "GFDL 1.2"])
      expect(isFreeLicense(l)).toBe(true);
    for (const l of ["CC BY-NC 4.0", "CC BY-ND 2.0", "Fair use", ""])
      expect(isFreeLicense(l)).toBe(false);
  });
  it("builds the pending list with reasons and keeps metrics", () => {
    const results = new Map<string, PhotoResult>([
      ["good.jpg", photos.get(files.find((f) => photos.get(f)?.ok)!)!],
      ["bad.jpg", { ok: false, reason: "unfree-license" }],
    ]);
    const candidates = [
      cand({ id: "good", imageFile: "good.jpg" }),
      cand({ id: "bad", imageFile: "bad.jpg" }),
      cand({ id: "none", imageFile: null }),
    ];
    const { pending, photographed } = buildPending(candidates, results);
    expect(photographed.map((c) => c.wikidataId)).toEqual(["good"]);
    expect(pending.map((p) => [p.wikidataId, p.reason])).toEqual([
      ["bad", "unfree-license"],
      ["none", "no-photo"],
    ]);
    expect(pending[0]!.metrics).toEqual({ passengers: 100 });
  });
});

describe("ids", () => {
  it("builds stable ids and disambiguates repeats deterministically", () => {
    expect(itemId(cand({ id: "x", code: "GRU" }))).toBe("apt-gru");
    expect(itemId(cand({ id: "x", category: "airline", name: "Aeroméxico Connect" }))).toBe(
      "air-aeromexico-connect",
    );
    const a = cand({ id: "Q2", category: "airline", name: "Same" });
    const b = cand({ id: "Q1", category: "airline", name: "Same" });
    const ids = assignIds([a, b]);
    expect(ids.get(b)).toBe("air-same");
    expect(ids.get(a)).toBe("air-same-q2");
  });
});

describe("validateDataset", () => {
  const item = {
    id: "apt-gru",
    category: "airport",
    name: "GRU",
    code: "GRU",
    country: "BR",
    photo: {
      widths: [480],
      formats: ["webp"],
      author: "a",
      license: "CC BY 4.0",
      licenseUrl: "https://x.test/l",
      sourceUrl: "https://x.test/s",
      width: 480,
      height: 320,
    },
    metrics: { passengers: 5 },
  };
  const manifest = {
    schemaVersion: 1,
    generatedAt: "2026-01-01T00:00:00.000Z",
    categories: {
      airport: { file: "a.json", itemCount: 1 },
      airline: { file: "b.json", itemCount: 0 },
    },
    metrics: [{ id: "passengers", itemCount: 1 }],
    minimumItems: 1,
  };
  const run = (items: unknown[], exists = true, m: unknown = manifest) =>
    validateDataset(m, { "a.json": items, "b.json": [] }, () => exists);

  it("accepts a valid dataset", () => expect(run([item])).toEqual([]));
  it("fails on a missing image file", () => expect(run([item], false)).not.toEqual([]));
  it("fails on a corrupted item", () =>
    expect(run([{ ...item, metrics: { passengers: -1 } }])).not.toEqual([]));
  it("fails on a wrong manifest count", () => {
    expect(
      run([item], true, { ...manifest, metrics: [{ id: "passengers", itemCount: 9 }] }),
    ).not.toEqual([]);
  });
  it("fails on a duplicate id", () => {
    const m = {
      ...manifest,
      categories: { ...manifest.categories, airport: { file: "a.json", itemCount: 2 } },
      metrics: [{ id: "passengers", itemCount: 2 }],
    };
    expect(run([item, item], true, m)).toContain("apt-gru: duplicate id");
  });
});
