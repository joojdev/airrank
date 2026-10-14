import { politeFetch, type Fetcher } from "../http";

const ENDPOINT = "https://query.wikidata.org/sparql";

/**
 * Airports are fetched as three small queries (base data, passenger counts, images) and merged
 * by item id in code: one joined query explodes into tens of millions of rows and times out.
 * Wikidata mixes yearly and monthly passenger counts under the same property; the date
 * precision tells them apart, so monthly ones are dropped and the latest yearly count is picked.
 */
// The Netherlands (Q55) has no ISO code of its own on Wikidata; the kingdom (Q29999) does.
const AIRPORT_TYPES =
  "VALUES ?type { wd:Q1248784 wd:Q644371 } ?item wdt:P31 ?type; wdt:P238 ?iata.";
export const AIRPORT_QUERIES = [
  `SELECT ?item ?itemLabel ?iata ?icao ?country WHERE {
  ${AIRPORT_TYPES}
  OPTIONAL { ?item wdt:P239 ?icao. }
  OPTIONAL { ?item wdt:P17 ?c. OPTIONAL { ?c wdt:P297 ?iso. } BIND(IF(?c = wd:Q55, "NL", ?iso) AS ?country) }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`,
  `SELECT ?item ?pax ?paxDate ?paxPrecision WHERE {
  ${AIRPORT_TYPES}
  ?item p:P3872 ?st. ?st ps:P3872 ?pax.
  OPTIONAL { ?st pq:P585 ?paxDate. ?st pqv:P585 ?paxValue. ?paxValue wikibase:timePrecision ?paxPrecision. }
}`,
  `SELECT ?item ?image WHERE {
  ${AIRPORT_TYPES}
  ?item wdt:P18 ?image.
}`,
  `SELECT ?item ?sitelinks WHERE {
  ${AIRPORT_TYPES}
  ?item wikibase:sitelinks ?sitelinks.
}`,
];

/**
 * Airlines that still exist (no dissolution date) with an IATA or ICAO code.
 * Wikidata has no fleet size property, so only the founding year is collected here; route
 * counts come from sources/routes.ts.
 */
const AIRLINES = `?item wdt:P31 wd:Q46970.
  FILTER NOT EXISTS { ?item wdt:P576 ?dissolved. }`;
export const AIRLINE_QUERIES = [
  `SELECT ?item ?itemLabel ?iata ?icao ?country WHERE {
  ${AIRLINES}
  OPTIONAL { ?item wdt:P229 ?iata. }
  OPTIONAL { ?item wdt:P230 ?icao. }
  FILTER(BOUND(?iata) || BOUND(?icao))
  OPTIONAL { ?item wdt:P17 ?c. OPTIONAL { ?c wdt:P297 ?iso. } BIND(IF(?c = wd:Q55, "NL", ?iso) AS ?country) }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`,
  `SELECT ?item ?inception WHERE {
  ${AIRLINES}
  ?item wdt:P571 ?inception.
}`,
  `SELECT ?item ?image WHERE {
  ${AIRLINES}
  ?item wdt:P18 ?image.
}`,
  `SELECT ?item ?sitelinks WHERE {
  ${AIRLINES}
  ?item wikibase:sitelinks ?sitelinks.
}`,
];

export interface WikidataAirport {
  wikidataId: string;
  name: string;
  iata: string;
  icao: string | null;
  country: string | null;
  passengers: number | null;
  imageFile: string | null;
  /** Wikipedia sitelink count. Only used to rank items when capping the dataset. */
  sitelinks: number;
}

export interface WikidataAirline {
  wikidataId: string;
  name: string;
  iata: string | null;
  icao: string | null;
  country: string | null;
  founded: number | null;
  imageFile: string | null;
  /** Wikipedia sitelink count. Only used to rank items when capping the dataset. */
  sitelinks: number;
}

interface Binding {
  [key: string]: { value: string } | undefined;
}
export interface SparqlResponse {
  results: { bindings: Binding[] };
}

const qid = (uri: string) => uri.split("/").pop() ?? uri;

/** `http://commons.wikimedia.org/wiki/Special:FilePath/Foo%20bar.jpg` → `Foo bar.jpg` */
export function commonsFileName(url: string | undefined): string | null {
  if (!url) return null;
  const last = url.split("/").pop();
  return last ? decodeURIComponent(last) : null;
}

