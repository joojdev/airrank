import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { politeFetch, type Fetcher } from "../http";

const BASE = "https://davidmegginson.github.io/ourairports-data";

export interface OurAirport {
  ident: string;
  type: string;
  name: string;
  country: string | null;
  scheduledService: boolean;
  iata: string | null;
  icao: string | null;
  runwayCount: number;
}

/** Minimal RFC 4180 parser: quoted fields, escaped quotes, newlines inside quotes. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...body] = rows;
  if (!header) return [];
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

export function buildAirports(airportsCsv: string, runwaysCsv: string): OurAirport[] {
  const counts = new Map<string, number>();
  for (const r of parseCsv(runwaysCsv)) {
    if (r.closed === "1" || !r.airport_ident) continue;
    counts.set(r.airport_ident, (counts.get(r.airport_ident) ?? 0) + 1);
  }
  return parseCsv(airportsCsv).map((r) => {
    return {
      ident: r.ident!,
      type: r.type ?? "",
      name: r.name ?? "",
      country: r.iso_country || null,
      scheduledService: r.scheduled_service === "yes",
      iata: r.iata_code || null,
      icao: r.icao_code || r.gps_code || r.ident || null,
      runwayCount: counts.get(r.ident!) ?? 0,
    };
  });
}

async function cached(name: string, cacheDir: string, fetcher?: Fetcher): Promise<string> {
  const path = `${cacheDir}/${name}`;
  if (existsSync(path)) return readFileSync(path, "utf8");
  const text = await (await politeFetch(`${BASE}/${name}`, {}, { fetcher })).text();
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(path, text);
  return text;
}

export async function fetchOurAirports(cacheDir: string, fetcher?: Fetcher): Promise<OurAirport[]> {
  const [airports, runways] = await Promise.all([
    cached("airports.csv", cacheDir, fetcher),
    cached("runways.csv", cacheDir, fetcher),
  ]);
  return buildAirports(airports, runways);
}
