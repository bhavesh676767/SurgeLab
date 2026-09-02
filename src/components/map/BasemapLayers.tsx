import { TileLayer } from 'react-leaflet';
import { useMapStore } from '@/store/mapStore';

export function BasemapLayers() {
  const basemapMode = useMapStore((s) => s.basemapMode);

  if (basemapMode === 'satellite') {
    return (
      <TileLayer
        key="satellite"
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        attribution="Tiles &copy; Esri &mdash; Source: Esri, DigitalGlobe, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN"
        maxNativeZoom={18}
        maxZoom={19}
      />
    );
  }

  // Esri World Light Gray Base — clean, desaturated light basemap (watermark-free)
  // maxNativeZoom={16} ensures Leaflet scales zoom 16 tiles when zooming in to 17-19
  return (
    <TileLayer
      key="esri-light-gray"
      url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
      attribution="Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ"
      maxNativeZoom={16}
      maxZoom={19}
    />
  );
}
