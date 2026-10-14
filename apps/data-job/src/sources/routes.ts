import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { politeFetch, type Fetcher } from "../http";

const URL = "https://raw.githubusercontent.com/Jonty/airline-route-data/main/airline_routes.json";

interface RouteFile {
  [airportIata: string]: {
    country_code?: string;
    routes: { iata: string; carriers: { iata: string }[] }[];
  };
}

export interface RouteStats {
  /** Distinct airlines with a route out of the airport, by airport IATA. */
  airlinesAt: Map<string, number>;
  /** Distinct airports an airline flies to or from, by airline IATA. */
  destinationsOf: Map<string, number>;
  /** Distinct countries an airline flies to or from, by airline IATA. */
  countriesOf: Map<string, number>;
}

/**
 * Builds the per-airport and per-airline counts from the weekly route file. Routes are listed
 * under their origin airport only, so both ends of every route are credited to the carrier.
 */
export function buildRouteStats(file: RouteFile): RouteStats {
  const airlinesAt = new Map<string, Set<string>>();
  const destinations = new Map<string, Set<string>>();
  const countries = new Map<string, Set<string>>();
  const add = (map: Map<string, Set<string>>, key: string, value: string) => {
    const set = map.get(key) ?? new Set<string>();
    set.add(value);
    map.set(key, set);
  };
  for (const [origin, airport] of Object.entries(file)) {
    for (const route of airport.routes) {
      for (const { iata: airline } of route.carriers) {
        add(airlinesAt, origin, airline);
        add(airlinesAt, route.iata, airline);
        add(destinations, airline, origin);
        add(destinations, airline, route.iata);
        if (airport.country_code) add(countries, airline, airport.country_code);
        const target = file[route.iata]?.country_code;
        if (target) add(countries, airline, target);
      }
    }
  }
  const sizes = (m: Map<string, Set<string>>) => new Map([...m].map(([k, v]) => [k, v.size]));
  return {
    airlinesAt: sizes(airlinesAt),
    destinationsOf: sizes(destinations),
    countriesOf: sizes(countries),
  };
}

export async function fetchRouteStats(cacheDir: string, fetcher?: Fetcher): Promise<RouteStats> {
  const path = `${cacheDir}/airline_routes.json`;
  if (!existsSync(path)) {
    const text = await (await politeFetch(URL, {}, { fetcher })).text();
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(path, text);
  }
  return buildRouteStats(JSON.parse(readFileSync(path, "utf8")) as RouteFile);
}
