import { Mountain, ShieldCheck } from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import { useMapStore } from '@/store/mapStore';

export function ElevationProfileModal() {
  const isOpen = useMapStore((s) => s.isElevationModalOpen);
  const setOpen = useMapStore((s) => s.setElevationModalOpen);
  const safeRoute = useMapStore((s) => s.safeRoute);

  if (!isOpen) return null;

  // Mock elevation profile data along route segments
  const elevationPoints = [224, 226, 225, 221, 219, 218, 222, 225, 227, 226];
  const maxElev = Math.max(...elevationPoints);
  const minElev = Math.min(...elevationPoints);

  return (
    <BottomSheet isOpen={isOpen} onClose={() => setOpen(false)} title="Elevation & Terrain Profile">
      <div className="space-y-4">
        <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Mountain className="h-4 w-4 text-amber-500" /> Route Elevation
            </p>
            <span className="text-xs font-semibold text-slate-700">{minElev}m – {maxElev}m</span>
          </div>

          {/* Visual Elevation Curve / Bars */}
          <div className="flex items-end justify-between gap-1.5 h-24 pt-4 px-2 bg-white rounded-xl border border-slate-100 mb-3">
            {elevationPoints.map((elev, i) => {
              const heightPct = Math.round(((elev - minElev + 2) / (maxElev - minElev + 4)) * 100);
              const isLowPoint = elev === minElev;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <div
                    className={[
                      'w-full rounded-t-md transition-all duration-300',
                      isLowPoint ? 'bg-amber-400' : 'bg-sky-400',
                    ].join(' ')}
                    style={{ height: `${heightPct}%` }}
                  />
                  <span className="text-[9px] font-mono text-slate-400">{elev}m</span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2.5 text-xs text-emerald-800 font-semibold">
            <ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <span>Your route avoids 4 low-lying depression sections on MG Road.</span>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200/80 p-4 space-y-2 text-xs text-slate-600">
          <p className="font-bold text-slate-900 text-sm">Terrain Drainage Assessment</p>
          <p>
            The selected route stays along the NH-48 elevated ridge corridor before descending into Sector 29.
          </p>
          <p className="italic text-slate-400">
            Elevation data derived from SRTM 30m digital elevation model cross-referenced with Gurugram municipal stormwater drains.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="w-full rounded-2xl bg-slate-100 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition"
        >
          Close
        </button>
      </div>
    </BottomSheet>
  );
}
