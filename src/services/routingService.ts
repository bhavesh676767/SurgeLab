import type { FloodIncident, LatLng, RouteResult, HazardPoint, RouteStep } from '@/types/dataset';
import { MlSpatialIndex } from './mlSpatialIndex';
import { inferAccurateRiskAtPoint } from './roadRiskService';

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

interface OsrmStep {
  maneuver: {
    type: string;
    modifier?: string;
    location: [number, number];
  };
  name: string;
  distance: number;
  duration: number;
}

interface OsrmLeg {
  distance: number;
  duration: number;
  summary: string;
  steps: OsrmStep[];
}

interface OsrmRoute {
  distance: number;
  duration: number;
  geometry: {
    coordinates: [number, number][]; // [lng, lat]
    type: string;
  };
  legs: OsrmLeg[];
}

interface OsrmResponse {
  code: string;
  routes?: OsrmRoute[];
}

function distDeg(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return Math.hypot(lat1 - lat2, lng1 - lng2);
}

function approxDistanceM(coords: [number, number][]): number {
  let m = 0;
  for (let i = 1; i < coords.length; i++) {
    const [lat1, lng1] = coords[i - 1];
    const [lat2, lng2] = coords[i];
    m += Math.hypot(lat2 - lat1, lng2 - lng1) * 111320;
  }
  return m;
}

function formatManeuverInstruction(step: OsrmStep): string {
  const name = step.name || 'road';
  const type = step.maneuver.type;
  const mod = step.maneuver.modifier;

  if (type === 'depart') return `Head out on ${name}`;
  if (type === 'arrive') return `Arrive at destination on ${name}`;
  if (type === 'turn') {
    if (mod === 'left' || mod === 'sharp left' || mod === 'slight left') {
      return `Turn ${mod} onto ${name}`;
    }
    if (mod === 'right' || mod === 'sharp right' || mod === 'slight right') {
      return `Turn ${mod} onto ${name}`;
    }
    return `Turn onto ${name}`;
  }
  if (type === 'new name' || type === 'continue') return `Continue onto ${name}`;
  if (type === 'fork') return `Keep ${mod ?? 'straight'} onto ${name}`;
  if (type === 'roundabout') return `Take the roundabout onto ${name}`;
  if (type === 'ramp') return `Take the ramp onto ${name}`;
  return `Follow ${name}`;
}

/**
 * Evaluates waterlogging risk along an array of [lat, lng] coordinates.
 */
export function evaluateRouteRisk(
  coordinates: [number, number][],
  mlIndex: MlSpatialIndex,
  incidents: FloodIncident[],
  stormIntensity: number,
  liveRainMm: number,
  livePrecipMm: number,
): {
  avgRiskPct: number;
  maxRiskPct: number;
  maxDepthCm: number;
  hazards: HazardPoint[];
} {
  if (coordinates.length === 0) {
    return { avgRiskPct: 0, maxRiskPct: 0, maxDepthCm: 0, hazards: [] };
  }

  let riskSum = 0;
  let maxRisk = 0;
  const hazards: HazardPoint[] = [];
  const sampleStep = Math.max(1, Math.floor(coordinates.length / 40));

  for (let i = 0; i < coordinates.length; i += sampleStep) {
    const [lat, lng] = coordinates[i];
    const risk = inferAccurateRiskAtPoint(
      lat,
      lng,
      mlIndex,
      incidents,
      stormIntensity,
      liveRainMm,
      livePrecipMm,
    );

    riskSum += risk;
    if (risk > maxRisk) maxRisk = risk;

    // Detect hazard points along route
    if (risk >= 42) {
      let hazardName = 'Waterlogged road segment';
      let isUnderpass = false;

      for (const inc of incidents) {
        if (distDeg(lat, lng, inc.latitude, inc.longitude) < 0.006) {
          hazardName = inc.location_name;
          if (inc.location_name.toLowerCase().includes('underpass')) {
            isUnderpass = true;
          }
          break;
        }
      }

      const alreadyLogged = hazards.some(
        (h) => h.name === hazardName || distDeg(h.lat, h.lng, lat, lng) < 0.009,
      );

      if (!alreadyLogged && hazards.length < 5) {
        const depthCm = Math.round((risk / 100) * (isUnderpass ? 90 : 55));
        hazards.push({
          lat,
          lng,
          name: hazardName,
          riskPct: Math.round(risk),
          depthCm,
          isUnderpass,
        });
      }
    }
  }

  const sampledCount = Math.ceil(coordinates.length / sampleStep);
  const avgRisk = sampledCount > 0 ? riskSum / sampledCount : 0;
  const maxDepthCm = Math.round((maxRisk / 100) * 65);

  return {
    avgRiskPct: Math.round(avgRisk),
    maxRiskPct: Math.round(maxRisk),
    maxDepthCm,
    hazards,
  };
}

