import { useState, useEffect } from "react";
import { Map as MapIcon, Layers, Check } from "lucide-react";
import { useMapStore, type BasemapMode } from "@/store/mapStore";

export function SatellitePromptModal() {
  const basemapMode = useMapStore((s) => s.basemapMode);
  const setBasemapMode = useMapStore((s) => s.setBasemapMode);

  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<BasemapMode>("satellite");

  useEffect(() => {
    const hasPrompted = localStorage.getItem("surgelab_satellite_prompted");
    if (!hasPrompted) {
      const timer = setTimeout(() => setIsOpen(true), 700);
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
      className="fixed inset-0 z-[2500] flex items-center justify-center p-4 bg-black/20 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="satellite-modal-title"
    >
      <div className="w-full max-w-[360px] rounded-2xl bg-white border border-slate-200/90 shadow-lg p-6 text-center select-none">

        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 border border-slate-200/80">
          <img
            src="/logo/visual_logo.png"
            alt="SurgeLab"
            className="h-7 w-7 object-contain brightness-0"
            width={28}
            height={28}
          />
        </div>

        <h2
          id="satellite-modal-title"
          className="text-lg font-bold text-slate-900 tracking-tight"
        >
          Choose Map Style
        </h2>
        <p className="mt-1.5 text-xs text-slate-500 font-normal leading-relaxed px-2">
          SurgeLab highlights flood-prone roads and safe corridors.
          Select your preferred basemap.
        </p>

        <div className="mt-5 space-y-2 text-left">

          <button
            type="button"
            onClick={() => setSelected("standard")}
            className={[
              "flex w-full items-center gap-3 rounded-xl p-3.5 border transition-all duration-150 active:scale-[0.99]",
              selected === "standard"
                ? "border-slate-900 bg-slate-50"
                : "border-slate-200/90 bg-white hover:bg-slate-50",
            ].join(" ")}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 border border-slate-200/70 flex-shrink-0">
              <MapIcon className="h-4 w-4 text-slate-700" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-900">Standard Street</span>
                <span className="rounded-md bg-slate-100 border border-slate-200/80 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 uppercase tracking-wide">
                  Recommended
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-normal mt-0.5 truncate">High-contrast flood risk visibility</p>
            </div>
            <div className={[
              "h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all",
              selected === "standard" ? "border-slate-900 bg-slate-900" : "border-slate-300",
            ].join(" ")}>
              {selected === "standard" && <Check className="h-3 w-3 text-white stroke-[3]" />}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSelected("satellite")}
            className={[
              "flex w-full items-center gap-3 rounded-xl p-3.5 border transition-all duration-150 active:scale-[0.99]",
              selected === "satellite"
                ? "border-slate-900 bg-slate-50"
                : "border-slate-200/90 bg-white hover:bg-slate-50",
            ].join(" ")}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 flex-shrink-0">
              <Layers className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold text-slate-900">Satellite View</span>
              <p className="text-[11px] text-slate-400 font-normal mt-0.5 truncate">Photorealistic terrain &amp; aerial imagery</p>
            </div>
            <div className={[
              "h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all",
              selected === "satellite" ? "border-slate-900 bg-slate-900" : "border-slate-300",
            ].join(" ")}>
              {selected === "satellite" && <Check className="h-3 w-3 text-white stroke-[3]" />}
            </div>
          </button>
        </div>

        <div className="mt-5 space-y-2.5">
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full rounded-xl bg-slate-900 hover:bg-black active:scale-[0.99] py-3 text-sm font-bold text-white transition-all"
          >
            {selected === "satellite" ? "Enable Satellite View" : "Continue with Standard Map"}
          </button>
          <p className="text-[11px] text-slate-400 font-medium">You can change this anytime in Settings</p>
        </div>
      </div>
    </div>
  );
}
