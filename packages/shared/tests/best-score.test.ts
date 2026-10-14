import { describe, expect, it } from "vitest";
import { bestKey, updateBest } from "../src";

describe("updateBest", () => {
  it("higher replaces, lower or equal keeps", () => {
    expect(updateBest({ k: 5 }, "k", 6)).toEqual({ k: 6 });
    expect(updateBest({ k: 5 }, "k", 5)).toEqual({ k: 5 });
    expect(updateBest({ k: 5 }, "k", 2)).toEqual({ k: 5 });
  });
  it("is keyed by combination", () => {
    const key = bestKey({ category: "airport", metric: "passengers", difficulty: "hard" });
    expect(key).toBe("airport/passengers/hard");
    expect(updateBest({ other: 9 }, key, 3)).toEqual({ other: 9, [key]: 3 });
  });
});
