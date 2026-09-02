import type { FloodIncident, LatLng, PlaceSearchResult } from "@/types/dataset";

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const USER_AGENT = "SurgeLab/1.0 (flood-risk-map; educational)";

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  state?: string;
  country?: string;
  road?: string;
  suburb?: string;
  neighbourhood?: string;
}

interface NominatimHit {
  place_id: number;
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
  type?: string;
  class?: string;
  address?: NominatimAddress;
}

export interface SearchPlacesOptions {
  /** Bias results toward this point without restricting to a region */
  near?: LatLng;
  limit?: number;
}

function nominatimHeaders(): HeadersInit {
  return {
    "Accept-Language": "en",
    "User-Agent": USER_AGENT,
  };
}

function categoryLabel(hit: NominatimHit): string {
  const type = hit.type ?? hit.class ?? "place";
  const labels: Record<string, string> = {
    city: "City",
    town: "Town",
    village: "Village",
    suburb: "Suburb",
    neighbourhood: "Neighbourhood",
    road: "Road",
    highway: "Highway",
    building: "Building",
    commercial: "Commercial",
    retail: "Shop",
    restaurant: "Restaurant",
    hospital: "Hospital",
    school: "School",
    station: "Station",
    aerodrome: "Airport",
    administrative: "Region",
    locality: "Locality",
    hamlet: "Hamlet",
  };
  return labels[type] ?? type.replace(/_/g, " ");
}

function primaryName(hit: NominatimHit): string {
  if (hit.name) return hit.name;
  const addr = hit.address;
  if (addr?.road) return addr.road;
  if (addr?.suburb) return addr.suburb;
  if (addr?.neighbourhood) return addr.neighbourhood;
  if (addr?.city) return addr.city;
  if (addr?.town) return addr.town;
  if (addr?.village) return addr.village;
  return hit.display_name.split(",")[0];
}

function mapNominatimHit(hit: NominatimHit): PlaceSearchResult {
  return {
    placeId: `osm-${hit.place_id}`,
    name: primaryName(hit),
    formattedAddress: hit.display_name,
    location: { lat: Number(hit.lat), lng: Number(hit.lon) },
    type: hit.type ?? hit.class,
    category: categoryLabel(hit),
    source: "nominatim",
  };
}

/** Search flood incident records by name or sector (instant, no network). */
export function searchLocalIncidents(
  query: string,
  incidents: FloodIncident[],
  limit = 5,
): PlaceSearchResult[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const seen = new Set<string>();
  const results: PlaceSearchResult[] = [];

  for (const inc of incidents) {
    const key = `${inc.location_name}|${inc.sector}`;
    if (seen.has(key)) continue;

    const haystack = `${inc.location_name} ${inc.sector}`.toLowerCase();
    if (!haystack.includes(q)) continue;

    seen.add(key);
    results.push({
      placeId: `local-${inc.incident_id}`,
      name: inc.location_name,
      formattedAddress: `${inc.sector} · Gurugram flood record`,
      location: { lat: inc.latitude, lng: inc.longitude },
      type: "waterlogging",
      category: "Flood hotspot",
      source: "local",
    });

    if (results.length >= limit) break;
  }

  return results;
}

export const GURUGRAM_BOUNDS = {
  minLat: 28.3000,
  maxLat: 28.5600,
  minLng: 76.8500,
  maxLng: 77.1600,
};

export function isInsideGurugram(lat: number, lng: number): boolean {
  return (
    lat >= GURUGRAM_BOUNDS.minLat &&
    lat <= GURUGRAM_BOUNDS.maxLat &&
    lng >= GURUGRAM_BOUNDS.minLng &&
    lng <= GURUGRAM_BOUNDS.maxLng
  );
}

/** Global place search restricted strictly to Gurugram region. */
export async function searchPlaces(
  query: string,
  options: SearchPlacesOptions = {},
): Promise<PlaceSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const limit = options.limit ?? 10;
  // Restrict to Gurugram bounding box
  const params = new URLSearchParams({
    q: `${trimmed} Gurugram`,
    format: "json",
    addressdetails: "1",
    dedupe: "1",
    viewbox: "76.8500,28.5600,77.1600,28.3000",
    bounded: "1",
    limit: String(limit),
  });

  if (options.near) {
    params.set("lat", String(options.near.lat));
    params.set("lon", String(options.near.lng));
  }

  try {
    const res = await fetch(`${NOMINATIM_BASE}/search?${params}`, {
      headers: nominatimHeaders(),
    });

    if (!res.ok) return [];

    const data: NominatimHit[] = await res.json();
    return data
      .map(mapNominatimHit)
      .filter((p) => isInsideGurugram(p.location.lat, p.location.lng));
  } catch {
    return [];
  }
}

