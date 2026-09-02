import { useMap } from 'react-leaflet';
import { Plus, Minus, Locate, Layers } from 'lucide-react';
import { useMapStore } from '@/store/mapStore';
import { useLocation } from '@/hooks/useLocation';

export function MapControlsGroup() {
  const map = useMap();
  const flyTo = useMapStore((s) => s.flyTo);
  const setUserLocation = useMapStore((s) => s.setUserLocation);
  const setUserLocationError = useMapStore((s) => s.setUserLocationError);
  const setUserLocationLoading = useMapStore((s) => s.setUserLocationLoading);
  const userLocationLoading = useMapStore((s) => s.userLocationLoading);
  const isLayerSelectorOpen = useMapStore((s) => s.isLayerSelectorOpen);
  const setLayerSelectorOpen = useMapStore((s) => s.setLayerSelectorOpen);

  const { requestLocation, isLocating } = useLocation({
    onLocation: (loc, acc) => {
      setUserLocation(loc, acc);
      flyTo(loc, 15);
      setUserLocationLoading(false);
    },
    onError: (msg) => {
      setUserLocationError(msg);
      setUserLocationLoading(false);
    },
  });

  const btnBase = 'flex h-11 w-11 items-center justify-center rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 text-slate-600 shadow-float hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 active:scale-95 transition-all duration-150';

  return (
    <>
      {/* Right side vertical group — zoom, locate, layers */}
      <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 z-[1000] flex flex-col items-center gap-2.5 sm:right-5">
        {/* Zoom group */}
        <div className="pointer-events-auto flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-md shadow-float">
          <button
            type="button"
            onClick={() => map.zoomIn()}
            aria-label="Zoom in"
            className="flex h-10 w-11 items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:scale-90 transition-all"
          >
            <Plus className="h-4.5 w-4.5" aria-hidden="true" />
          </button>
          <div className="h-px bg-slate-200/80 mx-1.5" />
          <button
            type="button"
            onClick={() => map.zoomOut()}
            aria-label="Zoom out"
            className="flex h-10 w-11 items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:scale-90 transition-all"
          >
            <Minus className="h-4.5 w-4.5" aria-hidden="true" />
          </button>
        </div>

        {/* My location */}
        <button
          type="button"
          onClick={() => { setUserLocationLoading(true); requestLocation(); }}
          aria-label={isLocating || userLocationLoading ? 'Finding your location' : 'Go to my location'}
          disabled={isLocating || userLocationLoading}
          className={[btnBase, 'pointer-events-auto', (isLocating || userLocationLoading) ? 'text-sky-500' : ''].join(' ')}
        >
          <Locate className={['h-4.5 w-4.5', (isLocating || userLocationLoading) ? 'animate-spin text-sky-500' : ''].join(' ')} aria-hidden="true" />
        </button>

        {/* Layers */}
        <button
          type="button"
          onClick={() => setLayerSelectorOpen(!isLayerSelectorOpen)}
          aria-label="Map layers"
          aria-expanded={isLayerSelectorOpen}
          className={[btnBase, 'pointer-events-auto', isLayerSelectorOpen ? 'bg-sky-500 text-white border-sky-500 hover:bg-sky-600 hover:text-white shadow-glow-sky' : ''].join(' ')}
        >
          <Layers className="h-4.5 w-4.5" aria-hidden="true" />
        </button>
      </div>
    </>
  );
}
