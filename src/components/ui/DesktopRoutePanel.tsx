import { useState } from "react";
import { ShieldCheck, Zap, AlertTriangle, Play, ChevronDown, ChevronRight, Activity, Mountain, Sparkles, CheckCircle2 } from "lucide-react";
import { RiskBadge, riskLevelFromPct } from "./RiskBadge";
import { RouteExplainer } from "./RouteExplainer";
import { RouteElevationChart } from "./RouteElevationChart";
import { useMapStore } from "@/store/mapStore";

export function DesktopRoutePanel() {
  const appMode = useMapStore((s) => s.appMode);
  const routeStage = useMapStore((s) => s.routeStage);
  const idealRoute = useMapStore((s) => s.idealRoute);
  const safeRoute = useMapStore((s) => s.safeRoute);
  const destination = useMapStore((s) => s.destination);
  const activeRouteTab = useMapStore((s) => s.activeRouteTab);
  const isCalculatingRoute = useMapStore((s) => s.isCalculatingRoute);
  const analyzingProgress = useMapStore((s) => s.analyzingProgress);
  const analyzingText = useMapStore((s) => s.analyzingText);

  const setActiveRouteTab = useMapStore((s) => s.setActiveRouteTab);
  const setNavigating = useMapStore((s) => s.setNavigating);
  const setAppMode = useMapStore((s) => s.setAppMode);
  const setElevationModalOpen = useMapStore((s) => s.setElevationModalOpen);
  const setSmartAnalysisOpen = useMapStore((s) => s.setSmartAnalysisOpen);

  const [activeTab, setActiveTab] = useState<"summary" | "routes" | "intel">("summary");

  if (appMode !== "routes") return null;

  const analysisInProgress = routeStage === "ideal" || routeStage === "analyzing" || isCalculatingRoute;

  // Loading State
  if (analysisInProgress && (!safeRoute || routeStage !== "safe")) {
    const progress = Math.max(15, Math.min(100, analyzingProgress || 25));
    return (
      <div className="w-full rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 p-4 shadow-float space-y-3.5 select-none fade-in">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 truncate">
              {destination?.name?.split(",")[0] ?? "Calculating Route"}
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">Safe Corridor Analysis</p>
          </div>
          <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
            {progress}%
          </span>
        </div>

        <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3 space-y-2.5">
          <div className="flex items-center gap-2.5">
            <svg className="h-4 w-4 animate-spin text-slate-800 flex-shrink-0" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-xs font-semibold text-slate-800 leading-tight truncate">
              {analyzingText || "Evaluating street elevation & underpasses..."}
            </p>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-200/80 overflow-hidden">
            <div className="h-full bg-slate-800 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    );
  }

  if (!safeRoute || !idealRoute) return null;

  const distSafe = (safeRoute.distanceMeters / 1000).toFixed(1);
  const timeSafe = Math.round(safeRoute.durationSeconds / 60);
  const distIdeal = (idealRoute.distanceMeters / 1000).toFixed(1);
  const timeIdeal = Math.round(idealRoute.durationSeconds / 60);
  const timeDiff = Math.round((safeRoute.durationSeconds - idealRoute.durationSeconds) / 60);
  const hazardsAvoided = idealRoute.hazardLocations.length;
  const depthSaved = idealRoute.maxDepthCm;

  return (
    <div className="w-full max-h-[calc(100vh-220px)] overflow-y-auto no-scrollbar rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 p-4 shadow-float space-y-3.5 select-none fade-in">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="min-w-0 pr-2">
          <h2 className="text-base font-bold text-slate-900 tracking-tight truncate leading-tight">
            {destination?.name?.split(",")[0] ?? "Destination"}
          </h2>
          <p className="text-[11px] text-slate-500 font-medium">Safe Corridor Analysis</p>
        </div>

        {/* Compact Tabs */}
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200/60 flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("summary")}
            className={[
              "px-2.5 py-1 text-xs font-semibold rounded-lg transition-all duration-150",
              activeTab === "summary" ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-500 hover:text-slate-800",
            ].join(" ")}
          >
            Summary
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("routes")}
            className={[
              "px-2.5 py-1 text-xs font-semibold rounded-lg transition-all duration-150",
              activeTab === "routes" ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-500 hover:text-slate-800",
            ].join(" ")}
          >
            Routes
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("intel")}
            className={[
              "px-2.5 py-1 text-xs font-semibold rounded-lg transition-all duration-150",
              activeTab === "intel" ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-500 hover:text-slate-800",
            ].join(" ")}
          >
            Intelligence
          </button>
        </div>
      </div>

      {/* --- TAB 1: SUMMARY --- */}
      {activeTab === "summary" && (
        <div className="space-y-3 fade-in">
          {/* PRIMARY RECOMMENDED ROUTE CARD */}
          <div className="rounded-xl bg-slate-50/80 border border-slate-200/80 p-3.5 space-y-2.5 shadow-2xs">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">Recommended Route</p>
                <p className="text-xs font-bold text-slate-900 mt-1 leading-none">High-Ground Safe Corridor</p>
              </div>
              <span className="text-[10px] font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-2xs">
                Safest Choice
              </span>
            </div>

            {/* Time & Distance metrics */}
            <div className="flex items-baseline justify-between pt-0.5">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">{timeSafe}</span>
                <span className="text-xs font-semibold text-slate-500">min</span>
                <span className="text-xs font-mono font-medium text-slate-400 ml-1">· {distSafe} km</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-md font-mono">
                {timeDiff > 0 ? `+${timeDiff} min vs direct` : "Fastest & Safe"}
              </span>
            </div>

            {/* Avoided Flood Intelligence Banner */}
            {hazardsAvoided > 0 && (
              <div className="rounded-lg bg-white border border-slate-200/70 p-2 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium truncate">
                  Bypasses <strong className="text-slate-900 font-bold">{hazardsAvoided} flood zones</strong> on direct road
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-800 bg-slate-100 border border-slate-200/80 px-1.5 py-0.5 rounded ml-2 flex-shrink-0">
                  ~{depthSaved}cm saved
                </span>
              </div>
            )}
          </div>

          {/* Quick Route Explainer */}
          <RouteExplainer safeRoute={safeRoute} idealRoute={idealRoute} />

          {/* Primary CTA */}
          <button
            type="button"
            onClick={() => {
              setNavigating(true);
              setAppMode("navigating");
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-black active:scale-[0.99] py-3 text-sm font-bold text-white shadow-sm transition-all"
          >
            <span>Start Navigation</span>
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Secondary Action */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("routes")}
              className="text-slate-500 hover:text-slate-900 font-medium transition"
            >
              Compare route trajectories ?
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("intel")}
              className="text-slate-500 hover:text-slate-900 font-medium transition"
            >
              Elevation profile ?
            </button>
          </div>
        </div>
      )}

      {/* --- TAB 2: ROUTES COMPARISON --- */}
      {activeTab === "routes" && (
        <div className="space-y-3 fade-in">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Select Trajectory</p>

          <div className="grid grid-cols-2 gap-2.5">
            {/* Safer Route */}
            <button
              type="button"
              onClick={() => setActiveRouteTab("safe")}
              className={[
                "rounded-xl border p-3 text-left transition-all relative",
                activeRouteTab === "safe"
                  ? "border-slate-900 ring-1 ring-slate-900 bg-slate-50/80 shadow-2xs"
                  : "border-slate-200/90 bg-white hover:border-slate-300",
              ].join(" ")}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1 text-xs font-bold text-slate-900">
                  <ShieldCheck className="h-3.5 w-3.5 text-slate-700" />
                  <span>Safer</span>
                </div>
                <span className="text-[9px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-1 py-0.5 rounded">Safest</span>
              </div>
              <p className="text-xl font-extrabold text-slate-900 leading-none mb-1">
                {timeSafe}<span className="text-xs font-semibold text-slate-500"> min</span>
              </p>
              <p className="text-[11px] font-medium text-slate-400 font-mono mb-2">{distSafe} km</p>
              <span className="inline-block text-[10px] font-semibold text-slate-700 bg-slate-100 border border-slate-200/80 px-1.5 py-0.5 rounded">
                Lower Risk
              </span>
            </button>

            {/* Fastest Route */}
            <button
              type="button"
              onClick={() => setActiveRouteTab("ideal")}
              className={[
                "rounded-xl border p-3 text-left transition-all relative",
                activeRouteTab === "ideal"
                  ? "border-slate-900 ring-1 ring-slate-900 bg-slate-50/80 shadow-2xs"
                  : "border-slate-200/90 bg-white hover:border-slate-300",
              ].join(" ")}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1 text-xs font-bold text-slate-900">
                  <Zap className="h-3.5 w-3.5 text-slate-700" />
                  <span>Fastest</span>
                </div>
              </div>
              <p className="text-xl font-extrabold text-slate-900 leading-none mb-1">
                {timeIdeal}<span className="text-xs font-semibold text-slate-500"> min</span>
              </p>
              <p className="text-[11px] font-medium text-slate-400 font-mono mb-2">{distIdeal} km</p>
              <span className="inline-block text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                {idealRoute.maxDepthCm > 30 ? `~${idealRoute.maxDepthCm}cm Water` : "Severe risk"}
              </span>
            </button>
          </div>

          <RouteExplainer safeRoute={safeRoute} idealRoute={idealRoute} />

          <button
            type="button"
            onClick={() => {
              setNavigating(true);
              setAppMode("navigating");
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-black active:scale-[0.99] py-3 text-sm font-bold text-white shadow-sm transition-all"
          >
            <span>Start — {activeRouteTab === "safe" ? timeSafe : timeIdeal} min</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* --- TAB 3: INTELLIGENCE --- */}
      {activeTab === "intel" && (
        <div className="space-y-3 fade-in">
          {/* Elevation Profile */}
          <RouteElevationChart safeRoute={safeRoute} idealRoute={idealRoute} />

          {/* Quick Drawers Launchers */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setElevationModalOpen(true)}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-50 border border-slate-200/80 py-2.5 px-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
            >
              <Mountain className="h-3.5 w-3.5 text-slate-600" />
              Full Elevation
            </button>
            <button
              type="button"
              onClick={() => setSmartAnalysisOpen(true)}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-50 border border-slate-200/80 py-2.5 px-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
            >
              <Sparkles className="h-3.5 w-3.5 text-slate-600" />
              Sensor AI
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setNavigating(true);
              setAppMode("navigating");
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-black active:scale-[0.99] py-3 text-sm font-bold text-white shadow-sm transition-all"
          >
            <span>Start Navigation</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

