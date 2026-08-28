import L from "leaflet";
import { useMemo } from "react";
import { Marker, Popup } from "react-leaflet";
import { useMapStore } from "@/store/mapStore";
import type { FloodIncident } from "@/types/dataset";

function severityLabel(severity: number): string {
  if (severity >= 4) return "Extreme";
  if (severity >= 3) return "Severe";
  if (severity >= 2) return "Moderate";
  if (severity >= 1) return "Minor";
  return "Clear";
}

function incidentIcon(severity: number): L.DivIcon {
  const color =
    severity >= 4
      ? "#7f1d1d"
      : severity >= 3
        ? "#ef4444"
        : severity >= 2
          ? "#f59e0b"
          : severity >= 1
            ? "#22c55e"
            : "#94a3b8";
  const border =
    severity >= 4
      ? "#fecaca"
      : severity >= 3
        ? "#b91c1c"
        : severity >= 2
          ? "#b45309"
          : severity >= 1
            ? "#15803d"
            : "#64748b";
  const size = severity >= 4 ? 14 : 12;

  return L.divIcon({
    className: "",
    html: `<div class="rounded-full border-2 shadow-md" style="width:${size}px;height:${size}px;background:${color};border-color:${border};box-shadow:0 2px 6px rgba(0,0,0,0.35)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function IncidentPopup({ incident }: { incident: FloodIncident }) {
  return (
    <div className="min-w-[200px] space-y-2 p-1 text-sm text-gray-900">
      <p className="font-semibold leading-snug">{incident.location_name}</p>
      <p className="text-xs text-gray-500">{incident.sector}</p>
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-gray-400">Severity</dt>
          <dd className="font-medium">{severityLabel(incident.severity)}</dd>
        </div>
        <div>
          <dt className="text-gray-400">Depth</dt>
          <dd className="font-medium">{incident.depth_cm} cm</dd>
        </div>
        <div>
          <dt className="text-gray-400">Duration</dt>
          <dd className="font-medium">{incident.duration_minutes} min</dd>
        </div>
        <div>
          <dt className="text-gray-400">Date</dt>
          <dd className="font-medium">{incident.date}</dd>
        </div>
      </dl>
      <p className="text-[10px] text-gray-400">{incident.time}</p>
    </div>
  );
}

export function IncidentPinsLayer() {
  const incidents = useMapStore((s) => s.incidents);

  const markers = useMemo(() => incidents, [incidents]);

  return (
    <>
      {markers.map((incident) => (
        <Marker
          key={incident.incident_id}
          position={[incident.latitude, incident.longitude]}
          icon={incidentIcon(incident.severity)}
        >
          <Popup>
            <IncidentPopup incident={incident} />
          </Popup>
        </Marker>
      ))}
    </>
  );
}
