import { useState } from 'react';
import { ChevronDown, ChevronUp, Droplets } from 'lucide-react';

interface LegendRow {
  color: string;
  label: string;
  depth: string;
  textColor: string;
}

const LEGEND_ROWS: LegendRow[] = [
  { color: 'bg-emerald-500',label: 'Dry / Passable',    depth: '0–5 cm',  textColor: 'text-emerald-700' },
  { color: 'bg-amber-400',  label: 'Surface pooling',   depth: '5–15 cm', textColor: 'text-amber-700' },
  { color: 'bg-orange-500', label: 'Moderate flooding', depth: '15–30 cm',textColor: 'text-orange-700' },
  { color: 'bg-rose-500',   label: 'Dangerous',         depth: '30–50 cm',textColor: 'text-rose-700' },
  { color: 'bg-purple-600', label: 'Submerged',         depth: '50+ cm',  textColor: 'text-purple-700' },
];

export function RiskLegend() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="pointer-events-auto">
      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-label="Expand water risk legend"
          className="group flex items-center gap-2 rounded-full bg-white/95 backdrop-blur-md px-3.5 py-2 shadow-float border border-slate-200/90 text-xs font-bold text-slate-700 hover:border-slate-300 hover:text-slate-900 active:scale-95 transition-all duration-150 h-10 select-none"
        >
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-50 text-sky-500 group-hover:bg-sky-500 group-hover:text-white transition-colors">
            <Droplets className="h-3 w-3" aria-hidden="true" />
          </div>
          <span>Water risk</span>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" aria-hidden="true" />
        </button>
      ) : (
        <div className="rounded-3xl bg-white/95 backdrop-blur-md shadow-float border border-slate-200/90 p-4 w-60 fade-in select-none">
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <Droplets className="h-3.5 w-3.5 text-sky-500" />
              <p className="text-xs font-bold text-slate-900">Water Risk Levels</p>
            </div>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              aria-label="Collapse legend"
              className="h-6 w-6 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition active:scale-90"
            >
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
          <ul className="space-y-2">
            {LEGEND_ROWS.map((row) => (
              <li key={row.label} className="flex items-center gap-2.5">
                <span className={['inline-block h-2.5 w-2.5 rounded-full ring-2 ring-white flex-shrink-0 shadow-xs', row.color].join(' ')} aria-hidden="true" />
                <span className={['text-xs font-semibold flex-1', row.textColor].join(' ')}>{row.label}</span>
                <span className="text-[11px] font-mono text-slate-400 font-medium ml-auto">{row.depth}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span className="italic">Estimated from terrain & rain</span>
          </div>
        </div>
      )}
    </div>
  );
}
