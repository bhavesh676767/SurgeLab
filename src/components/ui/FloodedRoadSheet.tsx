import { BottomSheet } from './BottomSheet';
import { RiskBadge, riskLevelFromDepth } from './RiskBadge';
import { useMapStore } from '@/store/mapStore';
import { Clock, AlertTriangle } from 'lucide-react';

function passabilityLabel(depthCm: number): string {
  if (depthCm < 15) return 'Generally passable';
  if (depthCm < 30) return 'Caution advised';
  if (depthCm < 50) return 'Not recommended';
  return 'Avoid — impassable';
}

export function FloodedRoadSheet() {
  const floodedRoadInfo = useMapStore((s) => s.floodedRoadInfo);
  const setFloodedRoadInfo = useMapStore((s) => s.setFloodedRoadInfo);

  const isOpen = floodedRoadInfo !== null;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={() => setFloodedRoadInfo(null)}
      title="Road risk"
    >
      {floodedRoadInfo && (
        <div className="space-y-4">
          {/* Road name + badge */}
          <div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">{floodedRoadInfo.name}</h3>
            <RiskBadge level={riskLevelFromDepth(floodedRoadInfo.depthCm)} size="md" />
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Estimated depth</p>
              <p className="text-2xl font-bold text-slate-900">
                {floodedRoadInfo.depthCm}
                <span className="text-sm font-normal text-slate-500"> cm</span>
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Passability</p>
              <p className="text-sm font-bold text-slate-900 leading-snug">{passabilityLabel(floodedRoadInfo.depthCm)}</p>
            </div>
          </div>

          {/* Reason */}
          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Reason</p>
            <p className="text-sm text-slate-700">{floodedRoadInfo.reason}</p>
          </div>

          {/* Freshness */}
          <div className={['flex items-center gap-1.5 text-xs', floodedRoadInfo.updatedMinutesAgo > 10 ? 'text-amber-600' : 'text-slate-400'].join(' ')}>
            {floodedRoadInfo.updatedMinutesAgo > 10
              ? <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              : <Clock className="h-3.5 w-3.5" aria-hidden="true" />}
            {floodedRoadInfo.updatedMinutesAgo > 10
              ? `Data may be outdated — last updated ${floodedRoadInfo.updatedMinutesAgo} min ago`
              : `Updated ${floodedRoadInfo.updatedMinutesAgo} min ago`}
          </div>

          {/* Trust disclaimer */}
          <p className="text-xs italic text-slate-400 leading-relaxed">
            Depth is estimated based on rainfall, terrain and historical data.
            Always verify conditions before proceeding.
          </p>

          <div className="h-px bg-slate-100" />

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setFloodedRoadInfo(null)}
              className="flex-1 rounded-2xl bg-sky-500 py-3.5 text-sm font-semibold text-white hover:bg-sky-600 active:scale-95 transition"
            >
              Avoid this road
            </button>
            <button
              type="button"
              onClick={() => setFloodedRoadInfo(null)}
              className="rounded-2xl border border-slate-200 px-5 py-3.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
