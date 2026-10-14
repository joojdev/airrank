import { describe, expect, it } from "vitest";
import { answer, isCorrect, type Session } from "../src";
import { makeItem } from "./helpers";

describe("answer", () => {
  const low = makeItem("low", 10);
  const high = makeItem("high", 100);
  const session = (current = low, challenger = high): Session => ({
    selection: { category: "airport", metric: "passengers", difficulty: "easy" },
    pool: [low, high],
    current,
    challenger,
    score: 0,
    usedPairs: new Set<string>(),
    phase: "answering",
    lastCorrect: null,
    won: false,
  });

  it("correct adds one and reveals", () => {
    const s = answer(session(), "higher");
    expect(s.score).toBe(1);
    expect(s.phase).toBe("revealing");
  });
  it("wrong ends the game", () => {
    const s = answer(session(), "lower");
    expect(s.score).toBe(0);
    expect(s.phase).toBe("over");
  });
  it("is locked outside the answering phase", () => {
    const s = answer(session(), "higher");
    expect(answer(s, "lower")).toBe(s);
  });
  it("newer maps to the later year", () => {
    const old = makeItem("old", 1950, "founded");
    const recent = makeItem("recent", 2005, "founded");
    expect(isCorrect(old, recent, "higher", "founded")).toBe(true);
    expect(isCorrect(recent, old, "higher", "founded")).toBe(false);
  });
});
