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

  const btnBase = 'group relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 active:scale-95 transition-all duration-150 select-none';

  return (
    <>
      {/* Right side vertical group — zoom, locate, layers */}
      <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 z-[1000] flex flex-col items-center gap-2 sm:right-6">
        {/* Zoom group */}
        <div className="pointer-events-auto flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-md shadow-sm">
          <button
            type="button"
            onClick={() => map.zoomIn()}
            aria-label="Zoom in"
            title="Zoom In"
            className="flex h-10 w-11 items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:scale-90 transition-all"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
          <div className="h-px bg-slate-200/80 mx-1.5" />
          <button
            type="button"
            onClick={() => map.zoomOut()}
            aria-label="Zoom out"
            title="Zoom Out"
            className="flex h-10 w-11 items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:scale-90 transition-all"
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* My location */}
        <button
          type="button"
          onClick={() => { setUserLocationLoading(true); requestLocation(); }}
          aria-label={isLocating || userLocationLoading ? 'Finding your location' : 'Go to my location'}
          title="My Location"
          disabled={isLocating || userLocationLoading}
          className={[btnBase, 'pointer-events-auto', (isLocating || userLocationLoading) ? 'text-sky-500' : ''].join(' ')}
        >
          <Locate className={['h-4 w-4', (isLocating || userLocationLoading) ? 'animate-spin text-sky-500' : ''].join(' ')} aria-hidden="true" />
        </button>

        {/* Layers */}
        <button
          type="button"
          onClick={() => setLayerSelectorOpen(!isLayerSelectorOpen)}
          aria-label="Map layers"
          title="Map Layers"
          aria-expanded={isLayerSelectorOpen}
          className={[btnBase, 'pointer-events-auto', isLayerSelectorOpen ? 'bg-slate-900 text-white border-slate-900 hover:bg-black hover:text-white' : ''].join(' ')}
        >
          <Layers className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </>
  );
}
