import { useState, useRef, useEffect } from "react";
import { Droplets, CloudRain, Mountain, Car, ShieldCheck, ChevronDown, ChevronUp, Layers, Check } from "lucide-react";
import { useMapStore } from "@/store/mapStore";

interface LegendRow {
  color: string;
  label: string;
  depth: string;
  textColor: string;
}

const LEGEND_ROWS: LegendRow[] = [
  { color: "bg-emerald-500", label: "Dry / Passable", depth: "0–5 cm", textColor: "text-emerald-700" },
  { color: "bg-amber-400", label: "Surface pooling", depth: "5–15 cm", textColor: "text-amber-700" },
  { color: "bg-orange-500", label: "Moderate flooding", depth: "15–30 cm", textColor: "text-orange-700" },
  { color: "bg-rose-500", label: "Dangerous", depth: "30–50 cm", textColor: "text-rose-700" },
  { color: "bg-purple-600", label: "Submerged", depth: "50+ cm", textColor: "text-purple-700" },
];

export function WaterRiskLayerControl() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"layers" | "legend">("layers");
  const layerVisibility = useMapStore((s) => s.layerVisibility);
  const setLayerVisibility = useMapStore((s) => s.setLayerVisibility);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  const layerItems = [
    { key: "waterRisk" as const, Icon: Droplets, label: "Water Risk", desc: "Active · Recommended", alwaysOn: true },
    { key: "rainfall" as const, Icon: CloudRain, label: "Flood Depth & Rain", desc: "Live radar precipitation", alwaysOn: false },
    { key: "terrain" as const, Icon: Mountain, label: "Elevation & Terrain", desc: "Gurugram topographic clearance", alwaysOn: false },
    { key: "traffic" as const, Icon: Car, label: "Traffic Flow", desc: "Coming soon", alwaysOn: false, disabled: true },
  ];

  return (
    <div ref={popoverRef} className="pointer-events-auto relative select-none">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label="Map layers and water risk guide"
        className="group flex h-10 items-center gap-2 rounded-xl bg-white/95 backdrop-blur-md px-3.5 shadow-sm border border-slate-200/90 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:text-slate-900 active:scale-95 transition-all duration-150"
      >
        <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-sky-50 text-sky-600 group-hover:bg-sky-500 group-hover:text-white transition-colors">
          <Droplets className="h-3.5 w-3.5" aria-hidden="true" />
        </div>
        <span>Water Risk</span>
        <ChevronDown className={["h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 transition-transform duration-200", isOpen ? "rotate-180" : ""].join(" ")} />
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div className="absolute bottom-12 left-0 z-[1500] w-64 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 p-3.5 shadow-xl fade-in space-y-3">
          {/* Header with mini tabs */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5 border border-slate-200/60">
              <button
                type="button"
                onClick={() => setActiveTab("layers")}
                className={[
                  "px-2.5 py-1 text-[11px] font-semibold rounded-md transition",
                  activeTab === "layers" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800",
                ].join(" ")}
              >
                Layers
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("legend")}
                className={[
                  "px-2.5 py-1 text-[11px] font-semibold rounded-md transition",
                  activeTab === "legend" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800",
                ].join(" ")}
              >
                Depth Guide
              </button>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Map View</span>
          </div>

          {/* Tab 1: Layers */}
          {activeTab === "layers" && (
            <div className="space-y-1">
              {layerItems.map(({ key, Icon, label, desc, alwaysOn, disabled }) => {
                const checked = layerVisibility[key];
                return (
                  <div key={key} className="flex items-center justify-between py-1.5 px-1.5 rounded-lg hover:bg-slate-50/80 transition">
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <Icon className="h-4 w-4 text-slate-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className={["text-xs font-semibold leading-tight", disabled ? "text-slate-400" : "text-slate-900"].join(" ")}>
                          {label}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">{desc}</p>
                      </div>
                    </div>

                    {/* Switch */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={alwaysOn ? true : checked}
                      disabled={disabled || alwaysOn}
                      onClick={() => !alwaysOn && !disabled && setLayerVisibility({ [key]: !checked })}
                      className={[
                        "relative inline-flex h-4.5 w-8.5 flex-shrink-0 items-center rounded-full transition-colors",
                        alwaysOn || checked ? "bg-slate-900" : "bg-slate-200",
                        disabled ? "opacity-30 cursor-not-allowed" : alwaysOn ? "cursor-default" : "cursor-pointer",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "inline-block h-3 w-3 transform rounded-full bg-white shadow-xs transition-transform duration-200",
                          alwaysOn || checked ? "translate-x-4.5" : "translate-x-0.5",
                        ].join(" ")}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab 2: Depth Legend */}
          {activeTab === "legend" && (
            <div className="space-y-2 py-0.5">
              <ul className="space-y-1.5">
                {LEGEND_ROWS.map((row) => (
                  <li key={row.label} className="flex items-center gap-2">
                    <span className={["h-2 w-2 rounded-full flex-shrink-0", row.color].join(" ")} />
                    <span className={["text-xs font-medium flex-1", row.textColor].join(" ")}>{row.label}</span>
                    <span className="text-[11px] font-mono text-slate-400 font-bold ml-auto">{row.depth}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[10px] italic text-slate-400 pt-1 border-t border-slate-100">
                Estimated from terrain elevation & live precipitation.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

