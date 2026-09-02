import { ChevronDown, CloudRain, Sun, CloudDrizzle } from 'lucide-react';
import { useMapStore } from '@/store/mapStore';

function getRiskLabel(intensity: number): { short: string; color: string } {
  if (intensity < 25) return { short: 'Low risk', color: 'text-emerald-600' };
  if (intensity < 50) return { short: 'Moderate', color: 'text-amber-600' };
  if (intensity < 75) return { short: 'High risk', color: 'text-orange-600' };
  return { short: 'Severe', color: 'text-rose-600' };
}

export function ConditionsPill() {
  const weather = useMapStore((s) => s.weather);
  const stormIntensity = useMapStore((s) => s.stormIntensity);
  const isOpen = useMapStore((s) => s.isConditionsPanelOpen);
  const setOpen = useMapStore((s) => s.setConditionsPanelOpen);

  const rain = weather?.rain ?? 0;
  const { short: riskShort, color: riskColor } = getRiskLabel(stormIntensity);
  const rainLabel = rain === 0 ? 'Dry' : `${rain} mm/h`;

  return (
    <button
      type="button"
      onClick={() => setOpen(!isOpen)}
      aria-label={`Current weather: ${rainLabel}, ${riskShort}. Tap for flood & rain forecast.`}
      aria-expanded={isOpen}
      className={[
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border shadow-xs transition-all duration-150 active:scale-95 flex-shrink-0 backdrop-blur-sm select-none',
        isOpen
          ? 'bg-sky-500 border-sky-500 text-white shadow-glow-sky'
          : 'bg-white/95 border-slate-200/90 text-slate-800 hover:border-slate-300 hover:bg-slate-50',
      ].join(' ')}
    >
      {rain > 10 ? (
        <CloudRain className={['h-3.5 w-3.5', isOpen ? 'text-white' : 'text-sky-500'].join(' ')} aria-hidden="true" />
      ) : rain > 0 ? (
        <CloudDrizzle className={['h-3.5 w-3.5', isOpen ? 'text-white' : 'text-sky-400'].join(' ')} aria-hidden="true" />
      ) : (
        <Sun className={['h-3.5 w-3.5', isOpen ? 'text-white' : 'text-amber-500'].join(' ')} aria-hidden="true" />
      )}

      <span>{rainLabel}</span>
      <span className="text-slate-300">·</span>
      <span className={isOpen ? 'text-sky-100' : riskColor}>{riskShort}</span>
      <ChevronDown className={['h-3 w-3 ml-0.5 transition-transform duration-200', isOpen ? 'rotate-180 text-white' : 'text-slate-400'].join(' ')} aria-hidden="true" />
    </button>
  );
}
