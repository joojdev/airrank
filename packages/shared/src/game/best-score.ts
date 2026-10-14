import type { BestScores, Selection } from "../schemas/storage";

export function bestKey(s: Selection): string {
  return `${s.category}/${s.metric}/${s.difficulty}`;
}

export function updateBest(best: BestScores, key: string, score: number): BestScores {
  return score > (best[key] ?? 0) ? { ...best, [key]: score } : best;
}
