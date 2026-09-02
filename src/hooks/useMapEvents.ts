import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { useMapStore } from "@/store/mapStore";

export function useMapEvents() {
  const map = useMap();
  const setViewport = useMapStore((s) => s.setViewport);

  useEffect(() => {
    if (!map) return;

    const onMove = () => {
      try {
        const center = map.getCenter();
        if (center && typeof center.lat === 'number' && typeof center.lng === 'number') {
          setViewport({
            center: { lat: center.lat, lng: center.lng },
            zoom: map.getZoom(),
          });
        }
      } catch {
        // Guard against map teardown race condition
      }
    };

    map.on("moveend", onMove);
    map.on("zoomend", onMove);

    return () => {
      map.off("moveend", onMove);
      map.off("zoomend", onMove);
    };
  }, [map, setViewport]);
}
