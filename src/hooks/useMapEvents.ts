import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { useMapStore } from "@/store/mapStore";

export function useMapEvents() {
  const map = useMap();
  const setViewport = useMapStore((s) => s.setViewport);

  useEffect(() => {
    const onMove = () => {
      const center = map.getCenter();
      setViewport({
        center: { lat: center.lat, lng: center.lng },
        zoom: map.getZoom(),
      });
    };

    map.on("moveend", onMove);
    map.on("zoomend", onMove);

    return () => {
      map.off("moveend", onMove);
      map.off("zoomend", onMove);
    };
  }, [map, setViewport]);
}