/** Combined local + global search with deduplication by proximity strictly inside Gurugram. */
export async function searchPlacesCombined(
  query: string,
  incidents: FloodIncident[],
  options: SearchPlacesOptions = {},
): Promise<PlaceSearchResult[]> {
  const local = searchLocalIncidents(query, incidents, 5);
  const remote = await searchPlaces(query, { ...options, limit: 8 });

  const merged: PlaceSearchResult[] = [...local];
  const NEAR_DEG = 0.0008;

  for (const place of remote) {
    if (!isInsideGurugram(place.location.lat, place.location.lng)) continue;
    const duplicate = merged.some(
      (p) =>
        Math.abs(p.location.lat - place.location.lat) < NEAR_DEG &&
        Math.abs(p.location.lng - place.location.lng) < NEAR_DEG,
    );
    if (!duplicate) merged.push(place);
  }

  return merged.slice(0, 10);
}

export async function geocodeAddress(
  address: string,
  near?: LatLng,
): Promise<LatLng | null> {
  if (!address.trim()) return null;

  const params = new URLSearchParams({
    q: address.trim(),
    format: "json",
    limit: "1",
    addressdetails: "1",
  });

  if (near) {
    params.set("lat", String(near.lat));
    params.set("lon", String(near.lng));
  }

  const res = await fetch(`${NOMINATIM_BASE}/search?${params}`, {
    headers: nominatimHeaders(),
  });

  if (!res.ok) return null;

  const data: NominatimHit[] = await res.json();
  const hit = data[0];
  if (!hit) return null;

  return { lat: Number(hit.lat), lng: Number(hit.lon) };
}

export async function reverseGeocodeLatLng(
  lat: number,
  lng: number,
): Promise<string> {
  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lng),
      format: "json",
      addressdetails: "1",
    });

    const res = await fetch(`${NOMINATIM_BASE}/reverse?${params}`, {
      headers: nominatimHeaders(),
    });

    if (!res.ok) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

    const data: NominatimHit = await res.json();
    return primaryName(data) || data.display_name.split(",")[0] || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

export const GURUGRAM_PRESETS: PlaceSearchResult[] = [
  {
    placeId: "preset-cyber-hub",
    name: "DLF Cyber Hub",
    formattedAddress: "DLF Cyber City, Sector 24, Gurugram",
    location: { lat: 28.4952, lng: 77.0891 },
    category: "Commercial",
    source: "local",
  },
  {
    placeId: "preset-golf-course-road",
    name: "Golf Course Road (Sector 54)",
    formattedAddress: "Sector 54, Golf Course Road, Gurugram",
    location: { lat: 28.4418, lng: 77.1084 },
    category: "Corridor",
    source: "local",
  },
  {
    placeId: "preset-iffco-chowk",
    name: "IFFCO Chowk",
    formattedAddress: "Sector 29, NH-48 Junction, Gurugram",
    location: { lat: 28.47167, lng: 77.07337 },
    category: "Junction",
    source: "local",
  },
  {
    placeId: "preset-rajiv-chowk",
    name: "Rajiv Chowk Junction",
    formattedAddress: "Sector 33 / NH-48, Gurugram",
    location: { lat: 28.45951, lng: 77.03139 },
    category: "Junction",
    source: "local",
  },
  {
    placeId: "preset-medanta",
    name: "Medanta - The Medicity",
    formattedAddress: "Sector 38, Bakhtawar Singh Road, Gurugram",
    location: { lat: 28.43841, lng: 77.04083 },
    category: "Hospital",
    source: "local",
  },
  {
    placeId: "preset-hero-honda-chowk",
    name: "Hero Honda Chowk",
    formattedAddress: "Sector 33/34, NH-48, Gurugram",
    location: { lat: 28.4361, lng: 77.02762 },
    category: "Hotspot",
    source: "local",
  },
  {
    placeId: "preset-sector-29",
    name: "Sector 29 Market",
    formattedAddress: "Sector 29, City Centre, Gurugram",
    location: { lat: 28.4682, lng: 77.0628 },
    category: "Commercial",
    source: "local",
  },
  {
    placeId: "preset-dwarka-expressway",
    name: "Dwarka Expressway (Sector 102)",
    formattedAddress: "Sector 102, Dwarka Expressway, Gurugram",
    location: { lat: 28.48941, lng: 76.97301 },
    category: "Highway",
    source: "local",
  },
];