function groupByItem(bindings: Binding[]): Map<string, Binding[]> {
  const groups = new Map<string, Binding[]>();
  for (const b of bindings) {
    const id = b.item ? qid(b.item.value) : null;
    if (!id) continue;
    groups.set(id, [...(groups.get(id) ?? []), b]);
  }
  return groups;
}

const firstSorted = (values: (string | undefined)[]): string | null =>
  values.filter((v): v is string => !!v).sort()[0] ?? null;

/** A label that is just a Q-id means Wikidata has no English label. */
const usableLabel = (label: string | undefined): string | null =>
  label && !/^Q\d+$/.test(label) ? label : null;

export function parseAirports(response: SparqlResponse): WikidataAirport[] {
  const result: WikidataAirport[] = [];
  for (const [wikidataId, rows] of groupByItem(response.results.bindings)) {
    const name = usableLabel(rows.find((r) => r.itemLabel)?.itemLabel?.value);
    const iata = firstSorted(rows.map((r) => r.iata?.value));
    if (!name || !iata) continue;
    // latest yearly passenger count wins (precision 9 = year, 10+ = month or finer); undated
    // counts rank last
    const counted = rows
      .filter((r) => r.pax && Number.isFinite(Number(r.pax.value)))
      .filter((r) => !r.paxPrecision || Number(r.paxPrecision.value) <= 9)
      .sort((a, b) => (b.paxDate?.value ?? "").localeCompare(a.paxDate?.value ?? ""));
    result.push({
      wikidataId,
      name,
      iata,
      icao: firstSorted(rows.map((r) => r.icao?.value)),
      country: firstSorted(rows.map((r) => r.country?.value)),
      passengers: counted[0]?.pax ? Number(counted[0].pax.value) : null,
      imageFile: commonsFileName(firstSorted(rows.map((r) => r.image?.value)) ?? undefined),
      sitelinks: Math.max(0, ...rows.map((r) => Number(r.sitelinks?.value ?? 0))),
    });
  }
  return result.sort((a, b) => a.wikidataId.localeCompare(b.wikidataId, "en", { numeric: true }));
}

export function parseAirlines(response: SparqlResponse): WikidataAirline[] {
  const result: WikidataAirline[] = [];
  for (const [wikidataId, rows] of groupByItem(response.results.bindings)) {
    const name = usableLabel(rows.find((r) => r.itemLabel)?.itemLabel?.value);
    if (!name) continue;
    const years = rows
      .map((r) => /^(-?\d{4})/.exec(r.inception?.value ?? "")?.[1])
      .filter((y): y is string => !!y)
      .map(Number)
      .sort((a, b) => a - b);
    result.push({
      wikidataId,
      name,
      iata: firstSorted(rows.map((r) => r.iata?.value)),
      icao: firstSorted(rows.map((r) => r.icao?.value)),
      country: firstSorted(rows.map((r) => r.country?.value)),
      founded: years[0] ?? null,
      imageFile: commonsFileName(firstSorted(rows.map((r) => r.image?.value)) ?? undefined),
      sitelinks: Math.max(0, ...rows.map((r) => Number(r.sitelinks?.value ?? 0))),
    });
  }
  return result.sort((a, b) => a.wikidataId.localeCompare(b.wikidataId, "en", { numeric: true }));
}

async function sparqlAll(queries: string[], fetcher?: Fetcher): Promise<SparqlResponse> {
  const bindings: Binding[] = [];
  for (const query of queries) {
    const url = `${ENDPOINT}?format=json&query=${encodeURIComponent(query)}`;
    const response = await politeFetch(
      url,
      { headers: { Accept: "application/sparql-results+json" } },
      { fetcher },
    );
    for (const b of ((await response.json()) as SparqlResponse).results.bindings) bindings.push(b);
  }
  return { results: { bindings } };
}

export const fetchAirports = async (fetcher?: Fetcher) =>
  parseAirports(await sparqlAll(AIRPORT_QUERIES, fetcher));
export const fetchAirlines = async (fetcher?: Fetcher) =>
  parseAirlines(await sparqlAll(AIRLINE_QUERIES, fetcher));
