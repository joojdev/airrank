import {
  METRICS,
  SCHEMA_VERSION,
  type CoverageReport,
  type Manifest,
  type MetricId,
} from "@agg/shared";
import type { Candidate } from "../types";

/**
 * Coverage per metric. `photographed` are the candidates that have a usable photo. A metric
 * is offered only if enough photographed candidates carry a value (FR-028).
 */
export function buildCoverage(
  eligible: Candidate[],
  photographed: Candidate[],
  minimumItems: number,
): CoverageReport {
  const report = {} as CoverageReport;
  for (const metric of METRICS) {
    const inCategory = eligible.filter((c) => c.category === metric.category);
    const withValue = inCategory.filter((c) => c.metrics[metric.id] !== undefined).length;
    const withPhoto = photographed.filter((c) => c.metrics[metric.id] !== undefined).length;
    report[metric.id] = {
      eligible: inCategory.length,
      withValue,
      withPhoto,
      final: withPhoto,
      meetsMinimum: withPhoto >= minimumItems,
    };
  }
  return report;
}

export const offeredMetrics = (report: CoverageReport): MetricId[] =>
  METRICS.filter((m) => report[m.id]?.meetsMinimum).map((m) => m.id);

/** Removes metrics that are not offered and drops candidates left with none. */
export function keepOffered(candidates: Candidate[], offered: MetricId[]): Candidate[] {
  const keep = new Set(offered);
  return candidates
    .map((c) => ({
      ...c,
      metrics: Object.fromEntries(
        Object.entries(c.metrics).filter(([id]) => keep.has(id as MetricId)),
      ),
    }))
    .filter((c) => Object.keys(c.metrics).length > 0);
}

export function buildManifest(
  items: { category: string; metrics: Partial<Record<MetricId, number>> }[],
  offered: MetricId[],
  minimumItems: number,
  generatedAt: string,
): Manifest {
  const count = (category: string) => items.filter((i) => i.category === category).length;
  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt,
    categories: {
      airport: { file: "items-airport.json", itemCount: count("airport") },
      airline: { file: "items-airline.json", itemCount: count("airline") },
    },
    metrics: offered.map((id) => ({
      id,
      itemCount: items.filter((i) => i.metrics[id] !== undefined).length,
    })),
    minimumItems,
  };
}

export function formatCoverage(report: CoverageReport): string {
  const lines = ["metric       eligible  value  photo  final  offered"];
  for (const m of METRICS) {
    const r = report[m.id]!;
    lines.push(
      `${m.id.padEnd(12)} ${String(r.eligible).padStart(8)} ${String(r.withValue).padStart(6)} ${String(r.withPhoto).padStart(6)} ${String(r.final).padStart(6)}  ${r.meetsMinimum ? "yes" : "no"}`,
    );
  }
  return lines.join("\n");
}

/** Keeps the best-known `max` candidates per category, deterministically. */
export function capPerCategory(candidates: Candidate[], max: number): Candidate[] {
  const byFame = (a: Candidate, b: Candidate) =>
    b.fame - a.fame || a.wikidataId.localeCompare(b.wikidataId, "en", { numeric: true });
  return (["airport", "airline"] as const).flatMap((category) =>
    candidates
      .filter((c) => c.category === category)
      .sort(byFame)
      .slice(0, max),
  );
}
