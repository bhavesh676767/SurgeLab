import type { FloodIncident, MlTerrainRecord } from "@/types/dataset";
import { inferRiskForMlRecord, inferRiskPercent } from "./mlInferenceEngine";
import { MlSpatialIndex } from "./mlSpatialIndex";
import { roadPaintStyle } from "./riskColorPalette";

const NEAR_INCIDENT_DEG = 0.008;

const PAINTABLE_HIGHWAYS = new Set([
  "motorway",
  "motorway_link",
  "trunk",
  "trunk_link",
  "primary",
  "primary_link",
  "secondary",
  "secondary_link",
  "tertiary",
  "tertiary_link",
  "residential",
  "unclassified",
  "service",
  "living_street",
]);

const MIN_LENGTH_BY_HIGHWAY: Record<string, number> = {
  motorway: 60,
  trunk: 60,
  primary: 55,
  secondary: 45,
  tertiary: 30,
  residential: 18,
  unclassified: 18,
  service: 12,
  living_street: 12,
};

const MAJOR_HIGHWAYS = new Set([
  "motorway",
  "motorway_link",
  "trunk",
  "trunk_link",
  "primary",
  "primary_link",
  "secondary",
  "secondary_link",
]);

const MID_HIGHWAYS = new Set(["tertiary", "tertiary_link", "unclassified"]);

function minLengthForHighway(highway: string): number {
  return MIN_LENGTH_BY_HIGHWAY[highway] ?? 30;
}

function distDeg(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return Math.hypot(lat1 - lat2, lng1 - lng2);
}

function approxLengthM(coords: [number, number][]): number {
  let m = 0;
  for (let i = 1; i < coords.length; i++) {
    const [lng1, lat1] = coords[i - 1];
    const [lng2, lat2] = coords[i];
    m += Math.hypot(lat2 - lat1, lng2 - lng1) * 111_320;
  }
  return m;
}

/** Risk tier bucket for smooth color runs along a street. */
function riskPaintBucket(riskPct: number): number {
  if (riskPct < 20) return 0;
  if (riskPct < 40) return 1;
  if (riskPct < 60) return 2;
  if (riskPct < 80) return 3;
  return 4;
}

function sampleVertexIndices(count: number, maxSamples = 14): number[] {
  if (count <= maxSamples) {
    return Array.from({ length: count }, (_, i) => i);
  }
  const step = (count - 1) / (maxSamples - 1);
  return Array.from({ length: maxSamples }, (_, i) => Math.round(i * step));
}

export function riskRoadWeight(highway: string): number {
  const weights: Record<string, number> = {
    motorway: 5,
    motorway_link: 4,
    trunk: 5,
    trunk_link: 4,
    primary: 4,
    primary_link: 3,
    secondary: 4,
    secondary_link: 3,
    tertiary: 3,
    tertiary_link: 3,
    residential: 2,
    unclassified: 2,
    service: 1.5,
    living_street: 1.5,
  };
  return weights[highway] ?? 2;
}

export function highwaysForZoom(zoom: number): Set<string> {
  if (zoom <= 11) return MAJOR_HIGHWAYS;
  if (zoom <= 13) return new Set([...MAJOR_HIGHWAYS, ...MID_HIGHWAYS]);
  return PAINTABLE_HIGHWAYS;
}

/** IDW blend of ML terrain records + weighted incident field reports. */
export function inferAccurateRiskAtPoint(
  lat: number,
  lng: number,
  mlIndex: MlSpatialIndex,
  incidents: FloodIncident[],
  stormIntensity: number,
  liveRainMm: number,
  livePrecipMm: number,
): number {
  let incidentRisk = 0;

  for (const inc of incidents) {
    if (inc.severity <= 0) continue;
    const d = distDeg(lat, lng, inc.latitude, inc.longitude);
    if (d > NEAR_INCIDENT_DEG) continue;

    const proximity = 1 - d / NEAR_INCIDENT_DEG;
    const fromIncident = inferRiskPercent({
      baseRiskPct: Math.max(inc.severity * 22, 35),
      avgDrainDistanceM: 70,
      avgDepthCm: inc.depth_cm,
      avgRainfallIntensity: 40 + inc.severity * 8,
      avgWetnessIndex: 10 + inc.severity * 0.5,
      stormIntensity,
      liveRainMm,
      livePrecipitationMm: livePrecipMm,
    });
    incidentRisk = Math.max(incidentRisk, fromIncident * (0.55 + proximity * 0.45));
  }

  const nearby = mlIndex.query(lat, lng, 6);
  if (nearby.length === 0) return Math.min(100, incidentRisk);

  let weightSum = 0;
  let riskSum = 0;

  for (const { record, dist } of nearby) {
    const w = 1 / (dist + 0.00025);
    const recordRain =
      liveRainMm + livePrecipMm + record.rainfall_1h_mm * 0.35 + record.rainfall_3h_mm * 0.1;
    const mlRisk = inferRiskForMlRecord(record, stormIntensity, recordRain);
    weightSum += w;
    riskSum += w * mlRisk;
  }

  const mlRisk = riskSum / weightSum;
  return Math.min(100, Math.max(mlRisk, incidentRisk));
}

