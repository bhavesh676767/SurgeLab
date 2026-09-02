function parseCsv(text: string): string[][] {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  return lines.map((line) => line.split(",").map((cell) => cell.trim()));
}

function num(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

import incidentsRaw from "../../dataset/waterlogging_incidents.csv?raw";
import spatialRaw from "../../dataset/spatial_coverage_report.csv?raw";
import mlRaw from "../../dataset/gurugram_waterlogging_ml.csv?raw";

import type {
  FloodIncident,
  MlTerrainRecord,
  RegionGridCell,
  SpatialGridRecord,
} from "@/types/dataset";

const GRID_HALF_DEG = 0.0025;

export function loadFloodIncidents(): FloodIncident[] {
  const rows = parseCsv(incidentsRaw);
  const header = rows[0];
  const idx = {
    id: header.indexOf("incident_id"),
    lat: header.indexOf("latitude"),
    lng: header.indexOf("longitude"),
    name: header.indexOf("location_name"),
    sector: header.indexOf("sector"),
    date: header.indexOf("date"),
    time: header.indexOf("time"),
    severity: header.indexOf("severity"),
    depth: header.indexOf("depth_cm"),
    duration: header.indexOf("duration_minutes"),
  };

  return rows.slice(1).map((row) => ({
    incident_id: row[idx.id],
    latitude: num(row[idx.lat]),
    longitude: num(row[idx.lng]),
    location_name: row[idx.name],
    sector: row[idx.sector],
    date: row[idx.date],
    time: row[idx.time],
    severity: num(row[idx.severity]),
    depth_cm: num(row[idx.depth]),
    duration_minutes: num(row[idx.duration]),
  }));
}

export function loadSpatialGrids(): SpatialGridRecord[] {
  const rows = parseCsv(spatialRaw);
  const header = rows[0];
  const idx = {
    id: header.indexOf("grid_id"),
    lat: header.indexOf("center_latitude"),
    lng: header.indexOf("center_longitude"),
    obs: header.indexOf("observation_count"),
    wl: header.indexOf("waterlogging_count"),
  };

  return rows.slice(1).map((row) => ({
    grid_id: row[idx.id],
    center_latitude: num(row[idx.lat]),
    center_longitude: num(row[idx.lng]),
    observation_count: num(row[idx.obs]),
    waterlogging_count: num(row[idx.wl]),
  }));
}

export function loadMlTerrainRecords(): MlTerrainRecord[] {
  const rows = parseCsv(mlRaw);
  const header = rows[0];

  const col = (name: string) => header.indexOf(name);

  return rows.slice(1).map((row) => ({
    latitude: num(row[col("latitude")]),
    longitude: num(row[col("longitude")]),
    elevation_m: num(row[col("elevation_m")]),
    road_slope_percent: num(row[col("road_slope_percent")]),
    topographic_wetness_index: num(row[col("topographic_wetness_index")]),
    distance_to_lowest_point_m: num(row[col("distance_to_lowest_point_m")]),
    distance_to_nearest_drain_m: num(row[col("distance_to_nearest_drain_m")]),
    underpass: num(row[col("underpass")]),
    historical_waterlogging_count: num(row[col("historical_waterlogging_count")]),
    known_waterlogging_hotspot: num(row[col("known_waterlogging_hotspot")]),
    rainfall_1h_mm: num(row[col("rainfall_1h_mm")]),
    rainfall_3h_mm: num(row[col("rainfall_3h_mm")]),
    rainfall_6h_mm: num(row[col("rainfall_6h_mm")]),
    rainfall_24h_mm: num(row[col("rainfall_24h_mm")]),
    rainfall_intensity_mm_hr: num(row[col("rainfall_intensity_mm_hr")]),
    waterlogging: num(row[col("waterlogging")]),
    waterlogging_severity: num(row[col("waterlogging_severity")]),
  }));
}

function pointInCell(
  lat: number,
  lng: number,
  centerLat: number,
  centerLng: number,
): boolean {
  return (
    lat >= centerLat - GRID_HALF_DEG &&
    lat <= centerLat + GRID_HALF_DEG &&
    lng >= centerLng - GRID_HALF_DEG &&
    lng <= centerLng + GRID_HALF_DEG
  );
}

function cellPolygon(centerLat: number, centerLng: number): [number, number][] {
  const d = GRID_HALF_DEG;
  return [
    [centerLat - d, centerLng - d],
    [centerLat - d, centerLng + d],
    [centerLat + d, centerLng + d],
    [centerLat + d, centerLng - d],
  ];
}

export function buildRegionGridCells(
  grids: SpatialGridRecord[],
  mlRecords: MlTerrainRecord[],
): RegionGridCell[] {
  return grids.map((grid) => {
    const inCell = mlRecords.filter((r) =>
      pointInCell(r.latitude, r.longitude, grid.center_latitude, grid.center_longitude),
    );

    const baseRiskPct =
      grid.observation_count > 0
        ? (grid.waterlogging_count / grid.observation_count) * 100
        : 0;

    const avgDrainDistanceM =
      inCell.length > 0
        ? inCell.reduce((s, r) => s + r.distance_to_nearest_drain_m, 0) / inCell.length
        : 60;

    const avgDepthCm =
      inCell.length > 0
        ? inCell.reduce((s, r) => s + r.waterlogging_severity * 18, 0) / inCell.length
        : 0;

    const avgRainfallIntensity =
      inCell.length > 0
        ? inCell.reduce((s, r) => s + r.rainfall_intensity_mm_hr, 0) / inCell.length
        : 0;

    const avgWetnessIndex =
      inCell.length > 0
        ? inCell.reduce((s, r) => s + r.topographic_wetness_index, 0) / inCell.length
        : 0;

    return {
      gridId: grid.grid_id,
      center: { lat: grid.center_latitude, lng: grid.center_longitude },
      polygon: cellPolygon(grid.center_latitude, grid.center_longitude),
      observationCount: grid.observation_count,
      waterloggingCount: grid.waterlogging_count,
      baseRiskPct,
      avgDrainDistanceM,
      avgDepthCm,
      avgRainfallIntensity,
      avgWetnessIndex,
    };
  });
}

export function loadAllDatasets(): {
  incidents: FloodIncident[];
  gridCells: RegionGridCell[];
} {
  const incidents = loadFloodIncidents();
  const grids = loadSpatialGrids();
  const mlRecords = loadMlTerrainRecords();
  const gridCells = buildRegionGridCells(grids, mlRecords);
  return { incidents, gridCells };
}
