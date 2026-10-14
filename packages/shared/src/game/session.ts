import type { Item } from "../schemas/item";
import type { Selection } from "../schemas/storage";
import { itemsWithMetric, pairKey, pickChallenger, pickStart, type Random } from "./pairs";

export type Guess = "higher" | "lower";

export interface Session {
  selection: Selection;
  pool: Item[];
  current: Item;
  challenger: Item;
  score: number;
  usedPairs: ReadonlySet<string>;
  phase: "answering" | "revealing" | "over";
  /** Result of the last answer, set while revealing and when over. */
  lastCorrect: boolean | null;
  won: boolean;
}

export function startSession(items: Item[], selection: Selection, random: Random): Session | null {
  const pool = itemsWithMetric(items, selection.metric);
  const start = pickStart(pool, selection.metric, selection.difficulty, random);
  if (!start) return null;
  return {
    selection,
    pool,
    current: start.visible,
    challenger: start.challenger,
    score: 0,
    usedPairs: new Set([pairKey(start.visible, start.challenger)]),
    phase: "answering",
    lastCorrect: null,
    won: false,
  };
}

export function isCorrect(
  current: Item,
  challenger: Item,
  guess: Guess,
  metric: Selection["metric"],
) {
  const a = current.metrics[metric];
  const b = challenger.metrics[metric];
  if (a === undefined || b === undefined || a === b) return false;
  return guess === "higher" ? b > a : b < a;
}

/** Locks the answer. A wrong answer ends the game; a right one adds a point. */
export function answer(session: Session, guess: Guess): Session {
  if (session.phase !== "answering") return session;
  const correct = isCorrect(session.current, session.challenger, guess, session.selection.metric);
  return {
    ...session,
    phase: correct ? "revealing" : "over",
    score: correct ? session.score + 1 : session.score,
    lastCorrect: correct,
  };
}

/** After the reveal: the challenger becomes visible; ends as a win if no pair is left. */
export function advance(session: Session, random: Random): Session {
  if (session.phase !== "revealing") return session;
  const { metric, difficulty } = session.selection;
  const next = pickChallenger(
    session.pool,
    session.challenger,
    metric,
    difficulty,
    session.usedPairs,
    random,
  );
  if (!next) return { ...session, phase: "over", won: true };
  return {
    ...session,
    current: session.challenger,
    challenger: next,
    usedPairs: new Set([...session.usedPairs, pairKey(session.challenger, next)]),
    phase: "answering",
    lastCorrect: null,
  };
}
