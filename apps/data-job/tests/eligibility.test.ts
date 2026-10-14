import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { airlineCandidates, airportCandidates } from "../src/pipeline/eligibility";
import { buildAirports, parseCsv } from "../src/sources/ourairports";
import {
  parseAirlines,
  parseAirports,
  commonsFileName,
  type SparqlResponse,
  type WikidataAirport,
} from "../src/sources/wikidata";

const fx = (name: string) => readFileSync(new URL(`../fixtures/${name}`, import.meta.url), "utf8");
const ourairports = buildAirports(fx("ourairports-airports.csv"), fx("ourairports-runways.csv"));
const airports = parseAirports(JSON.parse(fx("wikidata-airports.json")) as SparqlResponse);
const airlines = parseAirlines(JSON.parse(fx("wikidata-airlines.json")) as SparqlResponse);

describe("parsing", () => {
  it("parses quoted CSV fields", () => {
    expect(parseCsv('a,b\n"x, y","say ""hi"""\n')).toEqual([{ a: "x, y", b: 'say "hi"' }]);
  });
  it("decodes Commons file names", () => {
    expect(
      commonsFileName("http://commons.wikimedia.org/wiki/Special:FilePath/Foo%20bar.jpg"),
    ).toBe("Foo bar.jpg");
  });
  it("counts open runways", () => {
    const lhr = ourairports.find((a) => a.iata === "LHR")!;
    expect(lhr.runwayCount).toBe(2);
  });
  it("picks the latest passenger count per airport", () => {
    const raw = JSON.parse(fx("wikidata-airports.json")) as SparqlResponse;
    for (const a of airports) {
      const dated = raw.results.bindings
        .filter((b) => b.item?.value.endsWith(a.wikidataId) && b.pax && b.paxDate)
        .sort((x, y) => y.paxDate!.value.localeCompare(x.paxDate!.value));
      if (dated[0]) expect(a.passengers).toBe(Number(dated[0].pax!.value));
    }
  });
});

describe("airport eligibility", () => {
  it("keeps scheduled-service airports from the fixtures", () => {
    const candidates = airportCandidates(airports, ourairports);
    const codes = candidates.map((c) => c.code);
    expect(codes).toEqual(expect.arrayContaining(["LHR", "JFK", "GRU"]));
    for (const c of candidates) {
      expect(c.metrics.runways).toBeGreaterThan(0);
      expect(c.country).toMatch(/^[A-Z]{2}$/);
    }
  });
  it("drops heliports and airports without scheduled service", () => {
    const heli = ourairports.find((a) => a.type === "heliport")!;
    const noService = ourairports.find((a) => a.iata === "CSE")!;
    const fake = (iata: string): WikidataAirport => ({
      wikidataId: `Q${iata}`,
      name: iata,
      iata,
      icao: null,
      country: "US",
      passengers: 1000,
      imageFile: null,
      sitelinks: 0,
    });
    const result = airportCandidates([fake(heli.iata!), fake(noService.iata!)], ourairports);
    expect(result).toEqual([]);
  });
  it("drops defunct airports (closed in OurAirports)", () => {
    const closed = [{ ...ourairports[0]!, type: "closed", iata: "XXX", scheduledService: true }];
    const w: WikidataAirport = {
      wikidataId: "Q1",
      name: "X",
      iata: "XXX",
      icao: null,
      country: null,
      passengers: 5,
      imageFile: null,
      sitelinks: 0,
    };
    expect(airportCandidates([w], closed)).toEqual([]);
  });
});

describe("airline eligibility", () => {
  it("keeps active airlines with a code and a metric", () => {
    const candidates = airlineCandidates(airlines);
    expect(candidates.length).toBeGreaterThan(0);
    for (const c of candidates) {
      expect(c.code.length).toBeGreaterThan(0);
      expect(Number.isInteger(c.metrics.founded)).toBe(true);
    }
  });
  it("drops airlines without a code or without any metric", () => {
    const base = {
      wikidataId: "Q1",
      name: "A",
      iata: "AA",
      icao: null,
      country: null,
      founded: 1950,
      imageFile: null,
      sitelinks: 0,
    };
    expect(airlineCandidates([{ ...base, iata: null }])).toEqual([]);
    expect(airlineCandidates([{ ...base, founded: null }])).toEqual([]);
  });
});
