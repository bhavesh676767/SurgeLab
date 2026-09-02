import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  FloodIncident,
  MlTerrainRecord,
  RegionGridCell,
  WeatherSnapshot,
  RouteResult,
} from "@/types/dataset";
import type { TerrainRiskSample } from "@/services/terrainRiskEngine";
import type { NavigationPosition } from "@/services/navigationEngine";

export interface LatLng {
  lat: number;
  lng: number;
}

export type BasemapMode = "standard" | "satellite";
export type RouteStage = "idle" | "ideal" | "analyzing" | "safe";
export type AppMode = "home" | "searching" | "routes" | "navigating";

export interface NavigationLocation {
  location: LatLng;
  name: string;
  formattedAddress?: string;
  isUserLocation?: boolean;
}

export interface LayerVisibility {
  waterRisk: boolean;
  rainfall: boolean;
  terrain: boolean;
  traffic: boolean;
  riskStreetLines: boolean;
}

export interface NavSettings {
  routePreference: "safe" | "balanced" | "fast";
  avoidUnderpasses: boolean;
  avoidHighRisk: boolean;
  avoidLowElevation: boolean;
  units: "metric" | "imperial";
  darkMode: boolean;
  notifyRiskChange: boolean;
  notifySevereWaterlogging: boolean;
}

export interface FloodedRoadInfo {
  name: string;
  riskPct: number;
  depthCm: number;
  reason: string;
  updatedMinutesAgo: number;
}

export interface WaterloggingReport {
  id: string;
  location: LatLng;
  timestamp: number;
  depthCm?: number;
  description?: string;
  confirmed?: boolean;
}

const DEFAULT_CENTER: LatLng = { lat: 28.4593, lng: 77.0326 };
const DEFAULT_ZOOM = 13;

const DEFAULT_NAV_SETTINGS: NavSettings = {
  routePreference: "safe",
  avoidUnderpasses: true,
  avoidHighRisk: true,
  avoidLowElevation: false,
  units: "metric",
  darkMode: false,
  notifyRiskChange: true,
  notifySevereWaterlogging: true,
};

interface MapStore {
  // Core map state
  viewport: { center: LatLng; zoom: number };
  incidents: FloodIncident[];
  mlRecords: MlTerrainRecord[];
  gridCells: RegionGridCell[];
  weather: WeatherSnapshot | null;
  stormIntensity: number;
  userLocation: LatLng | null;
  userLocationAccuracy: number | null;
  userLocationError: string | null;
  userLocationLoading: boolean;
  programmaticMove: { center: LatLng; zoom?: number } | null;
  basemapMode: BasemapMode;
  showTerrainPaint: boolean;
  selectedTerrain: TerrainRiskSample | null;

  // App UI state
  appMode: AppMode;
  isConditionsPanelOpen: boolean;
  isSettingsOpen: boolean;
  isLayerSelectorOpen: boolean;
  isWaterloggingSheetOpen: boolean;
  onboardingComplete: boolean;
  simulationMode: boolean; // dev/demo only
  layerVisibility: LayerVisibility;

  // Flooded road detail sheet
  floodedRoadInfo: FloodedRoadInfo | null;

  // Navigation state
  isNavigating: boolean;
  origin: NavigationLocation | null;
  destination: NavigationLocation | null;
  pickingLocationOnMap: "origin" | "destination" | null;
  routeStage: RouteStage;
  idealRoute: RouteResult | null;
  safeRoute: RouteResult | null;
  isCalculatingRoute: boolean;
  analyzingProgress: number;
  analyzingText: string;
  activeRouteTab: "safe" | "ideal";
  currentStepIndex: number;
  navigationPosition: NavigationPosition | null;
  isRerouting: boolean;
  showHazardCallout: boolean;
  showRerouteAlert: boolean;
  isSmartAnalysisOpen: boolean;
  sheetSnap: 'peek' | 'mid' | 'full';
  isElevationModalOpen: boolean;
  setSmartAnalysisOpen: (open: boolean) => void;
  setSheetSnap: (snap: 'peek' | 'mid' | 'full') => void;
  setElevationModalOpen: (open: boolean) => void;
  setAnalyzingProgress: (progress: number) => void;
  setAnalyzingText: (text: string) => void;

  // Persisted settings
  navSettings: NavSettings;

  // Actions — Viewport
  setViewport: (partial: { center?: LatLng; zoom?: number }) => void;
  flyTo: (center: LatLng, zoom?: number) => void;
  clearProgrammaticMove: () => void;

