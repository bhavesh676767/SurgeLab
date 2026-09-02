import type { MlTerrainRecord } from "@/types/dataset";

export interface InferenceInput {
  baseRiskPct: number;
  avgDrainDistanceM: number;
  avgDepthCm: number;
  avgRainfallIntensity: number;
  avgWetnessIndex: number;
  stormIntensity: number;
  liveRainMm: number;
  livePrecipitationMm: number;
}

/**
 * Predicts waterlogging risk % from terrain ML features, historical grid
 * exposure, live rainfall, and storm simulation intensity.
 */
export function inferRiskPercent(input: InferenceInput): number {
  const {
    baseRiskPct,
    avgDrainDistanceM,
    avgDepthCm,
    avgRainfallIntensity,
    avgWetnessIndex,
    stormIntensity,
    liveRainMm,
    livePrecipitationMm,
  } = input;

  const stormFactor = 1 + stormIntensity / 100;
  const liveRain = liveRainMm + livePrecipitationMm;
  const rainFactor = 1 + (avgRainfallIntensity + liveRain) / 60;
  const wetnessBoost = Math.min(20, (avgWetnessIndex - 8) * 2.5);
  const drainPenalty =
    avgDrainDistanceM > 80 ? 18 : avgDrainDistanceM > 50 ? 10 : avgDrainDistanceM > 30 ? 4 : 0;
  const depthBoost = Math.min(15, avgDepthCm * 0.25);

  const raw =
    baseRiskPct * stormFactor * rainFactor + wetnessBoost + drainPenalty + depthBoost;

  return Math.min(100, Math.max(0, raw));
}

export function inferRiskForMlRecord(
  record: MlTerrainRecord,
  stormIntensity: number,
  liveRainMm: number,
): number {
  return inferRiskPercent({
    baseRiskPct: record.known_waterlogging_hotspot ? 45 : record.waterlogging_severity * 22,
    avgDrainDistanceM: record.distance_to_nearest_drain_m,
    avgDepthCm: record.waterlogging_severity * 18,
    avgRainfallIntensity: record.rainfall_intensity_mm_hr,
    avgWetnessIndex: record.topographic_wetness_index,
    stormIntensity,
    liveRainMm,
    livePrecipitationMm: 0,
  });
}

export function riskPolygonStyle(riskPct: number) {
  const color =
    riskPct >= 75 ? "#9333ea" :
    riskPct >= 50 ? "#f43f5e" :
    riskPct >= 30 ? "#f97316" :
    riskPct >= 15 ? "#eab308" : "#22c55e";

  return {
    fillColor: color,
    weight: 1,
    opacity: 0.8,
    color: color,
    fillOpacity: Math.min(0.6, 0.15 + (riskPct / 100) * 0.45),
  };
}

export type RiskTier = "low" | "moderate" | "high";

export function riskTier(riskPct: number): RiskTier {
  if (riskPct < 30) return "low";
  if (riskPct <= 65) return "moderate";
  return "high";
}
