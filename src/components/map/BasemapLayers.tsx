import { TileLayer } from "react-leaflet";
import { useMapStore } from "@/store/mapStore";

const OSM_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
  "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors";

const IMAGERY_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const ROADS_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}";
const LABELS_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";

const ESRI_ATTRIBUTION =
  "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, USDA, USGS, AeroGRID, IGN, IGP, and the GIS User Community";

export function BasemapLayers() {
  const basemapMode = useMapStore((s) => s.basemapMode);

  if (basemapMode === "satellite") {
    return (
      <>
        <TileLayer
          key="satellite-base"
          url={IMAGERY_URL}
          attribution={ESRI_ATTRIBUTION}
          maxZoom={19}
        />
        <TileLayer
          key="satellite-roads"
          url={ROADS_URL}
          attribution=""
          maxZoom={19}
          opacity={0.9}
          pane="overlayPane"
        />
        <TileLayer
          key="satellite-labels"
          url={LABELS_URL}
          attribution=""
          maxZoom={19}
          opacity={0.85}
          pane="overlayPane"
        />
      </>
    );
  }

  return (
    <TileLayer
      key="standard-osm"
      url={OSM_URL}
      attribution={OSM_ATTRIBUTION}
      maxZoom={19}
    />
  );
}
