import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { useMapStore } from "@/store/mapStore";

export function MapViewportController() {
  const map = useMap();
  const programmaticMove = useMapStore((s) => s.programmaticMove);
  const clearProgrammaticMove = useMapStore((s) => s.clearProgrammaticMove);

  useEffect(() => {
    if (!map || !programmaticMove) return;

    map.flyTo(
      [programmaticMove.center.lat, programmaticMove.center.lng],
      programmaticMove.zoom ?? map.getZoom(),
      { duration: 0.8 },
    );
    clearProgrammaticMove();
  }, [map, programmaticMove, clearProgrammaticMove]);

  return null;
}
