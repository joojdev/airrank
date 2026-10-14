import type { Category, MetricId } from "../schemas/item";

export interface MetricConfig {
  id: MetricId;
  category: Category;
  isDefault: boolean;
  unit: string | null;
  comparison: "ratio" | "difference";
  /** i18n keys for the two answer buttons. */
  answerLabels: { higher: string; lower: string };
}

export const METRICS: readonly MetricConfig[] = [
  {
    id: "passengers",
    category: "airport",
    isDefault: true,
    unit: null,
    comparison: "ratio",
    answerLabels: { higher: "answer.more", lower: "answer.less" },
  },
  {
    id: "runways",
    category: "airport",
    isDefault: false,
    unit: null,
    comparison: "ratio",
    answerLabels: { higher: "answer.more", lower: "answer.less" },
  },
  {
    id: "airlines",
    category: "airport",
    isDefault: false,
    unit: null,
    comparison: "ratio",
    answerLabels: { higher: "answer.more", lower: "answer.less" },
  },
  {
    id: "destinations",
    category: "airline",
    isDefault: true,
    unit: null,
    comparison: "ratio",
    answerLabels: { higher: "answer.more", lower: "answer.less" },
  },
  {
    id: "countries",
    category: "airline",
    isDefault: false,
    unit: null,
    comparison: "ratio",
    answerLabels: { higher: "answer.more", lower: "answer.less" },
  },
  {
    id: "founded",
    category: "airline",
    isDefault: false,
    unit: null,
    comparison: "difference",
    answerLabels: { higher: "answer.newer", lower: "answer.older" },
  },
];

export function getMetric(id: MetricId): MetricConfig {
  const metric = METRICS.find((m) => m.id === id);
  if (!metric) throw new Error(`unknown metric ${id}`);
  return metric;
}