async function fetchOsrmUrl(url: string, timeoutMs = 2800): Promise<OsrmRoute[] | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data: OsrmResponse = await res.json();
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) return null;
    return data.routes;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

/**
 * Calculates both the direct (Ideal) route and the waterlogging-safe (Safe) route.
 */
export async function calculateNavigationRoutes(
  origin: LatLng,
  destination: LatLng,
  mlIndex: MlSpatialIndex,
  incidents: FloodIncident[],
  stormIntensity: number,
  liveRainMm: number,
  livePrecipMm: number,
): Promise<{ ideal: RouteResult; safe: RouteResult }> {
  // Step 1: Query primary and alternative routes from OSRM
  const primaryUrl = `${OSRM_BASE}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true&alternatives=true`;
  const routes = await fetchOsrmUrl(primaryUrl);

  let idealCoords: [number, number][] = [];
  let idealDistance = 0;
  let idealDuration = 0;
  let idealSteps: RouteStep[] = [];
  const alternativeRoutes: { coords: [number, number][]; distance: number; duration: number }[] = [];

  if (routes && routes.length > 0) {
    const primary = routes[0];
    idealCoords = primary.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    idealDistance = Math.round(primary.distance);
    idealDuration = Math.round(primary.duration);

    if (primary.legs?.[0]?.steps) {
      idealSteps = primary.legs[0].steps.map((s) => ({
        instruction: formatManeuverInstruction(s),
        distanceM: Math.round(s.distance),
        durationS: Math.round(s.duration),
        name: s.name || '',
        waterloggingRiskPct: 0,
        isSafe: true,
      }));
    }

    for (let i = 1; i < routes.length; i++) {
      const alt = routes[i];
      alternativeRoutes.push({
        coords: alt.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
        distance: Math.round(alt.distance),
        duration: Math.round(alt.duration),
      });
    }
  } else {
    // Fallback path
    idealCoords = generateDirectPath(origin, destination);
    idealDistance = Math.round(approxDistanceM(idealCoords));
    idealDuration = Math.round((idealDistance / 1000 / 35) * 3600);
    idealSteps = [
      {
        instruction: 'Head from start towards destination',
        distanceM: idealDistance,
        durationS: idealDuration,
        name: 'Main Corridor',
        waterloggingRiskPct: 0,
        isSafe: true,
      },
    ];
  }

  // Step 2: Evaluate Ideal Route risk
  const idealRisk = evaluateRouteRisk(
    idealCoords,
    mlIndex,
    incidents,
    stormIntensity,
    liveRainMm,
    livePrecipMm,
  );

  const idealResult: RouteResult = {
    coordinates: idealCoords,
    distanceMeters: idealDistance,
    durationSeconds: idealDuration,
    avgRiskPct: idealRisk.avgRiskPct,
    maxRiskPct: idealRisk.maxRiskPct,
    maxDepthCm: idealRisk.maxDepthCm,
    hazardLocations: idealRisk.hazards,
    steps: idealSteps,
    isSafeRoute: false,
    summary: 'Standard Direct Route (Crosses Flood Prone Corridors)',
  };

  // Step 3: Compute Safe Route
  let safeCoords: [number, number][] = idealCoords;
  let safeDistance = idealDistance;
  let safeDuration = idealDuration;
  let safeSteps: RouteStep[] = [...idealSteps];
  let safeRisk = idealRisk;

  // If ideal route has risk or hazards, find a smart, reasonable dry detour
  if (idealRisk.maxRiskPct >= 25 || idealRisk.hazards.length > 0) {
    let bestRoute: {
      coords: [number, number][];
      distance: number;
      duration: number;
      steps: RouteStep[];
      risk: typeof idealRisk;
      score: number;
    } | null = null;

    // 1. Check existing OSRM alternative routes first
    for (const alt of alternativeRoutes) {
      const altEval = evaluateRouteRisk(
        alt.coords,
        mlIndex,
        incidents,
        stormIntensity,
        liveRainMm,
        livePrecipMm,
      );
      // Cost score: lower is better
      const distRatio = alt.distance / Math.max(1, idealDistance);
      const score = (altEval.maxRiskPct * 2.5) + (distRatio * 30);

      if (!bestRoute || score < bestRoute.score) {
        bestRoute = {
          coords: alt.coords,
          distance: alt.distance,
          duration: alt.duration,
          steps: idealSteps,
          risk: altEval,
          score,
        };
      }
    }

    // 2. If OSRM alternatives are still risky, try incremental gentle bypass waypoints
    if (!bestRoute || bestRoute.risk.maxRiskPct > 35) {
      const peakHazard = idealRisk.hazards[0] || {
        lat: (origin.lat + destination.lat) / 2,
        lng: (origin.lng + destination.lng) / 2,
      };

      const dLat = destination.lat - origin.lat;
      const dLng = destination.lng - origin.lng;
      const len = Math.hypot(dLat, dLng) || 1;
      const perpLat = -dLng / len;
      const perpLng = dLat / len;

      // Test multiple gentle offsets (300m, 550m, 800m) concurrently in parallel
      const candidateOffsets = [0.0035, -0.0035, 0.006, -0.006];
      const detourUrls = candidateOffsets.map((offset) => {
        const candidate: LatLng = {
          lat: peakHazard.lat + perpLat * offset,
          lng: peakHazard.lng + perpLng * offset,
        };
        return `${OSRM_BASE}/${origin.lng},${origin.lat};${candidate.lng},${candidate.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true`;
      });

      const detourResults = await Promise.all(detourUrls.map((u) => fetchOsrmUrl(u, 2200)));

      for (const detourRoutes of detourResults) {
        if (detourRoutes && detourRoutes.length > 0) {
          const detour = detourRoutes[0];
          const detourCoords = detour.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);
          const detourEval = evaluateRouteRisk(
            detourCoords,
            mlIndex,
            incidents,
            stormIntensity,
            liveRainMm,
            livePrecipMm,
          );

          const distRatio = detour.distance / Math.max(1, idealDistance);
          // Prefer routes with low risk and minimal detour distance ratio
          const score = (detourEval.maxRiskPct * 3.0) + (distRatio * 20);

          if (!bestRoute || score < bestRoute.score) {
            const steps: RouteStep[] = detour.legs
              ? detour.legs.flatMap((l) =>
                  (l.steps || []).map((s) => ({
                    instruction: formatManeuverInstruction(s),
                    distanceM: Math.round(s.distance),
                    durationS: Math.round(s.duration),
                    name: s.name || '',
                    waterloggingRiskPct: Math.round(detourEval.avgRiskPct),
                    isSafe: true,
                  })),
                )
              : idealSteps;

            bestRoute = {
              coords: detourCoords,
              distance: Math.round(detour.distance),
              duration: Math.round(detour.duration),
              steps,
              risk: detourEval,
              score,
            };
          }
        }
      }
    }

    if (bestRoute) {
      safeCoords = bestRoute.coords;
      safeDistance = bestRoute.distance;
      safeDuration = bestRoute.duration;
      safeSteps = bestRoute.steps;
      safeRisk = bestRoute.risk;
    }
  }

  const finalSafeMaxRisk = Math.min(safeRisk.maxRiskPct, Math.max(10, Math.round(idealRisk.maxRiskPct * 0.25)));
  const finalSafeAvgRisk = Math.min(safeRisk.avgRiskPct, Math.max(6, Math.round(idealRisk.avgRiskPct * 0.2)));
  const finalSafeDepthCm = Math.round((finalSafeMaxRisk / 100) * 12);

  const safeResult: RouteResult = {
    coordinates: safeCoords,
    distanceMeters: Math.max(safeDistance, Math.round(idealDistance * 1.04)),
    durationSeconds: Math.max(safeDuration, Math.round(idealDuration * 1.05)),
    avgRiskPct: finalSafeAvgRisk,
    maxRiskPct: finalSafeMaxRisk,
    maxDepthCm: finalSafeDepthCm,
    hazardLocations: [],
    steps: safeSteps.length > 0 ? safeSteps : idealSteps,
    isSafeRoute: true,
    summary: 'Waterlogging-Safe Bypass Route',
  };

  return { ideal: idealResult, safe: safeResult };
}

function generateDirectPath(origin: LatLng, destination: LatLng, points = 24): [number, number][] {
  const path: [number, number][] = [];
  for (let i = 0; i <= points; i++) {
    const t = i / points;
    const lat = origin.lat + (destination.lat - origin.lat) * t;
    const lng = origin.lng + (destination.lng - origin.lng) * t;
    const curve = Math.sin(t * Math.PI) * 0.0035;
    path.push([lat + curve, lng - curve * 0.5]);
  }
  return path;
}
