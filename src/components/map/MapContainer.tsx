import { useEffect } from "react";
import { MapContainer as RLMapContainer } from "react-leaflet";
import {
  loadFloodIncidents,
  loadMlTerrainRecords,
} from "@/data/datasetLoader";
import { useMapStore, DEFAULT_CENTER, DEFAULT_ZOOM } from "@/store/mapStore";
import { BasemapLayers } from "./BasemapLayers";
import { RoadRiskLayer } from "./RoadRiskLayer";
import { UserLocationLayer } from "./UserLocationLayer";
import { MapViewportController } from "./MapViewportController";
import { CustomControls } from "./CustomControls";
import { useMapEvents } from "@/hooks/useMapEvents";

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
        attributionControl={true}
      >
        <BasemapLayers />
        <RoadRiskLayer />
        <UserLocationLayer />
        <MapViewportController />
        <MapEventBridge />
        <CustomControls />
      </RLMapContainer>
    </div>
  );
}
