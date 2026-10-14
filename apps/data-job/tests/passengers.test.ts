import { describe, expect, it } from "vitest";
import { parseAirports, type SparqlResponse } from "../src/sources/wikidata";

const lit = (value: string) => ({ value });
const row = (pax: string, date: string, precision?: string) => ({
  item: lit("http://www.wikidata.org/entity/Q1"),
  itemLabel: lit("Test Airport"),
  iata: lit("TST"),
  pax: lit(pax),
  paxDate: lit(date),
  ...(precision ? { paxPrecision: lit(precision) } : {}),
});
const parse = (rows: ReturnType<typeof row>[]) =>
  parseAirports({ results: { bindings: rows } } as SparqlResponse)[0]!;

describe("passenger counts", () => {
  it("ignores monthly counts, even when they are the most recent", () => {
    const airport = parse([
      row("18930698", "2022-01-01T00:00:00Z", "9"),
      row("800518", "2022-01-01T00:00:00Z", "10"),
      row("1568413", "2022-04-01T00:00:00Z", "10"),
    ]);
    expect(airport.passengers).toBe(18930698);
  });
  it("has no count when only monthly ones exist", () => {
    expect(parse([row("877", "2020-06-01T00:00:00Z", "10")]).passengers).toBeNull();
  });
});
