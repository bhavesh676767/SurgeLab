import { X } from "lucide-react";
import { useMapStore } from "@/store/mapStore";
import { riskColorHex } from "@/services/riskColorPalette";
import {
  passabilityWarning,
  predictedDepthCm,
  riskStatusLabel,
} from "@/services/terrainRiskEngine";

export function TerrainInspector() {
  const selected = useMapStore((s) => s.selectedTerrain);
  const setSelectedTerrain = useMapStore((s) => s.setSelectedTerrain);

  if (!selected) return null;

  const depth = predictedDepthCm(selected.riskPct, selected.depthCm);
  const status = riskStatusLabel(selected.riskPct);
  const warning = passabilityWarning(selected.riskPct, selected.underpass);

  return (
    <div
      className="pointer-events-auto fixed bottom-24 left-4 right-4 z-[1100] mx-auto max-w-md sm:bottom-28 sm:left-6 sm:right-auto"
      role="dialog"
      aria-label="Terrain risk details"
    >
      <div
        className="rounded-2xl border border-white/15 bg-black/70 p-4 shadow-2xl backdrop-blur-xl"
        style={{
          boxShadow:
            "0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-cyan-400/80">
              Painted terrain risk
            </p>
            <h2 className="text-sm font-semibold leading-snug text-white">
              {selected.label}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setSelectedTerrain(null)}
            className="shrink-0 rounded-lg p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
          <div>
            <dt className="text-white/45">Risk status</dt>
            <dd className="font-semibold text-white">{status}</dd>
          </div>
          <div>
            <dt className="text-white/45">Predicted risk</dt>
            <dd className="flex items-center gap-2 font-semibold">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-white/20"
                style={{ backgroundColor: riskColorHex(selected.riskPct) }}
              />
              <span className="text-white">{selected.riskPct.toFixed(0)}%</span>
            </dd>
          </div>
          <div>
            <dt className="text-white/45">Water depth</dt>
            <dd className="font-semibold text-cyan-200">{depth} cm</dd>
          </div>
          <div>
            <dt className="text-white/45">Source</dt>
            <dd className="font-medium text-white/80">
              {selected.source === "incident" ? "Field report" : "ML terrain"}
            </dd>
          </div>
        </dl>

        <p className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs leading-relaxed text-white/75">
          <span className="font-medium text-white">Passability: </span>
          {warning}
        </p>
      </div>
    </div>
  );
}
