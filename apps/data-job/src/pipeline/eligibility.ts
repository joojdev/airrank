import type { Candidate } from "../types";
import type { OurAirport } from "../sources/ourairports";
import type { RouteStats } from "../sources/routes";
import type { WikidataAirline, WikidataAirport } from "../sources/wikidata";

/** Below this a yearly count is almost certainly a data error, not a real airport. */
const MIN_PASSENGERS = 100_000;
const AIRLINE_CODE = /^[A-Z0-9]{2,3}$/;

const AIRPORT_TYPES = new Set(["small_airport", "medium_airport", "large_airport"]);

/**
 * Airports: Wikidata record joined to OurAirports by IATA code. Only airports with scheduled
 * service and a real airport type qualify (no heliports, closed or seaplane bases).
 */
export function airportCandidates(
  wikidata: WikidataAirport[],
  ourairports: OurAirport[],
  routes?: RouteStats,
): Candidate[] {
  const byIata = new Map<string, OurAirport>();
  for (const a of ourairports) if (a.iata && !byIata.has(a.iata)) byIata.set(a.iata, a);

  const candidates: Candidate[] = [];
  const seen = new Set<string>();
  for (const w of wikidata) {
    const match = byIata.get(w.iata);
    if (!match || !match.scheduledService || !AIRPORT_TYPES.has(match.type)) continue;
    if (seen.has(w.iata)) continue; // IATA code claimed by two Wikidata items: keep the first
    seen.add(w.iata);
    const metrics: Candidate["metrics"] = {};
    if (w.passengers && w.passengers >= MIN_PASSENGERS)
      metrics.passengers = Math.round(w.passengers);
    if (match.runwayCount > 0) metrics.runways = match.runwayCount;
    const airlines = routes?.airlinesAt.get(w.iata);
    if (airlines) metrics.airlines = airlines;
    if (Object.keys(metrics).length === 0) continue;
    candidates.push({
      category: "airport",
      wikidataId: w.wikidataId,
      name: w.name.replace(new RegExp(`\\s*\\(${w.iata}\\)\\s*$`), ""),
      code: w.iata,
      country: (match.country ?? w.country)?.toUpperCase() ?? null,
      metrics,
      imageFile: w.imageFile,
      fame: w.sitelinks,
    });
  }
  return candidates;
}

/** Airlines: the query already drops dissolved ones; here we need a code and a metric. */
export function airlineCandidates(wikidata: WikidataAirline[], routes?: RouteStats): Candidate[] {
  // Wikidata often has several items on one IATA code (rebrands, subsidiaries, cargo arms), and
  // the route file knows only the code: the best-known item owns the counts.
  const owner = new Map<string, WikidataAirline>();
  for (const w of wikidata) {
    const best = owner.get(w.iata ?? "");
    if (w.iata && (!best || w.sitelinks > best.sitelinks)) owner.set(w.iata, w);
  }
  const candidates: Candidate[] = [];
  const seen = new Set<string>();
  for (const w of wikidata) {
    const code = w.iata ?? w.icao;
    if (!code || !AIRLINE_CODE.test(code)) continue;
    const key = `${w.name}|${code}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const metrics: Candidate["metrics"] = {};
    if (w.founded !== null && Number.isInteger(w.founded)) metrics.founded = w.founded;
    if (routes && w.iata && owner.get(w.iata) === w) {
      const destinations = routes.destinationsOf.get(w.iata);
      const countries = routes.countriesOf.get(w.iata);
      if (destinations) metrics.destinations = destinations;
      if (countries) metrics.countries = countries;
    }
    if (Object.keys(metrics).length === 0) continue;
    candidates.push({
      category: "airline",
      wikidataId: w.wikidataId,
      name: w.name,
      code,
      country: w.country?.toUpperCase() ?? null,
      metrics,
      imageFile: w.imageFile,
      fame: w.sitelinks,
    });
  }
  return candidates;
}
