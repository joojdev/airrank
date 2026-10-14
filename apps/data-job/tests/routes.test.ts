import { describe, expect, it } from "vitest";
import { airlineCandidates } from "../src/pipeline/eligibility";
import { buildRouteStats } from "../src/sources/routes";
import type { WikidataAirline } from "../src/sources/wikidata";

const file = {
  AAA: {
    country_code: "BR",
    routes: [
      { iata: "BBB", carriers: [{ iata: "X1" }, { iata: "X2" }] },
      { iata: "CCC", carriers: [{ iata: "X1" }] },
    ],
  },
  BBB: { country_code: "AR", routes: [{ iata: "AAA", carriers: [{ iata: "X1" }] }] },
  CCC: { country_code: "BR", routes: [] },
};

describe("route stats", () => {
  const stats = buildRouteStats(file);
  it("counts distinct airports and countries per airline, crediting both route ends", () => {
    expect(stats.destinationsOf.get("X1")).toBe(3);
    expect(stats.countriesOf.get("X1")).toBe(2);
    expect(stats.destinationsOf.get("X2")).toBe(2);
  });
  it("counts distinct airlines per airport, including routes that end there", () => {
    expect(stats.airlinesAt.get("AAA")).toBe(2);
    expect(stats.airlinesAt.get("CCC")).toBe(1);
  });
  it("gives route metrics only to the best-known airline on a shared IATA code", () => {
    const airline = (name: string, iata: string, sitelinks = 1): WikidataAirline => ({
      wikidataId: `Q${name}`,
      name,
      iata,
      icao: null,
      country: "BR",
      founded: 1990,
      imageFile: null,
      sitelinks,
    });
    const candidates = airlineCandidates(
      [airline("One", "X1"), airline("Two", "X2", 5), airline("Three", "X2")],
      stats,
    );
    const byName = Object.fromEntries(candidates.map((c) => [c.name, c.metrics]));
    expect(byName.One).toMatchObject({ destinations: 3, countries: 2 });
    expect(byName.Two).toMatchObject({ destinations: 2 });
    expect(byName.Three?.destinations).toBeUndefined();
  });
});
