import { useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import type { RouteResult } from '@/types/dataset';

interface RouteExplainerProps {
  safeRoute: RouteResult;
  idealRoute: RouteResult;
  className?: string;
}

export function RouteExplainer({ safeRoute, idealRoute, className = '' }: RouteExplainerProps) {
  const [expanded, setExpanded] = useState(true);

  const timeDiffMin = Math.round((safeRoute.durationSeconds - idealRoute.durationSeconds) / 60);
  const avoidedHazards = idealRoute.hazardLocations;
  const underpasses = avoidedHazards.filter((h) => h.isUnderpass).length;

  const points: { title: string; subtitle?: string; type: 'success' | 'warning' }[] = [];

  if (avoidedHazards.length > 0) {
    points.push({
      title: `Avoids ${avoidedHazards.length} severe flood zone${avoidedHazards.length > 1 ? 's' : ''} on direct road`,
      subtitle: `Direct path has up to ${idealRoute.maxDepthCm} cm depth (High vehicle stall risk)`,
      type: 'success',
    });
  }

  if (underpasses > 0) {
    points.push({
      title: `Bypasses ${underpasses} submerged underpass${underpasses > 1 ? 'es' : ''}`,
      subtitle: 'Underpasses accumulate deep water rapidly during heavy rainfall',
      type: 'success',
    });
  }

  if (safeRoute.avgRiskPct < idealRoute.avgRiskPct) {
    points.push({
      title: 'Prioritizes higher elevation corridor',
      subtitle: `Route risk score reduced from ${idealRoute.maxRiskPct}% down to ${safeRoute.maxRiskPct}%`,
      type: 'success',
    });
  }

  if (timeDiffMin > 0) {
    points.push({
      title: `Only ${timeDiffMin} min longer for significantly higher safety`,
      subtitle: 'Calculated using optimal high-ground street bypass',
      type: 'success',
    });
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="flex items-center justify-between w-full rounded-2xl bg-white border border-slate-200/90 p-3.5 text-left hover:bg-slate-50 transition-all duration-150 shadow-2xs select-none"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-slate-700 flex-shrink-0" />
          <span className="text-xs font-bold text-slate-900">
            Why take this route? ({avoidedHazards.length > 0 ? `Avoids ${avoidedHazards.length} flood areas` : 'Safer terrain'})
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-slate-500" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-500" aria-hidden="true" />
        )}
      </button>

      {expanded && (
        <div className="mt-2.5 rounded-2xl bg-white border border-slate-200/90 p-4 space-y-3.5 fade-in select-none shadow-sm">
          {/* Specific Hazards List on Direct Route */}
          {avoidedHazards.length > 0 && (
            <div className="space-y-2 pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Avoided Hazards On Direct Route:
                </p>
                <span className="text-[10px] font-semibold text-slate-400">Direct Road</span>
              </div>
              <div className="space-y-1.5">
                {avoidedHazards.map((h, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-xl bg-slate-50/70 border border-slate-200/80 px-3 py-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{h.name}</p>
                        <p className="text-[10px] text-slate-500">{h.isUnderpass ? 'Submerged Underpass' : 'Low Drainage Street'}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <span className="inline-block font-mono text-[11px] font-bold text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                        ~{h.depthCm} cm
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Advantages of Safe Route */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Route Intelligence Rationale:
            </p>
            <ul className="space-y-2">
              {points.map((point, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-700 flex-shrink-0 mt-0.5">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-slate-900">{point.title}</p>
                    {point.subtitle && (
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">{point.subtitle}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-[10px] italic text-slate-400 leading-tight pt-1 border-t border-slate-100">
            Calculated from terrain elevation models, live rainfall intensity, and drainage basin data.
          </p>
        </div>
      )}
    </div>
  );
}
