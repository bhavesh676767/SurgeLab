import L from "leaflet";
import { Circle, Marker } from "react-leaflet";
import { useMapStore } from "@/store/mapStore";

const userIcon = L.divIcon({
  className: "",
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#4285f4;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.35)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

export function UserLocationLayer() {
  const userLocation = useMapStore((s) => s.userLocation);
  const accuracy = useMapStore((s) => s.userLocationAccuracy);

  if (!userLocation) return null;

  return (
    <>
      {accuracy != null && accuracy > 0 && (
        <Circle
          center={[userLocation.lat, userLocation.lng]}
          radius={accuracy}
          pathOptions={{
            color: "#4285f4",
            fillColor: "#4285f4",
            fillOpacity: 0.12,
            weight: 1,
            opacity: 0.4,
          }}
        />
      )}
      <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon} />
    </>
  );
}
