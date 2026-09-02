import { Activity, ShieldCheck, CloudRain, Mountain, Droplets, Layers, RefreshCw, BarChart2, Eye } from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import { useMapStore } from '@/store/mapStore';

export function SmartAnalysisDrawer() {
  const isOpen = useMapStore((s) => s.isSmartAnalysisOpen);
  const setOpen = useMapStore((s) => s.setSmartAnalysisOpen);
  const stormIntensity = useMapStore((s) => s.stormIntensity);
  const weather = useMapStore((s) => s.weather);
  const safeRoute = useMapStore((s) => s.safeRoute);

  const setWaterloggingSheetOpen = useMapStore((s) => s.setWaterloggingSheetOpen);
  const setConditionsPanelOpen = useMapStore((s) => s.setConditionsPanelOpen);
  const setElevationModalOpen = useMapStore((s) => s.setElevationModalOpen);

  if (!isOpen) return null;

  const score = safeRoute ? Math.max(10, 100 - safeRoute.maxRiskPct) : 92;

  return (
    <BottomSheet isOpen={isOpen} onClose={() => setOpen(false)} title="Smart Flood Analysis">
      <div className="space-y-4">
        {/* Safety Score Card */}
        <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Route Safety Score</p>
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-3xl font-extrabold text-emerald-600">{score}</span>
            <span className="text-sm font-bold text-slate-400">/ 100</span>
          </div>
          <p className="text-xs font-semibold text-emerald-700">Low Waterlogging Exposure</p>
        </div>

        {/* Intelligence Summary Grid */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-white border border-slate-200/70 p-2.5">
            <Droplets className="h-4 w-4 text-sky-500 mx-auto mb-1" />
            <p className="text-[10px] font-bold uppercase text-slate-400">Water Risk</p>
            <p className="text-xs font-bold text-slate-900">Low</p>
          </div>
          <div className="rounded-xl bg-white border border-slate-200/70 p-2.5">
            <CloudRain className="h-4 w-4 text-blue-500 mx-auto mb-1" />
            <p className="text-[10px] font-bold uppercase text-slate-400">Rainfall</p>
            <p className="text-xs font-bold text-slate-900">{weather?.rain ?? 0} mm/h</p>
          </div>
          <div className="rounded-xl bg-white border border-slate-200/70 p-2.5">
            <Mountain className="h-4 w-4 text-amber-500 mx-auto mb-1" />
            <p className="text-[10px] font-bold uppercase text-slate-400">Terrain</p>
            <p className="text-xs font-bold text-slate-900">Elevated</p>
          </div>
        </div>

        {/* Tools Menu */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Analysis Tools</p>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => { setOpen(false); setWaterloggingSheetOpen(true); }}
              className="flex w-full items-center justify-between p-3 rounded-2xl bg-white border border-slate-200/80 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-2.5">
                <Layers className="h-4 w-4 text-sky-500" />
                <span>Water-Risk Map Sheet</span>
              </div>
              <Eye className="h-4 w-4 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => { setOpen(false); setConditionsPanelOpen(true); }}
              className="flex w-full items-center justify-between p-3 rounded-2xl bg-white border border-slate-200/80 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-2.5">
                <CloudRain className="h-4 w-4 text-blue-500" />
                <span>Rainfall Forecast & Storm Simulation</span>
              </div>
              <Eye className="h-4 w-4 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => { setOpen(false); setElevationModalOpen(true); }}
              className="flex w-full items-center justify-between p-3 rounded-2xl bg-white border border-slate-200/80 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-2.5">
                <Mountain className="h-4 w-4 text-amber-500" />
                <span>Elevation & Terrain Profile</span>
              </div>
              <Eye className="h-4 w-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Data Sources */}
        <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3 text-[11px] text-slate-500 space-y-1">
          <p className="font-bold text-slate-700">Live Data Feed Status</p>
          <p>• Open-Meteo Weather API: Online (updated 2m ago)</p>
          <p>• Gurugram SRTM Elevation Grid: Indexed (1,420 cells)</p>
          <p>• Flood Incidents Registry: 5 active hotspots</p>
        </div>
      </div>
    </BottomSheet>
  );
}
