import { RefreshCw } from 'lucide-react';
import { useMapStore } from '@/store/mapStore';

export function RerouteAlert() {
  const showRerouteAlert = useMapStore((s) => s.showRerouteAlert);
  const isNavigating = useMapStore((s) => s.isNavigating);
  const safeRoute = useMapStore((s) => s.safeRoute);
  const idealRoute = useMapStore((s) => s.idealRoute);
  const setShowRerouteAlert = useMapStore((s) => s.setShowRerouteAlert);
  const setActiveRouteTab = useMapStore((s) => s.setActiveRouteTab);

  if (!showRerouteAlert || !isNavigating) return null;

  const timeDiff = safeRoute && idealRoute
    ? Math.abs(Math.round((safeRoute.durationSeconds - idealRoute.durationSeconds) / 60))
    : 0;

  return (
    <div
      className="pointer-events-auto fixed bottom-52 left-4 right-4 z-[1850] max-w-lg mx-auto sheet-enter"
      role="alert"
      aria-live="polite"
    >
      <div className="bg-white rounded-2xl shadow-xl border-l-4 border-sky-500 p-4">
        <div className="flex items-center gap-2 mb-1">
          <RefreshCw className="h-4 w-4 text-sky-500" aria-hidden="true" />
          <p className="text-sm font-bold text-slate-900">Conditions changed</p>
        </div>
        <p className="text-xs text-slate-600 mb-3">
          Estimated risk on your current route has increased.
        </p>
        {safeRoute && (
          <p className="text-xs text-sky-600 font-semibold mb-3">
            Estimated safer route found{timeDiff > 0 ? ` · +${timeDiff} min` : ''}
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setActiveRouteTab('safe'); setShowRerouteAlert(false); }}
            className="flex-1 rounded-xl bg-sky-500 py-2.5 text-xs font-semibold text-white hover:bg-sky-600 active:scale-95 transition"
          >
            Switch to safer route
          </button>
          <button
            type="button"
            onClick={() => setShowRerouteAlert(false)}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
          >
            Keep current
          </button>
        </div>
      </div>
    </div>
  );
}
