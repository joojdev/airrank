import { describe, expect, it } from "vitest";
import { advance, answer, startSession, type Item, type Selection } from "../src";
import { makeItem, seeded } from "./helpers";

const sel: Selection = { category: "airport", metric: "passengers", difficulty: "easy" };
// values 1, 10, 100, 1000: every pair differs by more than 3x
const items = [1, 10, 100, 1000].map((v) => makeItem(`i${v}`, v));

describe("pair generation", () => {
  it("matches difficulty and never pairs equal values", () => {
    const dup = [...items, makeItem("dup", 10)];
    const s = startSession(dup, sel, seeded(3))!;
    const a = s.current.metrics.passengers!;
    const b = s.challenger.metrics.passengers!;
    expect(a).not.toBe(b);
    expect(Math.max(a, b) / Math.min(a, b)).toBeGreaterThan(3);
  });
  it("returns null when no pair matches", () => {
    expect(startSession(items, { ...sel, difficulty: "hard" }, seeded())).toBeNull();
  });
  it("never repeats a pair and the revealed item becomes visible", () => {
    const rng = seeded(7);
    let s = startSession(items, sel, rng)!;
    const seen = new Set<string>();
    for (let guard = 0; guard < 20 && s.phase !== "over"; guard++) {
      const pair = [s.current.id, s.challenger.id].sort().join("|");
      expect(seen.has(pair)).toBe(false);
      seen.add(pair);
      const next: Item = s.challenger;
      const higher = s.challenger.metrics.passengers! > s.current.metrics.passengers!;
      s = answer(s, higher ? "higher" : "lower");
      s = advance(s, rng);
      if (s.phase === "answering") expect(s.current.id).toBe(next.id);
    }
    expect(s.phase).toBe("over");
  });
  it("ends as a win when the pool is exhausted", () => {
    const rng = seeded(2);
    const two = [makeItem("a", 1), makeItem("b", 100)];
    let s = startSession(two, sel, rng)!;
    const higher = s.challenger.metrics.passengers! > s.current.metrics.passengers!;
    s = advance(answer(s, higher ? "higher" : "lower"), rng);
    expect(s.phase).toBe("over");
    expect(s.won).toBe(true);
    expect(s.score).toBe(1);
  });
});
