import { describe, expect, it } from "vitest";
import { defaultMetric, isSelectionValid, metricsFor, type Manifest } from "../src";

const manifest = (ids: Manifest["metrics"]): Manifest => ({
  schemaVersion: 1,
  generatedAt: "2026-01-01T00:00:00.000Z",
  categories: {
    airport: { file: "items-airport.json", itemCount: 200 },
    airline: { file: "items-airline.json", itemCount: 200 },
  },
  metrics: ids,
  minimumItems: 150,
});
const all = manifest([
  { id: "passengers", itemCount: 200 },
  { id: "runways", itemCount: 200 },
  { id: "destinations", itemCount: 200 },
  { id: "founded", itemCount: 200 },
]);

describe("selection", () => {
  it("a category unlocks its metrics", () => {
    expect(metricsFor("airport", all)).toEqual(["passengers", "runways"]);
    expect(metricsFor("airline", all)).toEqual(["destinations", "founded"]);
  });
  it("preselects the default metric", () => {
    expect(defaultMetric("airport", all)).toBe("passengers");
  });
  it("preselects the only remaining metric", () => {
    const m = manifest([{ id: "founded", itemCount: 200 }]);
    expect(defaultMetric("airline", m)).toBe("founded");
    expect(defaultMetric("airport", m)).toBeNull();
  });
  it("ignores a stored selection no longer offered", () => {
    const m = manifest([{ id: "passengers", itemCount: 200 }]);
    expect(
      isSelectionValid({ category: "airport", metric: "runways", difficulty: "easy" }, m),
    ).toBe(false);
    expect(
      isSelectionValid({ category: "airport", metric: "passengers", difficulty: "easy" }, m),
    ).toBe(true);
  });
});