export interface PaintedRoadSegment {
  latlngs: [number, number][];
  color: string;
  weight: number;
  opacity: number;
  riskPct: number;
  highway: string;
  name: string;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

function bboxFromLatLngs(latlngs: [number, number][]) {
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const [lat, lng] of latlngs) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }
  return { minLat, maxLat, minLng, maxLng };
}

/**
 * Build painted road segments from OSM geometry + ML CSV + incident CSV.
 * Samples risk along each street, merges same-color runs for smooth canvas lines.
 */
export function buildPaintedRoadList(
  roads: GeoJSON.FeatureCollection,
  mlRecords: MlTerrainRecord[],
  incidents: FloodIncident[],
  stormIntensity: number,
  liveRainMm: number,
  livePrecipMm: number,
): PaintedRoadSegment[] {
  const mlIndex = new MlSpatialIndex(mlRecords);
  const segments: PaintedRoadSegment[] = [];

  for (const feature of roads.features) {
    if (feature.geometry?.type !== "LineString") continue;

    const coords = feature.geometry.coordinates as [number, number][];
    if (coords.length < 2) continue;

    const highway = String(feature.properties?.highway ?? "unclassified");
    if (!PAINTABLE_HIGHWAYS.has(highway)) continue;
    if (approxLengthM(coords) < minLengthForHighway(highway)) continue;

    const name = String(feature.properties?.name ?? "");
    const baseWeight = riskRoadWeight(highway);

    const sampleIdx = sampleVertexIndices(coords.length);
    const vertexRisks: number[] = coords.map(() => 0);
    const vertexBuckets: number[] = coords.map(() => 0);

    for (const i of sampleIdx) {
      const [lng, lat] = coords[i];
      const risk = inferAccurateRiskAtPoint(
        lat,
        lng,
        mlIndex,
        incidents,
        stormIntensity,
        liveRainMm,
        livePrecipMm,
      );
      vertexRisks[i] = risk;
      vertexBuckets[i] = riskPaintBucket(risk);
    }

    // Fill gaps between samples by nearest sampled value
    for (let i = 0; i < coords.length; i++) {
      if (sampleIdx.includes(i)) continue;
      let lo = i - 1;
      while (lo >= 0 && !sampleIdx.includes(lo)) lo--;
      let hi = i + 1;
      while (hi < coords.length && !sampleIdx.includes(hi)) hi++;
      if (lo >= 0) {
        vertexRisks[i] = vertexRisks[lo];
        vertexBuckets[i] = vertexBuckets[lo];
      } else if (hi < coords.length) {
        vertexRisks[i] = vertexRisks[hi];
        vertexBuckets[i] = vertexBuckets[hi];
      }
    }

    let runStart = 0;
    let runBucket = vertexBuckets[0];

    const pushRun = (endIdx: number) => {
      if (endIdx <= runStart) return;
      const sliceCoords = coords.slice(runStart, endIdx + 1);
      if (sliceCoords.length < 2) return;

      const latlngs: [number, number][] = sliceCoords.map(([lng, lat]) => [lat, lng]);
      const risks = vertexRisks.slice(runStart, endIdx + 1);
      const riskPct = Math.round(risks.reduce((a, b) => a + b, 0) / risks.length);
      const paint = roadPaintStyle(riskPct, baseWeight);
      const box = bboxFromLatLngs(latlngs);

      segments.push({
        latlngs,
        color: paint.color,
        weight: paint.weight,
        opacity: paint.opacity,
        riskPct,
        highway,
        name,
        ...box,
      });
    };

    for (let i = 1; i < coords.length; i++) {
      if (vertexBuckets[i] !== runBucket) {
        pushRun(i);
        runStart = i;
        runBucket = vertexBuckets[i];
      }
    }
    pushRun(coords.length - 1);
  }

  return segments;
}

// Legacy alias for compatibility
export type PaintedRoad = PaintedRoadSegment;

export function buildPaintedRoads(
  roads: GeoJSON.FeatureCollection,
  mlRecords: MlTerrainRecord[],
  incidents: FloodIncident[],
  stormIntensity: number,
  liveRainMm: number,
  livePrecipMm: number,
): GeoJSON.FeatureCollection {
  const painted = buildPaintedRoadList(
    roads,
    mlRecords,
    incidents,
    stormIntensity,
    liveRainMm,
    livePrecipMm,
  );
  return {
    type: "FeatureCollection",
    features: painted.map((r) => ({
      type: "Feature" as const,
      properties: {
        color: r.color,
        weight: r.weight,
        opacity: r.opacity,
        riskPct: r.riskPct,
        highway: r.highway,
        name: r.name,
        roadId: r.name || r.highway,
      },
      geometry: {
        type: "LineString" as const,
        coordinates: r.latlngs.map(([lat, lng]) => [lng, lat]),
      },
    })),
  };
}
