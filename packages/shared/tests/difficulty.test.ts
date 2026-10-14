import { describe, expect, it } from "vitest";
import { classify } from "../src";

describe("classify", () => {
  it("ratio boundaries", () => {
    expect(classify(100, 301, "passengers")).toBe("easy");
    expect(classify(100, 300, "passengers")).toBe("medium");
    expect(classify(100, 150, "passengers")).toBe("medium");
    expect(classify(100, 149, "passengers")).toBe("hard");
    expect(classify(300, 100, "destinations")).toBe("medium");
  });
  it("year difference boundaries", () => {
    expect(classify(1900, 1931, "founded")).toBe("easy");
    expect(classify(1900, 1930, "founded")).toBe("medium");
    expect(classify(1900, 1910, "founded")).toBe("medium");
    expect(classify(1900, 1909, "founded")).toBe("hard");
  });
  it("equal values have no difficulty", () => {
    expect(classify(5, 5, "runways")).toBeNull();
  });
});
