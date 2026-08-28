export interface LatLng {
  lat: number;
  lng: number;
}

export interface FloodIncident {
  incident_id: string;
  latitude: number;
  longitude: number;
  location_name: string;
  sector: string;
  date: string;
  time: string;
  severity: number;
  depth_cm: number;
  duration_minutes: number;
}

export interface SpatialGridRecord {
  grid_id: string;
  center_latitude: number;
  center_longitude: number;
  observation_count: number;
  waterlogging_count: number;
}

export interface MlTerrainRecord {
  latitude: number;
  longitude: number;
  elevation_m: number;
  road_slope_percent: number;
  topographic_wetness_index: number;
  distance_to_lowest_point_m: number;
  distance_to_nearest_drain_m: number;
  underpass: number;
  historical_waterlogging_count: number;
  known_waterlogging_hotspot: number;
  rainfall_1h_mm: number;
  rainfall_3h_mm: number;
  rainfall_6h_mm: number;
  rainfall_24h_mm: number;
  rainfall_intensity_mm_hr: number;
  waterlogging: number;
  waterlogging_severity: number;
}

export interface RegionGridCell {
  gridId: string;
  center: LatLng;
  /** Leaflet positions [lat, lng][] */
  polygon: [number, number][];
  observationCount: number;
  waterloggingCount: number;
  baseRiskPct: number;
  avgDrainDistanceM: number;
  avgDepthCm: number;
  avgRainfallIntensity: number;
  avgWetnessIndex: number;
}

export interface WeatherSnapshot {
  precipitation: number;
  rain: number;
  weatherCode: number;
  temperature: number;
  updatedAt: string;
}

export interface PlaceSearchResult {
  placeId: string;
  name: string;
  formattedAddress: string;
  location: LatLng;
  type?: string;
  category?: string;
  source?: "local" | "nominatim";
}
