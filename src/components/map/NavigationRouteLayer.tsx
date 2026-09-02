import { useEffect, useMemo, useCallback, useRef } from 'react';
import { useMap, Polyline, Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { useMapStore } from '@/store/mapStore';
import { reverseGeocodeLatLng, isInsideGurugram } from '@/services/geocodingService';

function createStartIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div class="relative flex items-center justify-center cursor-grab active:cursor-grabbing group">
      <div class="absolute -inset-2 rounded-full bg-emerald-400/30 marker-pulse-ring group-hover:scale-125 transition-transform"></div>
      <div class="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-emerald-500 shadow-xl group-hover:scale-110 transition-transform">
        <span class="text-xs font-black text-white">A</span>
      </div>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function createDestinationIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div class="relative flex items-center justify-center cursor-grab active:cursor-grabbing group">
      <div class="absolute -inset-2 rounded-full bg-rose-400/30 marker-pulse-ring group-hover:scale-125 transition-transform"></div>
      <div class="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-rose-600 shadow-xl group-hover:scale-110 transition-transform">
        <svg class="h-4 w-4 text-white fill-current" viewBox="0 0 24 24">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      </div>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function createHazardIcon(_name: string, depthCm: number, _riskPct: number): L.DivIcon {
  const isSevere = depthCm >= 45;
  const badgeBg = isSevere
    ? "bg-rose-950/90 border-rose-500/80 text-white"
    : "bg-slate-900/90 border-amber-500/80 text-white";
  const dotColor = isSevere
    ? "bg-rose-500 ring-rose-400/40"
    : "bg-amber-400 ring-amber-300/40";

  return L.divIcon({
    className: "",
    html: `<div class="group relative flex cursor-pointer items-center justify-center select-none -translate-y-1">
      <div class="flex items-center gap-1.5 rounded-full ${badgeBg} border backdrop-blur-md px-2.5 py-1 shadow-lg shadow-black/30 transition-all duration-200 group-hover:scale-110">
        <span class="h-2 w-2 rounded-full ${dotColor} ring-2 flex-shrink-0"></span>
        <span class="font-mono text-[11px] font-black tracking-tight leading-none">${depthCm}<span class="text-[9px] font-semibold text-slate-300 ml-0.5">cm</span></span>
      </div>
    </div>`,
    iconSize: [68, 28],
    iconAnchor: [34, 14],
  });
}

function createScanProbeIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div class="relative flex items-center justify-center">
      <div class="absolute -inset-3 rounded-full bg-sky-400/40 animate-ping"></div>
      <div class="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-sky-500 shadow-xl text-white">
        <svg class="h-4 w-4 fill-current animate-pulse" viewBox="0 0 24 24"><path d="M12 2L2 22l10-3 10 3L12 2z"/></svg>
      </div>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

export function NavigationRouteLayer() {
  const map = useMap();
  const origin = useMapStore((s) => s.origin);
  const destination = useMapStore((s) => s.destination);
  const idealRoute = useMapStore((s) => s.idealRoute);
  const safeRoute = useMapStore((s) => s.safeRoute);
  const routeStage = useMapStore((s) => s.routeStage);
  const activeRouteTab = useMapStore((s) => s.activeRouteTab);
  const pickingLocationOnMap = useMapStore((s) => s.pickingLocationOnMap);
  const setOrigin = useMapStore((s) => s.setOrigin);
  const setDestination = useMapStore((s) => s.setDestination);
  const setPickingLocationOnMap = useMapStore((s) => s.setPickingLocationOnMap);

  const startIcon = useMemo(() => createStartIcon(), []);
  const destinationIcon = useMemo(() => createDestinationIcon(), []);
  const probeIcon = useMemo(() => createScanProbeIcon(), []);

  const lastFittedBoundsKey = useRef<string>('');

  // Fit bounds smoothly ONCE when routes are calculated or updated
  useEffect(() => {
    if (!origin || !destination) return;
    if (!safeRoute && !idealRoute) return;

    const key = `${origin.location.lat.toFixed(4)},${origin.location.lng.toFixed(4)}->${destination.location.lat.toFixed(4)},${destination.location.lng.toFixed(4)}-${routeStage}`;
    if (lastFittedBoundsKey.current === key) return;
    lastFittedBoundsKey.current = key;

    const bounds = L.latLngBounds(
      [origin.location.lat, origin.location.lng],
      [destination.location.lat, destination.location.lng],
    );
    if (safeRoute?.coordinates?.length) {
      for (const [lat, lng] of safeRoute.coordinates) bounds.extend([lat, lng]);
    } else if (idealRoute?.coordinates?.length) {
      for (const [lat, lng] of idealRoute.coordinates) bounds.extend([lat, lng]);
    }
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15, animate: true, duration: 0.8 });
  }, [map, origin, destination, safeRoute, idealRoute, routeStage]);

  // Handle map click to pick location
  useEffect(() => {
    if (!pickingLocationOnMap) return;

    const onMapClick = async (e: L.LeafletMouseEvent) => {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;

      if (!isInsideGurugram(lat, lng)) {
        useMapStore.getState().setUserLocationError('Selected point is outside Gurugram. SurgeLab navigation is active within Gurugram only.');
        setPickingLocationOnMap(null);
        return;
      }

      const name = await reverseGeocodeLatLng(lat, lng);

      if (pickingLocationOnMap === 'origin') {
        setOrigin({ location: { lat, lng }, name });
      } else if (pickingLocationOnMap === 'destination') {
        setDestination({ location: { lat, lng }, name });
      }
      setPickingLocationOnMap(null);
    };

    map.on('click', onMapClick);
    return () => {
      map.off('click', onMapClick);
    };
  }, [map, pickingLocationOnMap, setOrigin, setDestination, setPickingLocationOnMap]);

  const appMode = useMapStore((s) => s.appMode);
  const isDraggable = appMode !== 'navigating';

  const handleOriginDragEnd = useCallback(async (e: L.DragEndEvent) => {
    const marker = e.target;
    const position = marker.getLatLng();
    const lat = position.lat;
    const lng = position.lng;

    if (!isInsideGurugram(lat, lng)) {
      useMapStore.getState().setUserLocationError('Location is outside Gurugram. Please drag within Gurugram.');
      if (origin) marker.setLatLng([origin.location.lat, origin.location.lng]);
      return;
    }

    const name = await reverseGeocodeLatLng(lat, lng);
    setOrigin({ location: { lat, lng }, name, isUserLocation: false });
  }, [origin, setOrigin]);

  const handleDestDragEnd = useCallback(async (e: L.DragEndEvent) => {
    const marker = e.target;
    const position = marker.getLatLng();
    const lat = position.lat;
    const lng = position.lng;

    if (!isInsideGurugram(lat, lng)) {
      useMapStore.getState().setUserLocationError('Location is outside Gurugram. Please drag within Gurugram.');
      if (destination) marker.setLatLng([destination.location.lat, destination.location.lng]);
      return;
    }

    const name = await reverseGeocodeLatLng(lat, lng);
    setDestination({ location: { lat, lng }, name });
  }, [destination, setDestination]);

  return (
    <>
      {/* Origin Marker (Draggable) */}
      {origin && (
        <Marker
          position={[origin.location.lat, origin.location.lng]}
          icon={startIcon}
          draggable={isDraggable}
          eventHandlers={{ dragend: handleOriginDragEnd }}
        >
          <Tooltip direction="top" offset={[0, -16]} opacity={0.95}>
            <span className="text-[11px] font-semibold text-slate-900">Start (A) · Drag to adjust</span>
          </Tooltip>
          <Popup>
            <div className="space-y-1.5 min-w-[180px] text-left select-none">
              <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Starting Point (A)</p>
              </div>
              <p className="text-xs font-bold text-slate-900 leading-tight">{origin.name}</p>
              <p className="text-[10px] text-slate-400">Drag marker on map to relocate</p>
            </div>
          </Popup>
        </Marker>
      )}

      {/* Destination Marker (Draggable) */}
      {destination && (
        <Marker
          position={[destination.location.lat, destination.location.lng]}
          icon={destinationIcon}
          draggable={isDraggable}
          eventHandlers={{ dragend: handleDestDragEnd }}
        >
          <Tooltip direction="top" offset={[0, -16]} opacity={0.95}>
            <span className="text-[11px] font-semibold text-slate-900">Destination (B) · Drag to adjust</span>
          </Tooltip>
          <Popup>
            <div className="space-y-1.5 min-w-[180px] text-left select-none">
              <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Destination (B)</p>
              </div>
              <p className="text-xs font-bold text-slate-900 leading-tight">{destination.name}</p>
              <p className="text-[10px] text-slate-400">Drag marker on map to relocate</p>
            </div>
          </Popup>
        </Marker>
      )}

      {/* Yellow Dotted Ideal Route */}
      {idealRoute && idealRoute.coordinates.length > 0 && (
        <>
          {/* Underlay glow */}
          <Polyline
            positions={idealRoute.coordinates}
            pathOptions={{
              color: '#ca8a04',
              weight: routeStage === 'safe' ? 4 : 8,
              opacity: routeStage === 'safe' ? 0.25 : 0.45,
            }}
          />
          {/* Main animated yellow path */}
          <Polyline
            positions={idealRoute.coordinates}
            pathOptions={{
              color: '#facc15',
              weight: routeStage === 'safe' ? 3.5 : 5.5,
              opacity: routeStage === 'safe' ? 0.5 : 0.95,
              className: routeStage !== 'safe' || activeRouteTab === 'ideal' ? 'animated-route-yellow' : '',
              dashArray: '10, 12',
            }}
          />
        </>
      )}

      {/* Hazard Warning Markers on Ideal Route */}
      {idealRoute?.hazardLocations &&
        idealRoute.hazardLocations.map((hazard, i) => (
          <Marker
            key={`hazard-${i}-${hazard.lat}-${hazard.lng}`}
            position={[hazard.lat, hazard.lng]}
            icon={createHazardIcon(hazard.name, hazard.depthCm, hazard.riskPct)}
          >
            <Popup>
              <div className="space-y-2 min-w-[200px] text-left select-none">
                {/* Header */}
                <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Flood Hotspot
                  </p>
                </div>

                {/* Location Name */}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 leading-tight">{hazard.name}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {hazard.isUnderpass ? 'Submerged Underpass Basin' : 'Low Drainage Street'}
                  </p>
                </div>

                {/* 2-Column Stats */}
                <div className="grid grid-cols-2 gap-1.5 pt-0.5 text-center">
                  <div className="rounded-lg bg-slate-50 border border-slate-200/60 p-1.5">
                    <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Est. Depth</p>
                    <p className="font-mono text-xs font-bold text-slate-900 mt-0.5">~{hazard.depthCm} cm</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 border border-slate-200/60 p-1.5">
                    <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Risk Score</p>
                    <p className="font-mono text-xs font-bold text-rose-600 mt-0.5">{hazard.riskPct}%</p>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="rounded-md bg-rose-50 border border-rose-100 px-2 py-1 text-center">
                  <p className="text-[10px] font-semibold text-rose-700">
                    {hazard.isUnderpass ? 'Avoid — High Vehicle Stall Risk' : 'Caution — Standing Water Risk'}
                  </p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

      {/* Plain Blue Suggested Safe Route */}
      {safeRoute && safeRoute.coordinates.length > 0 && (
        <>
          {/* Outer glow layer */}
          <Polyline
            positions={safeRoute.coordinates}
            pathOptions={{
              color: '#38bdf8',
              weight: 9,
              opacity: 0.35,
              className: 'safe-route-glow',
            }}
          />
          {/* Solid plain blue path */}
          <Polyline
            positions={safeRoute.coordinates}
            pathOptions={{
              color: '#2563eb',
              weight: 5.5,
              opacity: 0.95,
              className: 'safe-route-blue',
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        </>
      )}

      {/* Animated Route Scanning Probe during Analysis */}
      {(routeStage === 'ideal' || routeStage === 'analyzing') && idealRoute && idealRoute.coordinates.length > 0 && (
        <Marker
          position={
            idealRoute.coordinates[
              Math.min(
                idealRoute.coordinates.length - 1,
                Math.floor((idealRoute.coordinates.length - 1) * (routeStage === 'ideal' ? 0.35 : 0.75))
              )
            ]
          }
          icon={probeIcon}
        />
      )}
    </>
  );
}
