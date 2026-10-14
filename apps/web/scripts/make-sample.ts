/** Generates the development sample dataset (apps/web/public). Replaced by the data job output. */
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const root = new URL("../public/", import.meta.url).pathname;

// code, name, country, passengers, runways
const airports: [string, string, string, number, number][] = [
  ["ATL", "Hartsfield-Jackson Atlanta", "US", 104000000, 5],
  ["DXB", "Dubai International", "AE", 87000000, 2],
  ["LHR", "London Heathrow", "GB", 79000000, 2],
  ["HND", "Tokyo Haneda", "JP", 78000000, 4],
  ["CDG", "Paris Charles de Gaulle", "FR", 74000000, 4],
  ["GRU", "São Paulo Guarulhos", "BR", 40000000, 2],
  ["SYD", "Sydney Kingsford Smith", "AU", 44000000, 3],
  ["JNB", "Johannesburg O. R. Tambo", "ZA", 21000000, 2],
  ["LIS", "Lisbon Humberto Delgado", "PT", 33000000, 2],
  ["SDU", "Rio Santos Dumont", "BR", 9000000, 2],
  ["FLN", "Florianópolis Hercílio Luz", "BR", 4000000, 1],
  ["IGU", "Foz do Iguaçu", "BR", 2000000, 1],
  ["TLL", "Tallinn Lennart Meri", "EE", 3000000, 1],
  ["KEF", "Reykjavík Keflavík", "IS", 8000000, 2],
];
// code, name, country, destinations, founded
const airlines: [string, string, string, number, number][] = [
  ["AA", "American Airlines", "US", 950, 1926],
  ["DL", "Delta Air Lines", "US", 900, 1925],
  ["LH", "Lufthansa", "DE", 700, 1953],
  ["AF", "Air France", "FR", 220, 1933],
  ["KL", "KLM", "NL", 110, 1919],
  ["QF", "Qantas", "AU", 130, 1920],
  ["LA", "LATAM Airlines", "CL", 330, 1929],
  ["G3", "Gol", "BR", 140, 2001],
  ["AD", "Azul", "BR", 190, 2008],
  ["EK", "Emirates", "AE", 260, 1985],
  ["FR", "Ryanair", "IE", 570, 1984],
  ["TP", "TAP Air Portugal", "PT", 100, 1945],
  ["SK", "SAS", "SE", 120, 1946],
  ["TK", "Turkish Airlines", "TR", 450, 1933],
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

async function photo(id: string, label: string, hue: number) {
  mkdirSync(`${root}img/${id}`, { recursive: true });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320"><rect width="480" height="320" fill="hsl(${hue},35%,55%)"/><text x="240" y="175" font-size="64" text-anchor="middle" fill="white" font-family="sans-serif">${label}</text></svg>`;
  await sharp(Buffer.from(svg)).webp({ quality: 60 }).toFile(`${root}img/${id}/480.webp`);
  return {
    widths: [480],
    formats: ["webp"],
    author: "Sample generator",
    license: "CC0 1.0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    sourceUrl: "https://example.com/sample",
    width: 480,
    height: 320,
  };
}

mkdirSync(`${root}data`, { recursive: true });
const airportItems = [];
for (const [i, [code, name, country, passengers, runways]] of airports.entries()) {
  const id = `apt-${code.toLowerCase()}`;
  airportItems.push({
    id,
    category: "airport",
    name,
    code,
    country,
    photo: await photo(id, code, i * 25),
    metrics: { passengers, runways },
  });
}
const airlineItems = [];
for (const [i, [code, name, country, destinations, founded]] of airlines.entries()) {
  const id = `air-${slug(name)}`;
  airlineItems.push({
    id,
    category: "airline",
    name,
    code,
    country,
    photo: await photo(id, code, 200 + i * 10),
    metrics: { destinations, founded },
  });
}
const json = (v: unknown) => JSON.stringify(v, null, 2) + "\n";
writeFileSync(`${root}data/items-airport.json`, json(airportItems));
writeFileSync(`${root}data/items-airline.json`, json(airlineItems));
writeFileSync(
  `${root}data/manifest.json`,
  json({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sample: true,
    categories: {
      airport: { file: "items-airport.json", itemCount: airportItems.length },
      airline: { file: "items-airline.json", itemCount: airlineItems.length },
    },
    metrics: [
      { id: "passengers", itemCount: airportItems.length },
      { id: "runways", itemCount: airportItems.length },
      { id: "destinations", itemCount: airlineItems.length },
      { id: "founded", itemCount: airlineItems.length },
    ],
    minimumItems: 10,
  }),
);
console.log("sample written");
