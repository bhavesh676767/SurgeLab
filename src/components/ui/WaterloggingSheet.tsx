import { useState } from 'react';
import { useMapStore } from '@/store/mapStore';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { RiskBadge, riskLevelFromPct } from '@/components/ui/RiskBadge';
import { MapPin, ChevronDown, ChevronUp, Droplets } from 'lucide-react';

interface HotspotItem {
  id: string;
  name: string;
  category: string;
  coords: [number, number];
  baseRiskPct: number;
  isUnderpass: boolean;
  notes: string;
}

const GURUGRAM_HOTSPOTS: HotspotItem[] = [
  { id: 'hero-honda', name: 'Hero Honda Chowk Underpass', category: 'Submerged underpass', coords: [28.4361, 77.02762], baseRiskPct: 88, isUnderpass: true, notes: 'Low elevation depression along NH-48. Critical drainage accumulation point.' },
  { id: 'golf-course', name: 'Golf Course Road (Genpact Underpass)', category: 'Submerged underpass', coords: [28.4552, 77.0984], baseRiskPct: 82, isUnderpass: true, notes: 'Rapid stormwater runoff ingress during cloudbursts.' },
  { id: 'rajiv-chowk', name: 'Rajiv Chowk Junction', category: 'Major junction', coords: [28.45951, 77.03139], baseRiskPct: 75, isUnderpass: true, notes: 'Heavy traffic junction prone to water accumulation on service lanes.' },
  { id: 'iffco', name: 'IFFCO Chowk Flyover Below', category: 'Highway interconnect', coords: [28.47167, 77.07337], baseRiskPct: 68, isUnderpass: false, notes: 'Service lanes waterlog during >25 mm/hr rain intensity.' },
  { id: 'medanta', name: 'Medanta Hospital Underpass', category: 'Hospital corridor', coords: [28.43841, 77.04083], baseRiskPct: 78, isUnderpass: true, notes: 'Critical medical corridor requiring real-time flood monitoring.' },
];

const COLOR_ROWS = [
  { swatch: 'bg-green-500',  label: 'Dry / Passable',    depth: '0–5 cm',  passability: 'Safe',                textColor: 'text-green-700' },
  { swatch: 'bg-yellow-400', label: 'Surface pooling',   depth: '5–15 cm', passability: 'Caution',             textColor: 'text-amber-700' },
  { swatch: 'bg-orange-500', label: 'Moderate flooding', depth: '15–30 cm',passability: 'Proceed carefully',   textColor: 'text-orange-700' },
  { swatch: 'bg-red-500',    label: 'Severe flooding',   depth: '30–50 cm',passability: 'Not recommended',     textColor: 'text-red-700' },
  { swatch: 'bg-purple-600', label: 'Submerged',         depth: '50+ cm',  passability: 'Avoid — impassable',  textColor: 'text-purple-700' },
];

export function WaterloggingSheet() {
  const isOpen = useMapStore((s) => s.isWaterloggingSheetOpen);
  const setOpen = useMapStore((s) => s.setWaterloggingSheetOpen);
  const flyTo = useMapStore((s) => s.flyTo);
  const stormIntensity = useMapStore((s) => s.stormIntensity);

  const [mlExpanded, setMlExpanded] = useState(false);

  return (
    <BottomSheet isOpen={isOpen} onClose={() => setOpen(false)} title="Water risk guide">
      {/* Colour legend */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Road risk colours</p>
        <div className="space-y-2">
          {COLOR_ROWS.map((row) => (
            <div key={row.label} className="flex items-center gap-3 py-1">
              {/* Road swatch */}
              <div className={['h-2 w-12 rounded-full flex-shrink-0', row.swatch].join(' ')} aria-hidden="true" />
              <span className={['text-sm font-medium flex-1', row.textColor].join(' ')}>{row.label}</span>
              <span className="text-xs text-slate-400 flex-shrink-0">{row.depth}</span>
              <span className="text-xs text-slate-400 flex-shrink-0 hidden sm:block">{row.passability}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] italic text-slate-400 leading-relaxed">
          Colours are estimated based on terrain, drain distances, and rainfall. Not measured directly.
        </p>
      </div>

      <div className="my-4 h-px bg-slate-100" />

      {/* Hotspots */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Gurugram flood hotspots</p>
        <div className="space-y-3">
          {GURUGRAM_HOTSPOTS.map((spot) => {
            const liveRisk = Math.min(100, Math.round(spot.baseRiskPct * (0.5 + stormIntensity / 200)));
            return (
              <div key={spot.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{spot.name}</p>
                    <p className="text-xs text-slate-400 mb-2">{spot.category}</p>
                    <RiskBadge level={riskLevelFromPct(liveRisk)} size="sm" />
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">{spot.notes}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { flyTo({ lat: spot.coords[0], lng: spot.coords[1] }, 16); setOpen(false); }}
                    aria-label={`Fly to ${spot.name} on map`}
                    className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200 text-sky-500 hover:bg-sky-50 hover:border-sky-300 transition"
                  >
                    <MapPin className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <p className="mt-2 text-[10px] text-slate-400">Updated just now</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="my-4 h-px bg-slate-100" />

      {/* How risk is estimated — collapsible */}
      <button
        type="button"
        onClick={() => setMlExpanded((e) => !e)}
        aria-expanded={mlExpanded}
        className="flex w-full items-center justify-between py-1 text-sm font-medium text-slate-700 hover:text-slate-900 transition"
      >
        How is risk estimated?
        {mlExpanded
          ? <ChevronUp className="h-4 w-4 text-slate-400" aria-hidden="true" />
          : <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />}
      </button>

      {mlExpanded && (
        <div className="mt-3 rounded-2xl bg-slate-50 border border-slate-100 p-4 text-xs text-slate-600 leading-relaxed space-y-2 fade-in">
          <p>
            <strong className="text-slate-900">Terrain slope</strong> — lower-lying roads and drainage basins accumulate water faster.
          </p>
          <p>
            <strong className="text-slate-900">Drain proximity</strong> — roads far from drainage infrastructure retain water longer.
          </p>
          <p>
            <strong className="text-slate-900">Rainfall intensity</strong> — current and forecast mm/hr data from Open-Meteo.
          </p>
          <p>
            <strong className="text-slate-900">Historical patterns</strong> — known waterlogging hotspots receive higher base risk.
          </p>
          <p className="mt-2 font-medium text-slate-700 italic">
            Risk is estimated, not measured. Always use your own judgement.
          </p>
        </div>
      )}
    </BottomSheet>
  );
}
