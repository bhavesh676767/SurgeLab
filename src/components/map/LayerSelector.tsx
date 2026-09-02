import { useEffect, useRef } from 'react';
import { Droplets, CloudRain, Mountain, Car } from 'lucide-react';
import { useMapStore } from '@/store/mapStore';

export function LayerSelector() {
  const isOpen = useMapStore((s) => s.isLayerSelectorOpen);
  const layerVisibility = useMapStore((s) => s.layerVisibility);
  const setLayerSelectorOpen = useMapStore((s) => s.setLayerSelectorOpen);
  const setLayerVisibility = useMapStore((s) => s.setLayerVisibility);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setLayerSelectorOpen(false);
      }
    };
    setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, setLayerSelectorOpen]);

  if (!isOpen) return null;

  const layers = [
    { key: 'waterRisk' as const,  Icon: Droplets,   label: 'Water risk',  desc: 'Recommended', alwaysOn: true },
    { key: 'rainfall' as const,   Icon: CloudRain,  label: 'Rainfall',    desc: '',             alwaysOn: false },
    { key: 'terrain' as const,    Icon: Mountain,   label: 'Terrain',     desc: '',             alwaysOn: false },
    { key: 'traffic' as const,    Icon: Car,        label: 'Traffic',     desc: 'Coming soon',  alwaysOn: false, disabled: true },
  ];

  return (
    <div
      ref={panelRef}
      className="pointer-events-auto absolute right-[72px] top-1/2 -translate-y-1/2 z-[1500] w-52 rounded-2xl bg-white shadow-xl border border-slate-200 p-4 fade-in sm:right-20"
      role="dialog"
      aria-label="Map layer selector"
    >
      <p className="text-sm font-semibold text-slate-900 mb-3">Map layers</p>
      <div className="space-y-1">
        {layers.map(({ key, Icon, label, desc, alwaysOn, disabled }) => {
          const checked = layerVisibility[key];
          return (
            <div key={key} className="flex items-center gap-3 py-2">
              <Icon className="h-4 w-4 text-slate-500 flex-shrink-0" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className={['text-sm font-medium', disabled ? 'text-slate-400' : 'text-slate-900'].join(' ')}>{label}</p>
                {desc && (
                  <p className={['text-[10px]', desc === 'Recommended' ? 'text-green-600 font-medium' : 'text-slate-400'].join(' ')}>{desc}</p>
                )}
              </div>
              {/* Toggle */}
              <button
                type="button"
                role="switch"
                aria-checked={alwaysOn ? true : checked}
                aria-label={`Toggle ${label} layer`}
                disabled={disabled || alwaysOn}
                onClick={() => !alwaysOn && !disabled && setLayerVisibility({ [key]: !checked })}
                className={[
                  'relative inline-flex h-5 w-10 flex-shrink-0 items-center rounded-full transition-colors duration-200',
                  alwaysOn || checked ? 'bg-sky-500' : 'bg-slate-200',
                  disabled ? 'opacity-40 cursor-not-allowed' : alwaysOn ? 'cursor-default' : 'cursor-pointer',
                ].join(' ')}
              >
                <span
                  className={['inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200', (alwaysOn || checked) ? 'translate-x-[22px]' : 'translate-x-0.5'].join(' ')}
                  aria-hidden="true"
                />
              </button>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[10px] text-slate-400">Only recommended layers are on by default.</p>
    </div>
  );
}
