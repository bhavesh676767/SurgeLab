import { useState, useEffect } from "react";
import { Map as MapIcon, Layers, Check } from "lucide-react";
import { useMapStore, type BasemapMode } from "@/store/mapStore";

export function SatellitePromptModal() {
  const basemapMode = useMapStore((s) => s.basemapMode);
  const setBasemapMode = useMapStore((s) => s.setBasemapMode);

  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<BasemapMode>(basemapMode);

  useEffect(() => {
    // Show on first visit after a brief pause
    const hasPrompted = localStorage.getItem("surgelab_satellite_prompted");
    if (!hasPrompted) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!isOpen) return null;

  const handleConfirm = () => {
    setBasemapMode(selected);
    localStorage.setItem("surgelab_satellite_prompted", "true");
    setIsOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-[2500] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="satellite-modal-title"
    >
      <div className="w-full max-w-[360px] rounded-[32px] bg-white/95 backdrop-blur-2xl border border-white/80 shadow-2xl p-6 text-center animate-slide-up select-none">
        {/* App visual logo inverted to crisp black */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 border border-slate-200/80 shadow-xs">
          <img
            src="/logo/visual_logo.png"
            alt="SurgeLab"
            className="h-8 w-8 object-contain brightness-0"
            width={32}
            height={32}
          />
        </div>

        {/* Title & Description */}
        <h2 id="satellite-modal-title" className="text-xl font-bold text-slate-900 tracking-tight">
          Choose Map Style
        </h2>
        <p className="mt-1.5 text-xs text-slate-500 font-normal leading-relaxed px-1">
          SurgeLab highlights flood-prone roads and safe corridors. Select your preferred basemap.
        </p>

        {/* 2 Options */}
        <div className="mt-5 space-y-2.5">
          {/* Option 1: Standard Street Map */}
          <button
            type="button"
            onClick={() => setSelected("standard")}
            className={[
              "flex w-full items-center gap-3.5 rounded-2xl p-3 text-left transition-all duration-150 border active:scale-[0.98]",
              selected === "standard"
                ? "bg-sky-50/70 border-sky-500 ring-2 ring-sky-500/20 shadow-xs"
                : "bg-slate-50/80 border-slate-200/80 hover:bg-slate-100/70",
            ].join(" ")}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-700 border border-slate-200/70 shadow-xs flex-shrink-0">
              <MapIcon className="h-5 w-5 text-sky-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-slate-900">Standard Street</span>
                <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-1.5 py-0.5 text-[9px] font-bold">
                  Recommended
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-normal truncate mt-0.5">High-contrast flood risk visibility</p>
            </div>
            <div className={["h-5 w-5 rounded-full flex items-center justify-center transition-all flex-shrink-0", selected === "standard" ? "bg-sky-500 text-white" : "border-2 border-slate-300"].join(" ")}>
              {selected === "standard" && <Check className="h-3.5 w-3.5 stroke-[3]" />}
            </div>
          </button>

          {/* Option 2: Satellite Map */}
          <button
            type="button"
            onClick={() => setSelected("satellite")}
            className={[
              "flex w-full items-center gap-3.5 rounded-2xl p-3 text-left transition-all duration-150 border active:scale-[0.98]",
              selected === "satellite"
                ? "bg-sky-50/70 border-sky-500 ring-2 ring-sky-500/20 shadow-xs"
                : "bg-slate-50/80 border-slate-200/80 hover:bg-slate-100/70",
            ].join(" ")}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xs flex-shrink-0">
              <Layers className="h-5 w-5 text-sky-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-slate-900">Satellite View</span>
              </div>
              <p className="text-[11px] text-slate-500 font-normal truncate mt-0.5">Photorealistic terrain & aerial imagery</p>
            </div>
            <div className={["h-5 w-5 rounded-full flex items-center justify-center transition-all flex-shrink-0", selected === "satellite" ? "bg-sky-500 text-white" : "border-2 border-slate-300"].join(" ")}>
              {selected === "satellite" && <Check className="h-3.5 w-3.5 stroke-[3]" />}
            </div>
          </button>
        </div>

        {/* Action button */}
        <div className="mt-6 space-y-2">
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full rounded-2xl bg-sky-500 hover:bg-sky-600 active:scale-[0.98] py-3.5 text-sm font-bold text-white shadow-card shadow-sky-500/25 transition-all"
          >
            {selected === "satellite" ? "Enable Satellite View" : "Continue with Standard Map"}
          </button>
          <p className="text-[11px] text-slate-400 font-medium">You can change this anytime in Settings</p>
        </div>
      </div>
    </div>
  );
}