  // Actions — Data
  setIncidents: (incidents: FloodIncident[]) => void;
  setMlRecords: (records: MlTerrainRecord[]) => void;
  setGridCells: (cells: RegionGridCell[]) => void;
  setWeather: (weather: WeatherSnapshot | null) => void;
  setStormIntensity: (value: number) => void;

  // Actions — Map display
  setBasemapMode: (mode: BasemapMode) => void;
  toggleSatellite: () => void;
  setShowTerrainPaint: (show: boolean) => void;
  setSelectedTerrain: (sample: TerrainRiskSample | null) => void;
  setLayerVisibility: (layers: Partial<LayerVisibility>) => void;

  // Actions — User location
  setUserLocation: (location: LatLng | null, accuracy?: number | null) => void;
  setUserLocationError: (error: string | null) => void;
  setUserLocationLoading: (loading: boolean) => void;

  // Actions — App UI
  setAppMode: (mode: AppMode) => void;
  setConditionsPanelOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setLayerSelectorOpen: (open: boolean) => void;
  setWaterloggingSheetOpen: (open: boolean) => void;
  setOnboardingComplete: (complete: boolean) => void;
  setSimulationMode: (enabled: boolean) => void;
  setFloodedRoadInfo: (info: FloodedRoadInfo | null) => void;

  // Actions — Navigation
  setNavigating: (enabled: boolean) => void;
  setOrigin: (origin: NavigationLocation | null) => void;
  setDestination: (dest: NavigationLocation | null) => void;
  setPickingLocationOnMap: (target: "origin" | "destination" | null) => void;
  setRouteStage: (stage: RouteStage) => void;
  setRoutes: (ideal: RouteResult | null, safe: RouteResult | null) => void;
  setIsCalculatingRoute: (calculating: boolean) => void;
  setActiveRouteTab: (tab: "safe" | "ideal") => void;
  swapOriginDestination: () => void;
  clearNavigation: () => void;
  setCurrentStepIndex: (index: number) => void;
  setNavigationPosition: (pos: NavigationPosition | null) => void;
  setIsRerouting: (rerouting: boolean) => void;
  setShowHazardCallout: (show: boolean) => void;
  setShowRerouteAlert: (show: boolean) => void;

  // Actions — Settings
  setNavSettings: (settings: Partial<NavSettings>) => void;
}

