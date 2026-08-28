/**
 * Fetch Gurugram road network from OpenStreetMap (Overpass) and save as GeoJSON.
 * Run: node scripts/fetch_gurugram_roads.mjs
 */

import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "../public/data/gurugram_roads.geojson");

const QUERY = `[out:json][timeout:120];
(
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|unclassified)$"](28.38,76.92,28.52,77.12);
);
out geom;`;

const ENDPOINTS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];

async function fetchOverpass() {
  for (const base of ENDPOINTS) {
    try {
      const url = `${base}?data=${encodeURIComponent(QUERY)}`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.elements?.length) return data;
    } catch {
      /* try next */
    }
  }
  throw new Error("All Overpass endpoints failed");
}

async function main() {
  const data = await fetchOverpass();
  const features = data.elements
    .filter((el) => el.type === "way" && el.geometry?.length >= 2)
    .map((way) => ({
      type: "Feature",
      properties: {
        id: way.id,
        highway: way.tags?.highway ?? "unclassified",
        name: way.tags?.name ?? "",
      },
      geometry: {
        type: "LineString",
        coordinates: way.geometry.map((p) => [p.lon, p.lat]),
      },
    }));

  const fc = { type: "FeatureCollection", features };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(fc));
  console.log(`Saved ${features.length} road segments to ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
