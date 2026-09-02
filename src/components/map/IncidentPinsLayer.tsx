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
    <div className="min-w-[200px] space-y-2 text-left select-none">
      <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-700" />
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Flood Incident Log</p>
      </div>

      <div>
        <p className="font-bold text-xs text-slate-900 leading-snug">{incident.location_name}</p>
        <p className="text-[11px] text-slate-500">{incident.sector}</p>
      </div>

      <div className="grid grid-cols-2 gap-1.5 pt-0.5 text-center text-xs">
        <div className="rounded-lg bg-slate-50 border border-slate-200/60 p-1.5">
          <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Severity</p>
          <p className="font-bold text-slate-900 mt-0.5">{severityLabel(incident.severity)}</p>
        </div>
        <div className="rounded-lg bg-slate-50 border border-slate-200/60 p-1.5">
          <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Depth</p>
          <p className="font-mono font-bold text-sky-600 mt-0.5">{incident.depth_cm} cm</p>
        </div>
      </div>

      <p className="text-[10px] text-slate-400 font-medium">Logged: {incident.date} · {incident.time}</p>
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
