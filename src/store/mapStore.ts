import { create } from "zustand";
import type {
  FloodIncident,
  MlTerrainRecord,
  RegionGridCell,
  WeatherSnapshot,
} from "@/types/dataset";
import type { TerrainRiskSample } from "@/services/terrainRiskEngine";

export interface LatLng {
  lat: number;
  lng: number;
}

export type BasemapMode = "standard" | "satellite";

const DEFAULT_CENTER: LatLng = { lat: 28.4593, lng: 77.0326 };
const DEFAULT_ZOOM = 13;

interface MapStore {
  viewport: { center: LatLng; zoom: number };
  incidents: FloodIncident[];
  mlRecords: MlTerrainRecord[];
  gridCells: RegionGridCell[];
  weather: WeatherSnapshot | null;
  stormIntensity: number;
  userLocation: LatLng | null;
  userLocationAccuracy: number | null;
  programmaticMove: { center: LatLng; zoom?: number } | null;
  basemapMode: BasemapMode;
  showTerrainPaint: boolean;
  selectedTerrain: TerrainRiskSample | null;

  setViewport: (partial: { center?: LatLng; zoom?: number }) => void;
  flyTo: (center: LatLng, zoom?: number) => void;
  clearProgrammaticMove: () => void;
  setIncidents: (incidents: FloodIncident[]) => void;
  setMlRecords: (records: MlTerrainRecord[]) => void;
  setGridCells: (cells: RegionGridCell[]) => void;
  setWeather: (weather: WeatherSnapshot | null) => void;
  setStormIntensity: (value: number) => void;
  setBasemapMode: (mode: BasemapMode) => void;
  toggleSatellite: () => void;
  setShowTerrainPaint: (show: boolean) => void;
  setSelectedTerrain: (sample: TerrainRiskSample | null) => void;
  setUserLocation: (location: LatLng | null, accuracy?: number | null) => void;
}

export const useMapStore = create<MapStore>((set, get) => ({
  viewport: { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM },
  incidents: [],
  mlRecords: [],
  gridCells: [],
  weather: null,
  stormIntensity: 35,
  userLocation: null,
  userLocationAccuracy: null,
  programmaticMove: null,
  basemapMode: "standard",
  showTerrainPaint: true,
  selectedTerrain: null,

  setViewport: (partial) =>
    set((state) => ({
      viewport: { ...state.viewport, ...partial },
    })),

  flyTo: (center, zoom) =>
    set({
      programmaticMove: { center, zoom },
      viewport: {
        center,
        zoom: zoom ?? get().viewport.zoom,
      },
    }),

  clearProgrammaticMove: () => set({ programmaticMove: null }),

  setIncidents: (incidents) => set({ incidents }),

  setMlRecords: (records) => set({ mlRecords: records }),

  setGridCells: (cells) => set({ gridCells: cells }),

  setWeather: (weather) => set({ weather }),

  setStormIntensity: (value) =>
    set({ stormIntensity: Math.min(100, Math.max(0, value)) }),

  setBasemapMode: (mode) => set({ basemapMode: mode }),

  toggleSatellite: () =>
    set((state) => ({
      basemapMode: state.basemapMode === "satellite" ? "standard" : "satellite",
    })),

  setShowTerrainPaint: (show) => set({ showTerrainPaint: show }),

  setSelectedTerrain: (sample) => set({ selectedTerrain: sample }),

  setUserLocation: (location, accuracy = null) =>
    set({ userLocation: location, userLocationAccuracy: accuracy }),
}));

export { DEFAULT_CENTER, DEFAULT_ZOOM };
