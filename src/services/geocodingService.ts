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

/** Global place search via OpenStreetMap Nominatim (no API key). */
export async function searchPlaces(
  query: string,
  options: SearchPlacesOptions = {},
): Promise<PlaceSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const limit = options.limit ?? 10;
  const params = new URLSearchParams({
    q: trimmed,
    format: "json",
    addressdetails: "1",
    dedupe: "1",
    limit: String(limit),
  });

  if (options.near) {
    params.set("lat", String(options.near.lat));
    params.set("lon", String(options.near.lng));
  }

  const res = await fetch(`${NOMINATIM_BASE}/search?${params}`, {
    headers: nominatimHeaders(),
  });

  if (!res.ok) return [];

  const data: NominatimHit[] = await res.json();
  return data.map(mapNominatimHit);
}

/** Combined local + global search with deduplication by proximity. */
export async function searchPlacesCombined(
  query: string,
  incidents: FloodIncident[],
  options: SearchPlacesOptions = {},
): Promise<PlaceSearchResult[]> {
  const local = searchLocalIncidents(query, incidents, 4);
  const remote = await searchPlaces(query, { ...options, limit: 8 });

  const merged: PlaceSearchResult[] = [...local];
  const NEAR_DEG = 0.0008;

  for (const place of remote) {
    const duplicate = merged.some(
      (p) =>
        Math.abs(p.location.lat - place.location.lat) < NEAR_DEG &&
        Math.abs(p.location.lng - place.location.lng) < NEAR_DEG,
    );
    if (!duplicate) merged.push(place);
  }

  return merged.slice(0, 12);
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
