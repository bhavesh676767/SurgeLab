import { X, AlertTriangle } from 'lucide-react';
import { useMapStore } from '@/store/mapStore';

export function HazardCallout() {
  const showHazardCallout = useMapStore((s) => s.showHazardCallout);
  const isNavigating = useMapStore((s) => s.isNavigating);
  const safeRoute = useMapStore((s) => s.safeRoute);
  const setShowHazardCallout = useMapStore((s) => s.setShowHazardCallout);
  const setActiveRouteTab = useMapStore((s) => s.setActiveRouteTab);

  if (!showHazardCallout || !isNavigating) return null;

  const hazard = safeRoute?.hazardLocations[0];

  return (
    <div
      className="pointer-events-auto fixed bottom-52 left-4 right-4 z-[1800] max-w-lg mx-auto hazard-callout-enter"
      role="alert"
      aria-live="assertive"
    >
      <div className="bg-white rounded-2xl shadow-xl border-l-4 border-amber-400 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100">
              <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Waterlogging ahead</p>
              {hazard ? (
                <p className="text-xs text-slate-600 mt-0.5">
                  Estimated {hazard.depthCm} cm depth — {hazard.name}
                </p>
              ) : (
                <p className="text-xs text-slate-600 mt-0.5">
                  Estimated high water risk — approach with caution
                </p>
              )}
              <p className="text-xs text-slate-400 mt-0.5">Conditions may change quickly</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowHazardCallout(false)}
            aria-label="Dismiss hazard warning"
            className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => { setActiveRouteTab('safe'); setShowHazardCallout(false); }}
            className="flex-1 rounded-xl border border-sky-300 py-2 text-xs font-semibold text-sky-600 hover:bg-sky-50 transition"
          >
            View safer option
          </button>
          <button
            type="button"
            onClick={() => setShowHazardCallout(false)}
            className="rounded-xl px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 transition"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
