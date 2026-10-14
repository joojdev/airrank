import type { Difficulty, Item, MetricId } from "../schemas/item";
import { matchesDifficulty } from "./difficulty";

export type Random = () => number;

export function pairKey(a: Item, b: Item): string {
  return a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
}

function pick<T>(list: T[], random: Random): T | undefined {
  return list[Math.floor(random() * list.length)];
}

export function itemsWithMetric(items: Item[], metric: MetricId): Item[] {
  return items.filter((i) => i.metrics[metric] !== undefined);
}

/** Picks an unused challenger for `visible` matching the difficulty, or null. */
export function pickChallenger(
  pool: Item[],
  visible: Item,
  metric: MetricId,
  difficulty: Difficulty,
  usedPairs: ReadonlySet<string>,
  random: Random,
): Item | null {
  const base = visible.metrics[metric];
  if (base === undefined) return null;
  const candidates = pool.filter((c) => {
    const value = c.metrics[metric];
    return (
      c.id !== visible.id &&
      value !== undefined &&
      !usedPairs.has(pairKey(visible, c)) &&
      matchesDifficulty(base, value, metric, difficulty)
    );
  });
  return pick(candidates, random) ?? null;
}

/** Picks a starting visible item that has at least one challenger. */
export function pickStart(
  pool: Item[],
  metric: MetricId,
  difficulty: Difficulty,
  random: Random,
): { visible: Item; challenger: Item } | null {
  const shuffled = [...pool].sort(() => random() - 0.5);
  for (const visible of shuffled) {
    const challenger = pickChallenger(pool, visible, metric, difficulty, new Set(), random);
    if (challenger) return { visible, challenger };
  }
  return null;
}