export const useMapStore = create<MapStore>()(
  persist(
    (set, get) => ({
      // Core map state
      viewport: { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM },
      incidents: [],
      mlRecords: [],
      gridCells: [],
      weather: null,
      stormIntensity: 35,
      userLocation: null,
      userLocationAccuracy: null,
      userLocationError: null,
      userLocationLoading: false,
      programmaticMove: null,
      basemapMode: "satellite",
      showTerrainPaint: true,
      selectedTerrain: null,

      // App UI state
      appMode: "home",
      isConditionsPanelOpen: false,
      isSettingsOpen: false,
      isLayerSelectorOpen: false,
      isWaterloggingSheetOpen: false,
      onboardingComplete: false,
      simulationMode: false,
      layerVisibility: {
        waterRisk: true,
        rainfall: false,
        terrain: false,
        traffic: false,
        riskStreetLines: true,
      },
      floodedRoadInfo: null,

      // Navigation state
      isNavigating: false,
      origin: null,
      destination: null,
      pickingLocationOnMap: null,
      routeStage: "idle",
      idealRoute: null,
      safeRoute: null,
      isCalculatingRoute: false,
      analyzingProgress: 0,
      analyzingText: '',
      activeRouteTab: "safe",
      currentStepIndex: 0,
      navigationPosition: null,
      isRerouting: false,
      showHazardCallout: false,
      showRerouteAlert: false,
      isSmartAnalysisOpen: false,
      sheetSnap: 'peek',
      isElevationModalOpen: false,

      setSmartAnalysisOpen: (open) => set({ isSmartAnalysisOpen: open }),
      setSheetSnap: (snap) => set({ sheetSnap: snap }),
      setElevationModalOpen: (open) => set({ isElevationModalOpen: open }),
      setAnalyzingProgress: (progress) => set({ analyzingProgress: progress }),
      setAnalyzingText: (text) => set({ analyzingText: text }),

      // Settings (persisted)
      navSettings: DEFAULT_NAV_SETTINGS,

      // Viewport actions
      setViewport: (partial) =>
        set((state) => ({ viewport: { ...state.viewport, ...partial } })),

      flyTo: (center, zoom) =>
        set({
          programmaticMove: { center, zoom },
          viewport: { center, zoom: zoom ?? get().viewport.zoom },
        }),

      clearProgrammaticMove: () => set({ programmaticMove: null }),

      // Data actions
      setIncidents: (incidents) => set({ incidents }),
      setMlRecords: (records) => set({ mlRecords: records }),
      setGridCells: (cells) => set({ gridCells: cells }),
      setWeather: (weather) => set({ weather }),
      setStormIntensity: (value) =>
        set({ stormIntensity: Math.min(100, Math.max(0, value)) }),

      // Map display
      setBasemapMode: (mode) => set({ basemapMode: mode }),
      toggleSatellite: () =>
        set((state) => ({
          basemapMode:
            state.basemapMode === "satellite" ? "standard" : "satellite",
        })),
      setShowTerrainPaint: (show) => set({ showTerrainPaint: show }),
      setSelectedTerrain: (sample) => set({ selectedTerrain: sample }),
      setLayerVisibility: (layers) =>
        set((state) => ({
          layerVisibility: { ...state.layerVisibility, ...layers },
        })),

      // User location
      setUserLocation: (location, accuracy = null) => {
        set({
          userLocation: location,
          userLocationAccuracy: accuracy,
          userLocationError: null,
          userLocationLoading: false,
        });
        const currentOrigin = get().origin;
        if (location && (!currentOrigin || currentOrigin.isUserLocation)) {
          set({
            origin: {
              location,
              name: "Your Location",
              isUserLocation: true,
            },
          });
        }
      },
      setUserLocationError: (error) =>
        set({ userLocationError: error, userLocationLoading: false }),
      setUserLocationLoading: (loading) => set({ userLocationLoading: loading }),

      // App UI
      setAppMode: (mode) => set({ appMode: mode }),
      setConditionsPanelOpen: (open) => set({ isConditionsPanelOpen: open }),
      setSettingsOpen: (open) => set({ isSettingsOpen: open }),
      setLayerSelectorOpen: (open) => set({ isLayerSelectorOpen: open }),
      setWaterloggingSheetOpen: (open) =>
        set({ isWaterloggingSheetOpen: open }),
      setOnboardingComplete: (complete) =>
        set({ onboardingComplete: complete }),
      setSimulationMode: (enabled) => set({ simulationMode: enabled }),
      setFloodedRoadInfo: (info) => set({ floodedRoadInfo: info }),

      // Navigation
      setNavigating: (enabled) =>
        set({
          isNavigating: enabled,
          appMode: enabled ? "navigating" : "routes",
          ...(enabled
            ? {}
            : {
                routeStage: "idle",
                idealRoute: null,
                safeRoute: null,
                currentStepIndex: 0,
                navigationPosition: null,
                isRerouting: false,
                showHazardCallout: false,
                showRerouteAlert: false,
              }),
        }),
      setOrigin: (origin) => set({ origin }),
      setDestination: (dest) => set({ destination: dest }),
      setPickingLocationOnMap: (target) =>
        set({ pickingLocationOnMap: target }),
      setRouteStage: (stage) => set({ routeStage: stage }),
      setRoutes: (ideal, safe) => set({ idealRoute: ideal, safeRoute: safe }),
      setIsCalculatingRoute: (calculating) =>
        set({ isCalculatingRoute: calculating }),
      setActiveRouteTab: (tab) => set({ activeRouteTab: tab }),
      swapOriginDestination: () =>
        set((state) => ({
          origin: state.destination,
          destination: state.origin,
        })),
      clearNavigation: () =>
        set({
          isNavigating: false,
          destination: null,
          routeStage: "idle",
          idealRoute: null,
          safeRoute: null,
          isCalculatingRoute: false,
          analyzingProgress: 0,
          analyzingText: '',
          pickingLocationOnMap: null,
          appMode: "home",
          currentStepIndex: 0,
          navigationPosition: null,
          isRerouting: false,
          showHazardCallout: false,
          showRerouteAlert: false,
        }),
      setCurrentStepIndex: (index) => set({ currentStepIndex: index }),
      setNavigationPosition: (pos) => set({ navigationPosition: pos }),
      setIsRerouting: (rerouting) => set({ isRerouting: rerouting }),
      setShowHazardCallout: (show) => set({ showHazardCallout: show }),
      setShowRerouteAlert: (show) => set({ showRerouteAlert: show }),

      // Settings
      setNavSettings: (settings) =>
        set((state) => ({
          navSettings: { ...state.navSettings, ...settings },
        })),
    }),
    {
      name: "surgelab-settings",
      // Only persist user preferences, never live data
      partialize: (state) => ({
        navSettings: state.navSettings,
        onboardingComplete: state.onboardingComplete,
        layerVisibility: state.layerVisibility,
      }),
    }
  )
);

export { DEFAULT_CENTER, DEFAULT_ZOOM };
