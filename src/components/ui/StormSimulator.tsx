import { Droplets } from "lucide-react";
import { useMapStore } from "@/store/mapStore";

export function StormSimulator() {
  const stormIntensity = useMapStore((s) => s.stormIntensity);
  const setStormIntensity = useMapStore((s) => s.setStormIntensity);

  return (
    <div className="rounded-2xl border border-white/10 bg-black/85 px-4 py-3 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-medium text-white/70">
          <Droplets className="h-3.5 w-3.5 text-cyan-400" />
          Storm intensity simulation
        </div>
        <span className="font-mono text-xs text-white/50">{stormIntensity}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={stormIntensity}
        onChange={(e) => setStormIntensity(Number(e.target.value))}
        className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-cyan-400"
        aria-label="Storm intensity simulation"
      />
      <p className="mt-1.5 text-[10px] text-white/35">
        Simulates heavier rainfall — road colors update in real time
      </p>
    </div>
  );
}
