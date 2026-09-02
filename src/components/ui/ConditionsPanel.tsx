import { useState } from 'react';
import { ChevronDown, ChevronUp, Thermometer, Droplets, Clock, AlertTriangle, CloudRain } from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import { RiskBadge, riskLevelFromPct } from './RiskBadge';
import { useMapStore } from '@/store/mapStore';

const FORECAST_PRESETS = [
  { label: 'Current', delta: 0 },
  { label: '+30 min', delta: 10 },
  { label: '+60 min', delta: 20 },
  { label: 'Heavy', fixed: 85 },
] as const;

export function ConditionsPanel() {
  const weather = useMapStore((s) => s.weather);
  const stormIntensity = useMapStore((s) => s.stormIntensity);
  const isOpen = useMapStore((s) => s.isConditionsPanelOpen);
  const setOpen = useMapStore((s) => s.setConditionsPanelOpen);
  const setStormIntensity = useMapStore((s) => s.setStormIntensity);

  const [forecastExpanded, setForecastExpanded] = useState(false);
  const [activePreset, setActivePreset] = useState<number>(0);

  const rain = weather?.rain ?? 0;
  const temp = weather?.temperature ?? null;
  const precip = weather?.precipitation ?? 0;
  const updatedAt = weather?.updatedAt
    ? new Date(weather.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  const riskLevel = riskLevelFromPct(stormIntensity);

  const applyPreset = (idx: number) => {
    setActivePreset(idx);
    const p = FORECAST_PRESETS[idx];
    if ('fixed' in p) {
      setStormIntensity(p.fixed);
    } else {
      setStormIntensity(Math.min(100, stormIntensity + p.delta));
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={() => setOpen(false)} title="Current conditions">
      {/* Main stats */}
      <div className="grid grid-cols-3 gap-3 mt-2">
        <StatCard
          icon={<CloudRain className="h-5 w-5 text-sky-500" aria-hidden="true" />}
          label="Rainfall"
          value={weather ? `${rain} mm/hr` : '—'}
          sub={rain > 15 ? 'Heavy rain' : rain > 5 ? 'Light rain' : 'No rain'}
        />
        <StatCard
          icon={<Thermometer className="h-5 w-5 text-orange-400" aria-hidden="true" />}
          label="Temperature"
          value={temp !== null ? `${temp}°C` : '—'}
        />
        <StatCard
          icon={<Droplets className="h-5 w-5 text-sky-400" aria-hidden="true" />}
          label="Precipitation"
          value={weather ? `${precip} mm` : '—'}
        />
      </div>

      {/* Risk assessment */}
      <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Estimated flood risk</p>
          <RiskBadge level={riskLevel} size="sm" />
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Based on current storm intensity ({stormIntensity}%) and terrain drainage data.
        </p>
      </div>

      {/* Freshness */}
      <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        {updatedAt ? `Rainfall data: Updated at ${updatedAt}` : 'Loading live data…'}
      </div>

      {/* Disclaimer */}
      <p className="mt-2 text-xs italic text-slate-400 leading-relaxed">
        Risk estimates are based on available data and may not reflect current conditions exactly.
        Conditions may change quickly.
      </p>

      {/* Divider */}
      <div className="my-4 h-px bg-slate-100" />

      {/* Rainfall Forecast — collapsible */}
      <button
        type="button"
        onClick={() => setForecastExpanded((e) => !e)}
        className="flex w-full items-center justify-between py-1 text-sm font-semibold text-slate-700 hover:text-slate-900 transition"
        aria-expanded={forecastExpanded}
      >
        <span>Rainfall forecast</span>
        <div className="flex items-center gap-1 text-slate-400 text-xs">
          <span>Advanced</span>
          {forecastExpanded
            ? <ChevronUp className="h-4 w-4" aria-hidden="true" />
            : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
        </div>
      </button>

      {forecastExpanded && (
        <div className="mt-3 space-y-4 fade-in">
          {/* Preset buttons */}
          <div className="grid grid-cols-4 gap-2">
            {FORECAST_PRESETS.map((p, i) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(i)}
                className={[
                  'rounded-xl py-2 text-xs font-semibold border transition',
                  activePreset === i
                    ? 'bg-sky-500 text-white border-sky-500'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-sky-300',
                ].join(' ')}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Fine-tune slider */}
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Intensity</span>
              <span className="font-semibold text-slate-700">{stormIntensity}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={stormIntensity}
              onChange={(e) => {
                setStormIntensity(Number(e.target.value));
                setActivePreset(-1);
              }}
              className="w-full h-1.5 appearance-none rounded-full bg-slate-200 accent-sky-500 cursor-pointer"
              aria-label="Storm intensity simulation"
            />
          </div>

          {/* Live feedback */}
          <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2 text-xs text-slate-600">
            Simulating <span className="font-semibold text-slate-900">{stormIntensity}%</span> storm intensity
          </div>

          {stormIntensity > 60 && (
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" aria-hidden="true" />
              Under these conditions, some roads may become high risk. Routes will update automatically.
            </div>
          )}

          <p className="text-[11px] text-slate-400 italic">
            For simulation and planning only. Conditions may differ from actual future rainfall.
          </p>
        </div>
      )}
    </BottomSheet>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-white border border-slate-100 p-3 text-center shadow-sm">
      <div className="flex justify-center mb-1">{icon}</div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-sm font-bold text-slate-900">{value}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}
