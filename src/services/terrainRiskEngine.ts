import type { FloodIncident, MlTerrainRecord } from "@/types/dataset";
import { inferRiskForMlRecord, inferRiskPercent } from "./mlInferenceEngine";
import {
  riskColorRgba,
  riskLevelLabel,
  terrainFillAlpha,
  terrainGlowAlpha,
  terrainInfluenceRadiusM,
} from "./riskColorPalette";

export interface TerrainRiskSample {
  id: string;
  lat: number;
  lng: number;
  riskPct: number;
  label: string;
  depthCm: number;
  underpass: boolean;
  source: "ml" | "incident";
}

export interface TerrainRiskStyle {
  fill: string;
  glow: string;
  ambient: string;
  radiusM: number;
}

export function terrainRiskStyle(riskPct: number): TerrainRiskStyle {
  const fillA = terrainFillAlpha(riskPct);
  const glowA = terrainGlowAlpha(riskPct);
  return {
    fill: riskColorRgba(riskPct, fillA),
    glow: riskColorRgba(riskPct, glowA),
    ambient: riskColorRgba(riskPct, glowA * 0.4),
    radiusM: terrainInfluenceRadiusM(riskPct),
  };
}

export function predictedDepthCm(riskPct: number, baseDepth = 0): number {
  const fromRisk = Math.round((riskPct / 100) * 80);
  return Math.max(baseDepth, fromRisk);
}

export function passabilityWarning(riskPct: number, underpass: boolean): string {
  if (riskPct > 88 || (underpass && riskPct > 65)) {
    return "All traffic halted — fully submerged";
  }
  if (riskPct > 72) return "Cars & light vehicles halted";
  if (riskPct > 52) return "Slow traffic — deep surface water";
  if (riskPct > 35) return "Pooling on surface — caution advised";
  if (riskPct > 15) return "Trace moisture — passable";
  return "Clear — normal passage";
}

export function riskStatusLabel(riskPct: number): string {
  return riskLevelLabel(riskPct);
}

const BIN_DEG = 0.012;
const MAX_TERRAIN_SAMPLES = 55;

function shouldPaintMlRecord(record: MlTerrainRecord, riskPct: number): boolean {
  return (
    record.known_waterlogging_hotspot > 0 ||
    record.underpass > 0 ||
    record.waterlogging_severity >= 2 ||
    record.historical_waterlogging_count >= 8 ||
    riskPct >= 28
  );
}

/** Keep strongest risk per spatial bin so paint stays localized, not a city-wide smear. */
function dedupeSpatialBins(samples: TerrainRiskSample[]): TerrainRiskSample[] {
  const bins = new Map<string, TerrainRiskSample>();

  for (const s of samples) {
    const bx = Math.floor(s.lng / BIN_DEG);
    const by = Math.floor(s.lat / BIN_DEG);
    const key = `${bx}:${by}`;
    const prev = bins.get(key);
    if (!prev || s.riskPct > prev.riskPct) {
      bins.set(key, s);
    }
  }

  return [...bins.values()]
    .sort((a, b) => a.riskPct - b.riskPct)
    .slice(-MAX_TERRAIN_SAMPLES);
}

export function buildTerrainRiskSamples(
  mlRecords: MlTerrainRecord[],
  incidents: FloodIncident[],
  stormIntensity: number,
  liveRainMm: number,
  livePrecipMm: number,
): TerrainRiskSample[] {
  const samples: TerrainRiskSample[] = [];
  const liveTotal = liveRainMm + livePrecipMm;

  for (const record of mlRecords) {
    const riskPct = inferRiskForMlRecord(record, stormIntensity, liveTotal);
    if (!shouldPaintMlRecord(record, riskPct)) continue;

    samples.push({
      id: `ml-${record.latitude}-${record.longitude}`,
      lat: record.latitude,
      lng: record.longitude,
      riskPct,
      label: record.known_waterlogging_hotspot
        ? "Known waterlogging hotspot"
        : record.underpass
          ? "Underpass corridor"
          : "Terrain risk zone",
      depthCm: predictedDepthCm(riskPct, record.waterlogging_severity * 18),
      underpass: record.underpass > 0,
      source: "ml",
    });
  }

  for (const incident of incidents) {
    if (incident.severity <= 0) continue;

    const riskPct = inferRiskPercent({
      baseRiskPct: Math.max(incident.severity * 22, 40),
      avgDrainDistanceM: 70,
      avgDepthCm: incident.depth_cm,
      avgRainfallIntensity: 45,
      avgWetnessIndex: 10,
      stormIntensity,
      liveRainMm,
      livePrecipitationMm: livePrecipMm,
    });

    samples.push({
      id: incident.incident_id,
      lat: incident.latitude,
      lng: incident.longitude,
      riskPct,
      label: incident.location_name,
      depthCm: Math.max(incident.depth_cm, predictedDepthCm(riskPct)),
      underpass: incident.location_name.toLowerCase().includes("underpass"),
      source: "incident",
    });
  }

  return dedupeSpatialBins(samples);
}

export function nearestTerrainSample(
  lat: number,
  lng: number,
  samples: TerrainRiskSample[],
): TerrainRiskSample | null {
  if (samples.length === 0) return null;

  let best: TerrainRiskSample = samples[0];
  let bestScore = Infinity;

  for (const s of samples) {
    const d = Math.hypot(lat - s.lat, lng - s.lng);
    const score = d / (1 + s.riskPct / 40);
    if (score < bestScore) {
      bestScore = score;
      best = s;
    }
  }

  if (bestScore > 0.025) return null;
  return best;
}

export function metersPerPixel(lat: number, zoom: number): number {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
}

/** Samples visible in current map bounds (with padding). */
export function samplesInBounds(
  samples: TerrainRiskSample[],
  bounds: { getSouth: () => number; getNorth: () => number; getWest: () => number; getEast: () => number },
  padDeg = 0.02,
): TerrainRiskSample[] {
  const south = bounds.getSouth() - padDeg;
  const north = bounds.getNorth() + padDeg;
  const west = bounds.getWest() - padDeg;
  const east = bounds.getEast() + padDeg;

  return samples.filter(
    (s) => s.lat >= south && s.lat <= north && s.lng >= west && s.lng <= east,
  );
}
