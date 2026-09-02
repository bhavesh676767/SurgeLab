import { Plus, Minus, Locate, Satellite, Droplets } from "lucide-react";
import { useMap } from "react-leaflet";
import { useLocation } from "@/hooks/useLocation";
import { useMapStore } from "@/store/mapStore";

export function CustomControls() {
  const map = useMap();
  const flyTo = useMapStore((s) => s.flyTo);
  const setUserLocation = useMapStore((s) => s.setUserLocation);
  const viewport = useMapStore((s) => s.viewport);
  const basemapMode = useMapStore((s) => s.basemapMode);
  const toggleSatellite = useMapStore((s) => s.toggleSatellite);
  const isWaterloggingSheetOpen = useMapStore((s) => s.isWaterloggingSheetOpen);
  const setWaterloggingSheetOpen = useMapStore((s) => s.setWaterloggingSheetOpen);

  const { requestLocation } = useLocation({
    onLocation: (loc, acc) => {
      setUserLocation(loc, acc);
      flyTo(loc, 15);
    },
  });

  return (
    <>
      <div className="pointer-events-none absolute bottom-6 right-4 z-[1000] flex flex-col items-end gap-3 sm:bottom-8 sm:right-6">
        <div className="pointer-events-auto flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/85 shadow-2xl backdrop-blur-xl">
          <ControlButton onClick={() => map.zoomIn()} label="Zoom in">
            <Plus className="h-4 w-4" />
          </ControlButton>
          <div className="h-px bg-white/10" />
          <ControlButton onClick={() => map.zoomOut()} label="Zoom out">
            <Minus className="h-4 w-4" />
          </ControlButton>
        </div>

        <ControlButton onClick={requestLocation} label="My location" rounded>
          <Locate className="h-4 w-4" />
        </ControlButton>

        <ControlButton
          onClick={toggleSatellite}
          label={basemapMode === "satellite" ? "Standard map" : "Satellite map"}
          rounded
          active={basemapMode === "satellite"}
        >
          <Satellite className="h-4 w-4" />
        </ControlButton>
      </div>

      {/* Waterlogging Map Sheet Trigger Button */}
      <div className="absolute left-4 top-72 z-[1100] sm:left-6">
        <button
          type="button"
          onClick={() => setWaterloggingSheetOpen(!isWaterloggingSheetOpen)}
          aria-label="Open Waterlogging Map Sheet"
          aria-expanded={isWaterloggingSheetOpen}
          className={`flex h-11 items-center gap-2.5 rounded-2xl border px-3.5 text-xs font-bold shadow-2xl backdrop-blur-xl transition active:scale-95 ${
            isWaterloggingSheetOpen
              ? "border-cyan-400 bg-cyan-400 text-black shadow-cyan-400/25"
              : "border-white/15 bg-black/90 text-white hover:border-cyan-400/50 hover:bg-white/10"
          }`}
        >
          <Droplets className={`h-4 w-4 ${isWaterloggingSheetOpen ? "text-black" : "text-cyan-400"}`} />
          <span>Waterlogging Sheet</span>
          <div className="h-2 w-7 rounded-full bg-gradient-to-r from-emerald-400 via-yellow-400 to-red-500 shadow-sm" />
        </button>
      </div>

      <div className="pointer-events-none absolute bottom-6 left-4 z-[1000] sm:bottom-8 sm:left-6">
        <div className="rounded-xl border border-white/10 bg-black/75 px-3 py-2 font-mono text-[10px] text-white/60 backdrop-blur-md sm:text-xs">
          <span>
            {viewport.center.lat.toFixed(4)}, {viewport.center.lng.toFixed(4)}
          </span>
          <span className="mx-2 text-white/30">|</span>
          <span>Zoom {viewport.zoom}</span>
        </div>
      </div>
    </>
  );
}

function ControlButton({
  children,
  onClick,
  label,
  rounded,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  rounded?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active ?? false}
      className={`flex h-10 w-10 items-center justify-center text-white/80 transition hover:bg-white/10 hover:text-white ${
        rounded
          ? "rounded-2xl border border-white/10 bg-black/85 shadow-2xl backdrop-blur-xl"
          : ""
      } ${active ? "bg-white/15 text-white ring-1 ring-white/25" : ""}`}
    >
      {children}
    </button>
  );
}
