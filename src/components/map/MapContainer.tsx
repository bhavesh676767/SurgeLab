import { useEffect } from "react";
import { MapContainer as RLMapContainer } from "react-leaflet";
import {
  loadFloodIncidents,
  loadMlTerrainRecords,
} from "@/data/datasetLoader";
import { useMapStore, DEFAULT_CENTER, DEFAULT_ZOOM } from "@/store/mapStore";
import { useMapEvents } from "@/hooks/useMapEvents";
import { BasemapLayers } from "./BasemapLayers";
import { RoadRiskLayer } from "./RoadRiskLayer";
import { NavigationRouteLayer } from "./NavigationRouteLayer";
import { UserLocationLayer } from "./UserLocationLayer";
import { MapViewportController } from "./MapViewportController";
import { MapControlsGroup } from "./MapControlsGroup";

function MapEventBridge() {
  useMapEvents();
  return null;
}

export function MapContainer() {
  const setIncidents = useMapStore((s) => s.setIncidents);
  const setMlRecords = useMapStore((s) => s.setMlRecords);

  useEffect(() => {
    setIncidents(loadFloodIncidents());
    setMlRecords(loadMlTerrainRecords());
  }, [setIncidents, setMlRecords]);

  return (
    <div className="fixed inset-0 h-screen w-screen">
      <RLMapContainer
        center={[DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]}
        zoom={DEFAULT_ZOOM}
        className="h-full w-full"
        style={{ width: "100vw", height: "100vh" }}
        zoomControl={false}
        attributionControl={false}
      >
        <BasemapLayers />
        <RoadRiskLayer />
        <NavigationRouteLayer />
        <UserLocationLayer />
        <MapViewportController />
        <MapEventBridge />
        <MapControlsGroup />
      </RLMapContainer>

      {/* Minimal attribution — legally required but unobtrusive */}
      <div className="absolute bottom-1 right-2 z-[900] pointer-events-none">
        <p className="text-[9px] text-slate-400/70 font-medium">
          © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="pointer-events-auto hover:text-slate-600">OSM</a>
          {' '}&amp;{' '}
          <a href="https://www.esri.com" target="_blank" rel="noopener noreferrer" className="pointer-events-auto hover:text-slate-600">Esri</a>
        </p>
      </div>
    </div>
  );
}
