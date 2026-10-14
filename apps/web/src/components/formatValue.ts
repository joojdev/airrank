import { getMetric, type Language, type MetricId } from "@agg/shared";

export function formatValue(value: number, metric: MetricId, language: Language): string {
  if (metric === "founded") return String(value);
  const text = new Intl.NumberFormat(language).format(value);
  const unit = getMetric(metric).unit;
  return unit ? `${text} ${unit}` : text;
}
