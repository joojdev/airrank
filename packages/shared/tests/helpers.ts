import { getMetric, type Item, type MetricId } from "../src";

export function makeItem(id: string, value: number, metric: MetricId = "passengers"): Item {
  const category = getMetric(metric).category;
  return {
    id,
    category,
    name: id,
    code: id.toUpperCase(),
    country: null,
    photo: {
      widths: [480],
      formats: ["webp"],
      author: "a",
      license: "CC BY 4.0",
      licenseUrl: "https://example.com/l",
      sourceUrl: "https://example.com/s",
      width: 480,
      height: 320,
    },
    metrics: { [metric]: value },
  };
}

export function seeded(seed = 1): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}
