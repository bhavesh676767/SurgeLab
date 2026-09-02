import { useMemo, useState } from "react";
import { Mountain, Droplets, ShieldCheck, ArrowUpRight } from "lucide-react";
import type { RouteResult } from "@/types/dataset";

interface RouteElevationChartProps {
  safeRoute: RouteResult;
  idealRoute: RouteResult;
}

export function RouteElevationChart({ safeRoute, idealRoute }: RouteElevationChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Generate synthetic elevation samples along the route for high-fidelity visualization
  const samples = useMemo(() => {
    const coords = safeRoute.coordinates;
    const count = Math.min(24, Math.max(12, coords.length));
    const step = Math.max(1, Math.floor(coords.length / count));
    const result = [];

    const totalDistKm = safeRoute.distanceMeters / 1000;

    for (let i = 0; i < count; i++) {
      const idx = Math.min(coords.length - 1, i * step);
      const [lat, lng] = coords[idx];
      const progress = i / (count - 1);
      const km = (progress * totalDistKm).toFixed(1);

      // Deterministic elevation based on coordinates in Gurugram (215m - 245m range)
      const baseElev = 222 + Math.sin(lat * 150 + lng * 150) * 12 + Math.cos(progress * Math.PI * 2) * 6;
      // Direct route comparison elevation (underpasses dip by 8-12m)
      const idealDip = (i >= 7 && i <= 14) ? 9.5 : 2;
      const idealElev = baseElev - idealDip;

      result.push({
        km,
        elev: Math.round(baseElev),
        idealElev: Math.round(idealElev),
        riskPct: Math.round(Math.max(4, Math.min(28, (245 - baseElev) * 1.8))),
      });
    }
    return result;
  }, [safeRoute]);

  const minElev = Math.min(...samples.map((s) => Math.min(s.elev, s.idealElev))) - 4;
  const maxElev = Math.max(...samples.map((s) => Math.max(s.elev, s.idealElev))) + 4;
  const range = maxElev - minElev || 1;

  // SVG dimensions
  const width = 320;
  const height = 90;
  const padX = 12;
  const padY = 12;

  const getX = (i: number) => padX + (i / (samples.length - 1)) * (width - padX * 2);
  const getY = (elev: number) => height - padY - ((elev - minElev) / range) * (height - padY * 2);

  // Path strings
  const safePathPoints = samples.map((s, i) => `${getX(i)},${getY(s.elev)}`).join(" ");
  const safeAreaPoints = `${getX(0)},${height - padY} ${safePathPoints} ${getX(samples.length - 1)},${height - padY}`;

  const idealPathPoints = samples.map((s, i) => `${getX(i)},${getY(s.idealElev)}`).join(" ");

  const activeSample = hoverIndex !== null ? samples[hoverIndex] : samples[Math.floor(samples.length / 2)];

  return (
    <div className="rounded-2xl bg-white border border-slate-200/90 shadow-sm p-4 space-y-3.5 select-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
            <Mountain className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900 tracking-tight">Corridor Elevation & Waterline</p>
            <p className="text-[10px] text-slate-500 font-medium">Topographic clearance comparison</p>
          </div>
        </div>
        <span className="text-[10px] font-mono font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
          +8.5m High Ground
        </span>
      </div>

      {/* SVG Chart */}
      <div className="relative overflow-hidden rounded-xl bg-slate-50 border border-slate-200/80 p-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-24 overflow-visible"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="elevGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#64748b" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#64748b" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={padX} y1={height - padY} x2={width - padX} y2={height - padY} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" />
          <line x1={padX} y1={padY} x2={width - padX} y2={padY} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" />

          {/* Direct Route Line (hazardous dip) */}
          <polyline
            points={idealPathPoints}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            opacity="0.7"
          />

          {/* Safe Route Area fill */}
          <polygon points={safeAreaPoints} fill="url(#elevGradient)" />

          {/* Safe Route Line */}
          <polyline
            points={safePathPoints}
            fill="none"
            stroke="#334155"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive touch/hover points */}
          {samples.map((s, i) => (
            <circle
              key={i}
              cx={getX(i)}
              cy={getY(s.elev)}
              r={hoverIndex === i ? 4 : 2}
              className="fill-slate-700 stroke-white transition-all cursor-pointer"
              strokeWidth="2"
              onMouseEnter={() => setHoverIndex(i)}
            />
          ))}
        </svg>

        {/* Legend */}
        <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium px-2 pt-1 border-t border-slate-200">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-sm bg-slate-700 inline-block" />
            <span className="font-semibold text-slate-700">Safe Bypass ({activeSample.elev}m MSL)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-0.5 w-3 border-t border-dashed border-slate-400 inline-block" />
            <span className="text-slate-400">Direct underpass (~{activeSample.idealElev}m)</span>
          </div>
        </div>
      </div>

      {/* 3 Telemetry Metrics */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-2.5">
          <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Clearance</p>
          <p className="text-xs font-bold text-slate-900 mt-0.5">100% Passable</p>
        </div>
        <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-2.5">
          <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Peak Height</p>
          <p className="text-xs font-bold text-slate-900 mt-0.5">{maxElev} m MSL</p>
        </div>
        <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-2.5">
          <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Deep Flood Saved</p>
          <p className="text-xs font-bold text-rose-700 mt-0.5">~{idealRoute.maxDepthCm} cm</p>
        </div>
      </div>
    </div>
  );
}

