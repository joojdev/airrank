import { getMetric, METRICS } from "../config/metrics";
import type { Category, MetricId } from "../schemas/item";
import type { Manifest } from "../schemas/manifest";
import type { Selection } from "../schemas/storage";

export function metricsFor(category: Category, manifest: Manifest): MetricId[] {
  const offered = new Set(manifest.metrics.map((m) => m.id));
  return METRICS.filter((m) => m.category === category && offered.has(m.id)).map((m) => m.id);
}

/** Default metric if offered, else the only remaining one, else null. */
export function defaultMetric(category: Category, manifest: Manifest): MetricId | null {
  const available = metricsFor(category, manifest);
  const preferred = available.find((id) => getMetric(id).isDefault);
  return preferred ?? (available.length === 1 ? (available[0] ?? null) : null);
}

export function isSelectionValid(selection: Selection, manifest: Manifest): boolean {
  return (
    metricsFor(selection.category, manifest).includes(selection.metric) &&
    manifest.categories[selection.category] !== undefined
  );
}
