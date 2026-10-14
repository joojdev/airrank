import { DIFFICULTY_THRESHOLDS } from "../config/difficulty";
import { getMetric } from "../config/metrics";
import type { Difficulty, MetricId } from "../schemas/item";

/** Difficulty of comparing two values; null when equal (never paired). */
export function classify(a: number, b: number, metric: MetricId): Difficulty | null {
  if (a === b) return null;
  if (getMetric(metric).comparison === "difference") {
    const diff = Math.abs(a - b);
    const t = DIFFICULTY_THRESHOLDS.difference;
    return diff > t.easy ? "easy" : diff >= t.medium ? "medium" : "hard";
  }
  const ratio = Math.max(a, b) / Math.min(a, b);
  const t = DIFFICULTY_THRESHOLDS.ratio;
  return ratio > t.easy ? "easy" : ratio >= t.medium ? "medium" : "hard";
}

export function matchesDifficulty(
  a: number,
  b: number,
  metric: MetricId,
  difficulty: Difficulty,
): boolean {
  return classify(a, b, metric) === difficulty;
}
