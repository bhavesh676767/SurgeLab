import { ArrowUp, CornerUpLeft, CornerUpRight, X, Flag, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useMapStore } from '@/store/mapStore';
import { useNavigationEngine } from '@/hooks/useNavigationEngine';
import { navigationEngine } from '@/services/navigationEngine';
import { useEffect, useState } from 'react';
import type { NavigationState } from '@/services/navigationEngine';

function getManeuverIcon(instruction: string) {
  const lower = instruction.toLowerCase();
  if (lower.includes('left'))  return <CornerUpLeft  className="h-8 w-8 text-white" aria-hidden="true" />;
  if (lower.includes('right')) return <CornerUpRight className="h-8 w-8 text-white" aria-hidden="true" />;
  return <ArrowUp className="h-8 w-8 text-white" aria-hidden="true" />;
}

function formatDistance(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.round(m)} m`;
}

export function NavigationHUD() {
  const isNavigating = useMapStore((s) => s.isNavigating);
  const safeRoute = useMapStore((s) => s.safeRoute);
  const idealRoute = useMapStore((s) => s.idealRoute);
  const currentStepIndex = useMapStore((s) => s.currentStepIndex);
  const showHazardCallout = useMapStore((s) => s.showHazardCallout);
  const isRerouting = useMapStore((s) => s.isRerouting);
  const simulationMode = useMapStore((s) => s.simulationMode);
  const clearNavigation = useMapStore((s) => s.clearNavigation);
  const setAppMode = useMapStore((s) => s.setAppMode);

  const [navState, setNavState] = useState<NavigationState | null>(null);

  // Mount the navigation engine
  useNavigationEngine();

  // Subscribe to engine state updates
  useEffect(() => {
    if (!isNavigating) return;
    const unsub = navigationEngine.on((event) => {
      if (event.type === 'state') setNavState(event.state);
    });
    return unsub;
  }, [isNavigating]);

  if (!isNavigating || !safeRoute) return null;

  const steps = safeRoute.steps;
  const currentStep = steps[currentStepIndex];
  const nextStep = steps[currentStepIndex + 1];

  const distRemaining = navState?.distanceRemaining ?? safeRoute.distanceMeters;
  const durRemaining = navState?.durationRemaining ?? safeRoute.durationSeconds;

  const avoidedCount = idealRoute?.hazardLocations.length ?? 0;
  const maxDirectDepth = idealRoute?.maxDepthCm ?? 0;

  const statusPill = isRerouting
    ? { text: 'Recalculating…', cls: 'bg-sky-100 text-sky-700' }
    : showHazardCallout
    ? { text: 'Estimated flood risk ahead', cls: 'bg-amber-100 text-amber-700' }
    : avoidedCount > 0
    ? { text: `Safe detour: bypassing ${avoidedCount} flood zone${avoidedCount > 1 ? 's' : ''} (${maxDirectDepth}cm on direct road)`, cls: 'bg-emerald-50 text-emerald-800 border border-emerald-200/80' }
    : { text: 'Safe corridor nominal', cls: 'bg-green-100 text-green-700' };

  return (
    <>
      {/* Top bar — sleek glass HUD */}
      <div className="pointer-events-auto fixed top-0 left-0 right-0 z-[1900] bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-card">
        <div className="flex items-center justify-between gap-3 px-4 py-3 max-w-lg mx-auto">
          <button
            type="button"
            onClick={() => { clearNavigation(); setAppMode('home'); }}
            aria-label="Exit navigation"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-all active:scale-90 flex-shrink-0"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
          <div className="flex-1 text-center">
            <p className="text-xl font-black text-slate-900 tracking-tight leading-none">
              {Math.round(durRemaining / 60)} min
            </p>
            <p className="text-xs font-semibold text-slate-400 mt-1">{formatDistance(distRemaining)} remaining</p>
          </div>
          {simulationMode ? (
            <span className="flex-shrink-0 rounded-full bg-orange-100 border border-orange-200 px-2.5 py-0.5 text-[10px] font-bold text-orange-700 uppercase tracking-wider">
              SIM
            </span>
          ) : (
            <div className="w-9 flex-shrink-0" />
          )}
        </div>
      </div>

      {/* Bottom card — turn-by-turn guidance dock */}
      <div className="pointer-events-auto fixed bottom-0 left-0 right-0 z-[1900] bg-white/95 backdrop-blur-md rounded-t-3xl shadow-sheet border-t border-slate-200/90 max-w-lg mx-auto slide-up">
        <div className="px-5 pt-4 pb-safe pb-6">
          {/* Current maneuver */}
          {currentStep ? (
            <div className="flex items-center gap-4">
              <div className="flex h-13 w-13 flex-shrink-0 items-center justify-center rounded-2xl bg-sky-500 shadow-card shadow-sky-500/30 text-white">
                {getManeuverIcon(currentStep.instruction)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-black text-slate-900 tracking-tight leading-snug">{currentStep.instruction}</p>
                <p className="mt-0.5 text-xs font-bold text-sky-600">
                  {navState?.distanceToManeuver && navState.distanceToManeuver > 0
                    ? formatDistance(navState.distanceToManeuver)
                    : currentStep.distanceM > 0 ? formatDistance(currentStep.distanceM) : 'Arriving soon'}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="flex h-13 w-13 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-500 shadow-card shadow-emerald-500/30 text-white">
                <Flag className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <p className="text-lg font-black text-slate-900">Arriving Destination</p>
                <p className="text-xs font-semibold text-emerald-600">You have reached your safe destination</p>
              </div>
            </div>
          )}

          {/* Next maneuver preview */}
          {nextStep && (
            <div className="mt-3 flex items-center gap-2 rounded-2xl bg-slate-50 border border-slate-200/70 px-3.5 py-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex-shrink-0">Next</span>
              <p className="text-xs font-medium text-slate-700 truncate">{nextStep.instruction}</p>
              {nextStep.distanceM > 0 && (
                <span className="ml-auto flex-shrink-0 text-xs font-semibold text-slate-400">{formatDistance(nextStep.distanceM)}</span>
              )}
            </div>
          )}

          {/* Live route status pill */}
          <div className={['mt-2.5 flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold', statusPill.cls].join(' ')}>
            {isRerouting ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-sky-600" aria-hidden="true" />
            ) : showHazardCallout ? (
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
            )}
            <span>{statusPill.text}</span>
          </div>
        </div>
      </div>
    </>
  );
}
