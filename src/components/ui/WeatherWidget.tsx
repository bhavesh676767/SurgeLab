import { CloudRain } from "lucide-react";
import { useMapStore } from "@/store/mapStore";

export function WeatherWidget() {
  const weather = useMapStore((s) => s.weather);

  return (
    <div className="rounded-2xl border border-white/10 bg-black/85 px-4 py-3 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center gap-2 text-xs font-medium text-white/70">
        <CloudRain className="h-3.5 w-3.5 text-sky-400" />
        Live rainfall — Gurugram
      </div>
      {weather ? (
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <Stat label="Rain" value={`${weather.rain} mm`} />
          <Stat label="Precip" value={`${weather.precipitation} mm`} />
          <Stat label="Temp" value={`${weather.temperature}°C`} />
        </div>
      ) : (
        <p className="mt-2 text-xs text-white/40">Streaming Open-Meteo…</p>
      )}
      {weather && (
        <p className="mt-2 text-[10px] text-white/30">
          Updated {new Date(weather.updatedAt).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/5 px-2 py-2">
      <p className="text-[10px] uppercase tracking-wider text-white/40">{label}</p>
      <p className="text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
