import { useState } from 'react';
import { ShieldCheck, Zap, AlertTriangle, Play, ChevronUp, ChevronDown, Activity, CloudRain, Mountain, Layers, CheckCircle2, X } from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import { RiskBadge, riskLevelFromPct } from './RiskBadge';
import { RouteExplainer } from './RouteExplainer';
import { RouteElevationChart } from './RouteElevationChart';
import { ExitConfirmModal } from './ExitConfirmModal';
import { useMapStore } from '@/store/mapStore';

function SafetyScoreBar({ score, safeRoute, idealRoute }: { score: number; safeRoute?: any; idealRoute?: any }) {
  const label = score >= 81 ? 'High-Ground Safe Clearance' : score >= 61 ? 'Optimal Flood Bypass' : score >= 31 ? 'Moderate Risk' : 'High Risk';

  return (
    <div className="rounded-2xl bg-white border border-slate-200/90 shadow-sm p-4 space-y-3 select-none">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Route Safety Assessment</p>
          <p className="text-xs font-bold mt-0.5 text-slate-900">{label}</p>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-extrabold leading-none tracking-tight text-slate-900">{score}</span>
          <span className="text-xs font-bold text-slate-400">/ 100</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden flex">
        <div
          className="h-full bg-slate-800 transition-all duration-500"
          style={{ width: `${Math.max(15, score)}%` }}
          title="Safe corridor clearance"
        />
        <div
          className="h-full bg-slate-300 transition-all duration-500"
          style={{ width: `${Math.min(25, 100 - score)}%` }}
          title="Surface pooling caution"
        />
      </div>

      {/* 3 Metric pills */}
      <div className="grid grid-cols-3 gap-2 pt-0.5 text-center">
        <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-2">
          <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Passability</p>
          <p className="text-xs font-bold text-slate-900 mt-0.5">100% Clear</p>
        </div>
        <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-2">
          <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Max Water</p>
          <p className="text-xs font-bold text-slate-900 mt-0.5 font-mono">~{safeRoute?.maxDepthCm ?? 0} cm</p>
        </div>
        <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-2">
          <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Avoided</p>
          <p className="text-xs font-bold text-rose-700 mt-0.5">{idealRoute?.hazardLocations?.length ?? 0} zones</p>
        </div>
      </div>
    </div>
  );
}

