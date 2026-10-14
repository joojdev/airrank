import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadBest,
  loadLanguage,
  loadSelection,
  loadTheme,
  saveBest,
  saveSelection,
  saveTheme,
} from "../src/storage/storage";
import { stubBrokenStorage, stubStorage } from "./helpers";

afterEach(() => vi.unstubAllGlobals());

describe("storage", () => {
  it("treats invalid JSON and wrong shapes as absent", () => {
    stubStorage({ "agg:selection": "{not json", "agg:language": '"fr"', "agg:best": "[1]" });
    expect(loadSelection()).toBeNull();
    expect(loadLanguage()).toBeNull();
    expect(loadBest()).toEqual({});
  });
  it("keeps a saved theme and ignores an unknown one", () => {
    stubStorage();
    saveTheme("dark");
    expect(loadTheme()).toBe("dark");
    stubStorage({ "agg:theme": '"sepia"' });
    expect(loadTheme()).toBeNull();
  });
  it("does not throw when localStorage throws", () => {
    stubBrokenStorage();
    expect(() => saveBest({ a: 1 })).not.toThrow();
    expect(loadBest()).toEqual({});
    expect(loadSelection()).toBeNull();
  });
  it("round-trips values with category/metric/difficulty keys", () => {
    const data = stubStorage();
    saveBest({ "airport/passengers/hard": 7 });
    expect(loadBest()).toEqual({ "airport/passengers/hard": 7 });
    saveSelection({ category: "airline", metric: "destinations", difficulty: "easy" });
    expect(JSON.parse(data.get("agg:selection")!)).toEqual({
      category: "airline",
      metric: "destinations",
      difficulty: "easy",
    });
  });
});