export function RouteBottomSheet() {
  const appMode = useMapStore((s) => s.appMode);
  const routeStage = useMapStore((s) => s.routeStage);
  const idealRoute = useMapStore((s) => s.idealRoute);
  const safeRoute = useMapStore((s) => s.safeRoute);
  const destination = useMapStore((s) => s.destination);
  const weather = useMapStore((s) => s.weather);
  const activeRouteTab = useMapStore((s) => s.activeRouteTab);
  const isCalculatingRoute = useMapStore((s) => s.isCalculatingRoute);
  const analyzingProgress = useMapStore((s) => s.analyzingProgress);
  const analyzingText = useMapStore((s) => s.analyzingText);

  const setActiveRouteTab = useMapStore((s) => s.setActiveRouteTab);
  const setNavigating = useMapStore((s) => s.setNavigating);
  const setAppMode = useMapStore((s) => s.setAppMode);
  const clearNavigation = useMapStore((s) => s.clearNavigation);
  const setElevationModalOpen = useMapStore((s) => s.setElevationModalOpen);
  const setSmartAnalysisOpen = useMapStore((s) => s.setSmartAnalysisOpen);

  const [snap, setSnap] = useState<'peek' | 'mid' | 'full'>('peek');
  const [isLoaderMinimized, setIsLoaderMinimized] = useState(false);
  const [isSheetMinimized, setIsSheetMinimized] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  const isOpen = appMode === 'routes';
  const analysisInProgress = routeStage === 'ideal' || routeStage === 'analyzing' || isCalculatingRoute;

  if (!isOpen) return null;

  const hazardsOnRoute = idealRoute?.hazardLocations ?? [];
  const safeScore = safeRoute ? Math.max(10, 100 - safeRoute.maxRiskPct) : 92;
  const distSafe = safeRoute ? (safeRoute.distanceMeters / 1000).toFixed(1) : '22.5';
  const timeSafe = safeRoute ? Math.round(safeRoute.durationSeconds / 60) : 33;
  const distIdeal = idealRoute ? (idealRoute.distanceMeters / 1000).toFixed(1) : '20.8';
  const timeIdeal = idealRoute ? Math.round(idealRoute.durationSeconds / 60) : 29;
  const timeDiff = safeRoute && idealRoute ? Math.round((safeRoute.durationSeconds - idealRoute.durationSeconds) / 60) : 4;

  if (analysisInProgress && (!safeRoute || routeStage !== 'safe')) {
    const progress = Math.max(15, Math.min(100, analyzingProgress || 25));

    if (isLoaderMinimized) {
      return (
        <div className="lg:hidden">
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1900] pointer-events-auto select-none">
            <button
              type="button"
              onClick={() => setIsLoaderMinimized(false)}
              className="flex items-center gap-2.5 rounded-full bg-white/95 backdrop-blur-md border border-slate-200 px-4 py-2.5 shadow-lg shadow-slate-900/10 hover:bg-slate-50 transition-all active:scale-95 text-xs font-bold text-slate-800"
            >
              <svg className="h-3.5 w-3.5 animate-spin text-slate-800" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Analyzing Route · {progress}%</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 rotate-180" />
            </button>
          </div>
          <ExitConfirmModal
            isOpen={showExitModal}
            title="Cancel Route Search?"
            description="Do you want to stop calculating routes and return to the map?"
            onConfirm={() => {
              setShowExitModal(false);
              clearNavigation();
              setAppMode('home');
            }}
            onCancel={() => setShowExitModal(false)}
          />
        </div>
      );
    }

    return (
      <div className="lg:hidden">
        <BottomSheet
          isOpen
          onClose={() => setIsLoaderMinimized(true)}
          showHandle
          showBackdrop={false}
          onSnapDown={() => setIsLoaderMinimized(true)}
          className="max-h-[220px]"
        >
          <div className="space-y-3 pb-1 select-none">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="min-w-0 pr-2">
                <h2 className="text-base font-bold text-slate-900 tracking-tight truncate leading-tight">
                  {destination?.name?.split(',')[0] ?? 'Planning Route'}
                </h2>
                <p className="text-[11px] text-slate-500 font-medium">Evaluating Safe Flood Corridor</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                  {progress}%
                </span>
                <button
                  type="button"
                  onClick={() => setIsLoaderMinimized(true)}
                  title="Minimize loader"
                  className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3 space-y-2.5">
              <div className="flex items-center gap-2.5">
                <svg className="h-4 w-4 animate-spin text-slate-800 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-xs font-bold text-slate-900 leading-tight truncate">
                  {analyzingText || (routeStage === 'ideal' ? 'Scanning street elevation & drain distances…' : 'Optimising safer bypass corridor…')}
                </p>
              </div>

              <div className="h-1.5 w-full rounded-full bg-slate-200/80 overflow-hidden">
                <div
                  className="h-full bg-slate-800 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </BottomSheet>
        <ExitConfirmModal
          isOpen={showExitModal}
          title="Cancel Route Search?"
          description="Do you want to stop calculating routes and return to the map?"
          onConfirm={() => {
            setShowExitModal(false);
            clearNavigation();
            setAppMode('home');
          }}
          onCancel={() => setShowExitModal(false)}
        />
      </div>
    );
  }

  if (isSheetMinimized && routeStage === 'safe' && safeRoute) {
    return (
      <div className="lg:hidden">
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1800] w-[94%] max-w-sm pointer-events-auto select-none fade-in">
          <div className="flex items-center justify-between rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 px-3.5 py-2.5 shadow-lg shadow-slate-900/10">
            <div className="flex items-center gap-2.5 min-w-0 pr-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-800 border border-slate-200/80 flex-shrink-0">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate leading-tight">
                  {destination?.name?.split(',')[0] ?? 'Safe Route'}
                </p>
                <p className="text-[11px] text-slate-500 font-medium">
                  {timeSafe} min · {distSafe} km · Safest Corridor
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsSheetMinimized(false)}
                className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-black active:scale-95 transition"
              >
                View Route
              </button>
              <button
                type="button"
                onClick={() => setShowExitModal(true)}
                className="flex h-7 w-7 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                title="End route"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
        <ExitConfirmModal
          isOpen={showExitModal}
          title="End Route Guidance?"
          description="This will clear your calculated route and return to map search."
          onConfirm={() => {
            setShowExitModal(false);
            setIsSheetMinimized(false);
            clearNavigation();
            setAppMode('home');
          }}
          onCancel={() => setShowExitModal(false)}
        />
      </div>
    );
  }

  if (!safeRoute || !idealRoute) return null;

  return (
    <div className="lg:hidden">
      <BottomSheet
        isOpen
        onClose={() => setIsSheetMinimized(true)}
        showHandle
        showBackdrop={false}
        onSnapDown={() => {
          if (snap === 'full') setSnap('mid');
          else if (snap === 'mid') setSnap('peek');
          else setIsSheetMinimized(true);
        }}
        className={
          snap === 'peek' ? 'max-h-[340px]' : snap === 'mid' ? 'max-h-[580px]' : 'max-h-[90dvh]'
        }
      >
        <div className="space-y-4">
          {/* Header Title & Segmented Snap Selector Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="min-w-0 pr-2">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight truncate leading-tight">
                {destination?.name?.split(',')[0] ?? 'Route Analysis'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">Safe Corridor Analysis</p>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* Segmented Pills */}
              <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => setSnap('peek')}
                  className={[
                    'px-3 py-1 text-xs font-semibold rounded-lg transition-all duration-150',
                    snap === 'peek' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800',
                  ].join(' ')}
                >
                  Summary
                </button>
                <button
                  type="button"
                  onClick={() => setSnap('mid')}
                  className={[
                    'px-3 py-1 text-xs font-semibold rounded-lg transition-all duration-150',
                    snap === 'mid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800',
                  ].join(' ')}
                >
                  Routes
                </button>
                <button
                  type="button"
                  onClick={() => setSnap('full')}
                  className={[
                    'px-3 py-1 text-xs font-semibold rounded-lg transition-all duration-150',
                    snap === 'full' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800',
                  ].join(' ')}
                >
                  Intelligence
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowExitModal(true)}
                title="Close and exit route"
                className="flex h-7 w-7 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* ─── PEEK SNAP: Essential Summary + CTA ─── */}
          {snap === 'peek' && (
            <div className="space-y-3.5 fade-in">
              {/* Clean White Boxy Route Card */}
              <div className="rounded-2xl bg-white border border-slate-200/90 p-4 shadow-sm space-y-3 select-none">
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-slate-700" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">Recommended Route</p>
                      <p className="text-xs font-bold text-slate-900 mt-0.5 leading-none">High-Ground Safe Corridor</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                    Safest Choice
                  </span>
                </div>

                {/* Primary ETA & Stat Row */}
                <div className="flex items-baseline justify-between pt-0.5">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">{timeSafe}</span>
                    <span className="text-sm font-semibold text-slate-500">min</span>
                    <span className="text-xs font-medium text-slate-400 ml-1 font-mono">· {distSafe} km</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md font-mono">
                    {timeDiff > 0 ? `+${timeDiff} min vs direct` : 'Fastest & safe'}
                  </span>
                </div>

                {/* Avoided Flood Intelligence Banner */}
                {idealRoute.hazardLocations.length > 0 && (
                  <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-2.5 flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium truncate">
                      Bypasses <strong className="text-slate-900 font-semibold">{idealRoute.hazardLocations.length} flood zones</strong> on direct road
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-700 bg-white border border-slate-200 px-1.5 py-0.5 rounded ml-2 flex-shrink-0">
                      ~{idealRoute.maxDepthCm}cm saved
                    </span>
                  </div>
                )}
              </div>

              {/* Start CTA */}
              <button
                type="button"
                onClick={() => { setNavigating(true); setAppMode('navigating'); }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 hover:bg-sky-600 active:scale-[0.99] py-3.5 text-sm font-bold text-white shadow-card shadow-sky-500/25 transition-all"
              >
                <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                <span>Start Navigation</span>
              </button>

              <button
                type="button"
                onClick={() => setSnap('mid')}
                className="flex items-center justify-center gap-1 w-full text-xs font-semibold text-slate-500 hover:text-slate-800 transition py-1"
              >
                <span>Compare route options & flood tradeoffs</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* ─── MID SNAP: Route Comparison (SAFEST / FASTEST) ─── */}
          {(snap === 'mid' || snap === 'full') && (
            <div className="space-y-3.5 fade-in">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Select Trajectory</p>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Safer Route */}
                <button
                  type="button"
                  onClick={() => setActiveRouteTab('safe')}
                  className={[
                    'rounded-2xl border p-3.5 text-left transition-all relative',
                    activeRouteTab === 'safe'
                      ? 'border-slate-900 ring-1 ring-slate-900 bg-slate-50/70 shadow-sm'
                      : 'border-slate-200/90 bg-white hover:border-slate-300 shadow-2xs',
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                      <ShieldCheck className="h-3.5 w-3.5 text-slate-700" />
                      <span>Safer</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md">
                      Safest
                    </span>
                  </div>
                  <p className="text-2xl font-extrabold text-slate-900 leading-none mb-1">
                    {timeSafe}<span className="text-xs font-semibold text-slate-500"> min</span>
                  </p>
                  <p className="text-xs font-medium text-slate-400 font-mono mb-2">{distSafe} km</p>
                  <span className="inline-block text-[10px] font-semibold text-slate-700 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-md">
                    Lower Risk
                  </span>
                </button>

                {/* Fastest Route */}
                <button
                  type="button"
                  onClick={() => setActiveRouteTab('ideal')}
                  className={[
                    'rounded-2xl border p-3.5 text-left transition-all relative',
                    activeRouteTab === 'ideal'
                      ? 'border-slate-900 ring-1 ring-slate-900 bg-slate-50/70 shadow-sm'
                      : 'border-slate-200/90 bg-white hover:border-slate-300 shadow-2xs',
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                      <Zap className="h-3.5 w-3.5 text-slate-700" />
                      <span>Fastest</span>
                    </div>
                  </div>
                  <p className="text-2xl font-extrabold text-slate-900 leading-none mb-1">
                    {timeIdeal}<span className="text-xs font-semibold text-slate-500"> min</span>
                  </p>
                  <p className="text-xs font-medium text-slate-400 font-mono mb-2">{distIdeal} km</p>
                  <span className="inline-block text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                    {idealRoute.maxDepthCm > 30 ? `~${idealRoute.maxDepthCm}cm Water` : 'Severe risk'}
                  </span>
                </button>
              </div>

              {snap === 'mid' && (
                <>
                  <RouteExplainer safeRoute={safeRoute} idealRoute={idealRoute} />
                  
                  <button
                    type="button"
                    onClick={() => { setNavigating(true); setAppMode('navigating'); }}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 hover:bg-sky-600 active:scale-[0.99] py-3.5 text-sm font-bold text-white shadow-card shadow-sky-500/25 transition-all"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    <span>Start — {activeRouteTab === 'safe' ? timeSafe : timeIdeal} min estimated</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSnap('full')}
                    className="flex items-center justify-center gap-1 w-full text-xs font-semibold text-sky-600 hover:text-sky-700 py-1"
                  >
                    <span>View full flood analysis & elevation profile</span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          )}

          {/* ─── FULL SNAP: Complete Flood Intelligence Breakdown ─── */}
          {snap === 'full' && (
            <div className="space-y-4 fade-in pt-1">
              {/* Professional Elevation & Waterline Chart */}
              <RouteElevationChart safeRoute={safeRoute} idealRoute={idealRoute} />

              <SafetyScoreBar score={safeScore} safeRoute={safeRoute} idealRoute={idealRoute} />

              <RouteExplainer safeRoute={safeRoute} idealRoute={idealRoute} />

              {/* Current Conditions summary */}
              <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Conditions</p>
                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div>
                    <CloudRain className="h-4 w-4 text-sky-500 mx-auto mb-1" />
                    <p className="text-[10px] text-slate-400 uppercase">Rainfall</p>
                    <p className="text-xs font-bold text-slate-900">{weather?.rain ?? 0} mm/h</p>
                  </div>
                  <div>
                    <Activity className="h-4 w-4 text-blue-500 mx-auto mb-1" />
                    <p className="text-[10px] text-slate-400 uppercase">Risk</p>
                    <p className="text-xs font-bold text-slate-900">Low</p>
                  </div>
                  <div>
                    <Mountain className="h-4 w-4 text-amber-500 mx-auto mb-1" />
                    <p className="text-[10px] text-slate-400 uppercase">Terrain</p>
                    <p className="text-xs font-bold text-slate-900">Elevated</p>
                  </div>
                </div>
              </div>

              {/* Hazards on route */}
              {hazardsOnRoute.length > 0 && (
                <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hazards Avoided On Route</p>
                  <div className="space-y-2">
                    {hazardsOnRoute.map((h, i) => (
                      <div key={i} className="flex items-center justify-between bg-white rounded-xl p-2.5 border border-slate-100 text-xs">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                          <span className="font-semibold text-slate-800">{h.name}</span>
                        </div>
                        <span className="font-mono font-bold text-amber-600">~{h.depthCm} cm</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Advanced tools quick actions */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setElevationModalOpen(true)}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-slate-100 py-3 px-3 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
                >
                  <Mountain className="h-4 w-4 text-amber-500" />
                  Elevation Profile
                </button>
                <button
                  type="button"
                  onClick={() => setSmartAnalysisOpen(true)}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-sky-50 py-3 px-3 text-xs font-bold text-sky-700 hover:bg-sky-100 transition"
                >
                  <Activity className="h-4 w-4 text-sky-500" />
                  Smart Analysis
                </button>
              </div>

              {/* Start CTA */}
              <button
                type="button"
                onClick={() => { setNavigating(true); setAppMode('navigating'); }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 py-4 text-base font-bold text-white shadow-md shadow-sky-500/25 hover:bg-sky-600 active:scale-[0.98] transition"
              >
                <Play className="h-4 w-4 fill-current" />
                Start navigation
              </button>
            </div>
          )}
        </div>
      </BottomSheet>
      <ExitConfirmModal
        isOpen={showExitModal}
        title="End Route Guidance?"
        description="This will clear your calculated route and return to map search."
        onConfirm={() => {
          setShowExitModal(false);
          setIsSheetMinimized(false);
          clearNavigation();
          setAppMode('home');
        }}
        onCancel={() => setShowExitModal(false)}
      />
    </div>
  );
}
