import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, Locate, Crosshair, ArrowUpDown, ArrowLeft, ArrowRight, AlertTriangle, Sparkles, Settings } from 'lucide-react';
import { useMapStore, type NavigationLocation } from '@/store/mapStore';
import { useLocation } from '@/hooks/useLocation';
import { searchPlacesCombined, reverseGeocodeLatLng, GURUGRAM_PRESETS, isInsideGurugram } from '@/services/geocodingService';
import { calculateNavigationRoutes } from '@/services/routingService';
import { MlSpatialIndex } from '@/services/mlSpatialIndex';
import type { PlaceSearchResult } from '@/types/dataset';
import { ConditionsPill } from '@/components/ui/ConditionsPill';

export function NavigationPanel() {
  const appMode = useMapStore((s) => s.appMode);
  const origin = useMapStore((s) => s.origin);
  const destination = useMapStore((s) => s.destination);
  const pickingLocationOnMap = useMapStore((s) => s.pickingLocationOnMap);
  const userLocation = useMapStore((s) => s.userLocation);
  const userLocationError = useMapStore((s) => s.userLocationError);
  const userLocationLoading = useMapStore((s) => s.userLocationLoading);
  const userLocationAccuracy = useMapStore((s) => s.userLocationAccuracy);
  const stormIntensity = useMapStore((s) => s.stormIntensity);
  const weather = useMapStore((s) => s.weather);
  const mlRecords = useMapStore((s) => s.mlRecords);
  const incidents = useMapStore((s) => s.incidents);

  const setAppMode = useMapStore((s) => s.setAppMode);
  const setOrigin = useMapStore((s) => s.setOrigin);
  const setDestination = useMapStore((s) => s.setDestination);
  const setPickingLocationOnMap = useMapStore((s) => s.setPickingLocationOnMap);
  const setRouteStage = useMapStore((s) => s.setRouteStage);
  const setRoutes = useMapStore((s) => s.setRoutes);
  const setIsCalculatingRoute = useMapStore((s) => s.setIsCalculatingRoute);
  const setActiveRouteTab = useMapStore((s) => s.setActiveRouteTab);
  const swapOriginDestination = useMapStore((s) => s.swapOriginDestination);
  const clearNavigation = useMapStore((s) => s.clearNavigation);
  const setUserLocation = useMapStore((s) => s.setUserLocation);
  const setUserLocationError = useMapStore((s) => s.setUserLocationError);
  const setUserLocationLoading = useMapStore((s) => s.setUserLocationLoading);
  const setAnalyzingProgress = useMapStore((s) => s.setAnalyzingProgress);
  const setAnalyzingText = useMapStore((s) => s.setAnalyzingText);

  const [originQuery, setOriginQuery] = useState(origin?.name ?? '');
  const [destQuery, setDestQuery] = useState(destination?.name ?? '');
  const [activeInput, setActiveInput] = useState<'origin' | 'destination' | null>(null);
  const [suggestions, setSuggestions] = useState<PlaceSearchResult[]>([]);

  const destInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const analyzeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { requestLocation, isLocating } = useLocation({
    onLocation: useCallback(async (loc: { lat: number; lng: number }, acc: number) => {
      if (!isInsideGurugram(loc.lat, loc.lng)) {
        setUserLocationError('Your location is outside Gurugram. SurgeLab is currently active in Gurugram only.');
        setUserLocationLoading(false);
        return;
      }
      setUserLocation(loc, acc);
      const name = await reverseGeocodeLatLng(loc.lat, loc.lng);
      const label = `Your location (${name})`;
      setOrigin({ location: loc, name: label, isUserLocation: true });
      setOriginQuery(label);
    }, [setUserLocation, setOrigin, setUserLocationError, setUserLocationLoading]),
    onError: useCallback((msg: string) => {
      setUserLocationError(msg);
      setUserLocationLoading(false);
    }, [setUserLocationError, setUserLocationLoading]),
  });

  useEffect(() => { if (origin) setOriginQuery(origin.name); }, [origin]);
  useEffect(() => { if (destination) setDestQuery(destination.name); }, [destination]);

  const handleSearch = useCallback((query: string, target: 'origin' | 'destination') => {
    if (target === 'origin') setOriginQuery(query);
    else setDestQuery(query);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { setSuggestions(GURUGRAM_PRESETS); return; }

    debounceRef.current = setTimeout(async () => {
      const results = await searchPlacesCombined(query, incidents).catch(() => []);
      setSuggestions(results);
    }, 250);
  }, [incidents]);

  const handleSelectPlace = (place: PlaceSearchResult, target: 'origin' | 'destination') => {
    if (!isInsideGurugram(place.location.lat, place.location.lng)) {
      setUserLocationError('Selected place is outside Gurugram. Please choose a location within Gurugram.');
      return;
    }
    const navLoc: NavigationLocation = { location: place.location, name: place.name, formattedAddress: place.formattedAddress };
    if (target === 'origin') { setOrigin(navLoc); setOriginQuery(place.name); }
    else { setDestination(navLoc); setDestQuery(place.name); }
    setActiveInput(null);
    setSuggestions([]);
  };

  const lastRouteKeyRef = useRef<string>('');

  const runRoutePipeline = useCallback(async () => {
    if (!origin || !destination) return;

    const routeKey = `${origin.location.lat.toFixed(4)},${origin.location.lng.toFixed(4)}->${destination.location.lat.toFixed(4)},${destination.location.lng.toFixed(4)}-${stormIntensity}`;
    if (lastRouteKeyRef.current === routeKey) return;
    lastRouteKeyRef.current = routeKey;

    if (analyzeTimerRef.current) clearInterval(analyzeTimerRef.current);
    
    setIsCalculatingRoute(true);
    setRouteStage('ideal');
    setAnalyzingProgress(15);
    setAnalyzingText('Scanning street elevation & drain distances…');

    // Smooth ticker from 15% -> 85%
    let curProgress = 15;
    analyzeTimerRef.current = setInterval(() => {
      curProgress += Math.floor(Math.random() * 8) + 4;
      if (curProgress > 88) curProgress = 88;
      setAnalyzingProgress(curProgress);
      if (curProgress < 40) setAnalyzingText('Evaluating street elevations & drain proximity…');
      else if (curProgress < 75) setAnalyzingText('Cross-referencing storm intensity & underpass risk…');
      else setAnalyzingText('Optimising safer bypass corridor…');
    }, 120);

    try {
      const mlIndex = new MlSpatialIndex(mlRecords);
      const liveRain = weather?.rain ?? 0;
      const livePrecip = weather?.precipitation ?? 0;

      const { ideal, safe } = await calculateNavigationRoutes(
        origin.location, destination.location,
        mlIndex, incidents, stormIntensity, liveRain, livePrecip,
      );

      if (analyzeTimerRef.current) clearInterval(analyzeTimerRef.current);
      setAnalyzingProgress(100);
      setAnalyzingText('Safe corridor calculated');
      setRoutes(ideal, safe);

      setTimeout(() => {
        setRouteStage('safe');
        setIsCalculatingRoute(false);
        setActiveRouteTab('safe');
      }, 180);
    } catch (err) {
      console.warn('[RoutePipeline] Fallback route applied:', err);
      if (analyzeTimerRef.current) clearInterval(analyzeTimerRef.current);
      setAnalyzingProgress(100);
      setRouteStage('safe');
      setIsCalculatingRoute(false);
      setActiveRouteTab('safe');
    }
  }, [origin, destination, mlRecords, weather?.rain, weather?.precipitation, incidents, stormIntensity, setRouteStage, setRoutes, setIsCalculatingRoute, setAnalyzingProgress, setAnalyzingText, setActiveRouteTab]);

  useEffect(() => {
    if (appMode === 'routes' && origin && destination) runRoutePipeline();
    if (appMode === 'home') lastRouteKeyRef.current = '';
    return () => { if (analyzeTimerRef.current) clearInterval(analyzeTimerRef.current); };
  }, [appMode, origin?.location.lat, origin?.location.lng, destination?.location.lat, destination?.location.lng, stormIntensity, runRoutePipeline]);

  // ─── HOME MODE: spacious search bar + circular settings + contextual chips ──
  if (appMode === 'home' || appMode === 'navigating') {
    if (appMode === 'navigating') return null;

    const hazardCount = incidents.length;

    return (
      <div className="relative w-full space-y-2">
        {/* Row 1: Search bar + Circular Settings button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setAppMode('searching');
              if (!origin && userLocation) {
                setOrigin({ location: userLocation, name: 'Your location', isUserLocation: true });
              }
              setTimeout(() => destInputRef.current?.focus(), 80);
            }}
            className="group flex-1 min-w-0 flex items-center gap-3 rounded-full bg-white/95 backdrop-blur-md px-4 shadow-float border border-slate-200/90 hover:border-slate-300 hover:shadow-lg transition-all duration-200 active:scale-[0.99] h-[52px]"
            aria-label="Search destination"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-50 text-sky-600 group-hover:bg-sky-500 group-hover:text-white transition-colors flex-shrink-0">
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
            </div>
            <span className="flex-1 min-w-0 text-left text-slate-400 text-sm font-medium tracking-tight truncate">
              Where do you want to go?
            </span>
            <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-slate-600 transition-colors flex-shrink-0" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => useMapStore.getState().setSettingsOpen(true)}
            aria-label="Settings"
            className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-white/95 backdrop-blur-md border border-slate-200/90 text-slate-600 shadow-float hover:border-slate-300 hover:text-slate-900 hover:shadow-lg active:scale-90 transition-all duration-200 flex-shrink-0"
          >
            <Settings className="h-4.5 w-4.5" aria-hidden="true" />
          </button>
        </div>

        {/* Row 2: Contextual Intelligence Chips (Weather + Flood risk + Smart analysis) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          <ConditionsPill />

          {/* Smart hazard chip */}
          {hazardCount > 0 && hazardCount <= 20 && (
            <button
              type="button"
              onClick={() => useMapStore.getState().setWaterloggingSheetOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-50/90 backdrop-blur-sm border border-amber-200/90 px-3 py-1.5 text-xs font-semibold text-amber-800 shadow-xs hover:bg-amber-100 hover:border-amber-300 active:scale-95 transition-all flex-shrink-0"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              <span>{hazardCount} hazard{hazardCount > 1 ? 's' : ''} nearby</span>
            </button>
          )}

          {hazardCount > 20 && (
            <button
              type="button"
              onClick={() => useMapStore.getState().setWaterloggingSheetOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-50/90 backdrop-blur-sm border border-amber-200/90 px-3 py-1.5 text-xs font-semibold text-amber-800 shadow-xs hover:bg-amber-100 hover:border-amber-300 active:scale-95 transition-all flex-shrink-0"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              <span>Water-risk areas nearby</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => useMapStore.getState().setSmartAnalysisOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur-sm border border-slate-200/90 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:border-slate-300 hover:bg-slate-50 active:scale-95 transition-all flex-shrink-0"
          >
            <Sparkles className="h-3.5 w-3.5 text-sky-500" />
            <span>Smart Analysis</span>
          </button>
        </div>
      </div>
    );
  }

  // ─── ROUTES MODE: desktop navigation search / waypoint card ─────────────
  if (appMode === 'routes') {
    return (
      <div className="relative w-full animate-fade-in select-none">
        <div className="rounded-2xl bg-white/95 backdrop-blur-md shadow-float border border-slate-200/90 p-3 space-y-2">
          {/* Origin Row */}
          <div className="flex items-center justify-between gap-2">
            <div
              onClick={() => {
                setAppMode('searching');
                setActiveInput('origin');
              }}
              className="flex-1 min-w-0 flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-slate-50 cursor-pointer transition"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">Origin</p>
                <p className="text-xs font-bold text-slate-900 truncate mt-0.5">
                  {origin?.name?.replace(/Your location \((.*)\)/, '$1') ?? 'Start Location'}
                </p>
              </div>
            </div>

            {/* Swap Button */}
            <button
              type="button"
              onClick={swapOriginDestination}
              aria-label="Swap origin and destination"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition active:scale-90"
              title="Swap Route"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="h-px bg-slate-100 mx-2" />

          {/* Destination Row */}
          <div className="flex items-center justify-between gap-2">
            <div
              onClick={() => {
                setAppMode('searching');
                setActiveInput('destination');
              }}
              className="flex-1 min-w-0 flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-slate-50 cursor-pointer transition"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500 ring-4 ring-rose-100 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">Destination</p>
                <p className="text-xs font-bold text-slate-900 truncate mt-0.5">
                  {destination?.name ?? 'Where to?'}
                </p>
              </div>
            </div>

            {/* Clear / Exit Route Button */}
            <button
              type="button"
              onClick={() => {
                clearNavigation();
                setAppMode('home');
              }}
              aria-label="Exit route"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition active:scale-90"
              title="Clear Route"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── SEARCHING MODE: full search card ─────────────────────────────────────
  const canCalculate = (!!origin || !!originQuery.trim()) && (!!destination || !!destQuery.trim());

  const handleCalculateClick = async () => {
    let resolvedOrigin = origin;
    let resolvedDest = destination;

    if (!resolvedOrigin && originQuery.trim()) {
      const preset = GURUGRAM_PRESETS.find((p) =>
        p.name.toLowerCase().includes(originQuery.toLowerCase().trim())
      );
      if (preset) {
        resolvedOrigin = { location: preset.location, name: preset.name, formattedAddress: preset.formattedAddress };
        setOrigin(resolvedOrigin);
      } else {
        const results = await searchPlacesCombined(originQuery, incidents).catch(() => []);
        if (results[0]) {
          resolvedOrigin = { location: results[0].location, name: results[0].name, formattedAddress: results[0].formattedAddress };
          setOrigin(resolvedOrigin);
        }
      }
    }

    if (!resolvedDest && destQuery.trim()) {
      const preset = GURUGRAM_PRESETS.find((p) =>
        p.name.toLowerCase().includes(destQuery.toLowerCase().trim())
      );
      if (preset) {
        resolvedDest = { location: preset.location, name: preset.name, formattedAddress: preset.formattedAddress };
        setDestination(resolvedDest);
      } else {
        const results = await searchPlacesCombined(destQuery, incidents).catch(() => []);
        if (results[0]) {
          resolvedDest = { location: results[0].location, name: results[0].name, formattedAddress: results[0].formattedAddress };
          setDestination(resolvedDest);
        }
      }
    }

    if (resolvedOrigin && resolvedDest) {
      setActiveInput(null);
      setSuggestions([]);
      setAppMode('routes');
    }
  };

  return (
    <div className="relative w-full">
      <div className="rounded-3xl bg-white/95 backdrop-blur-md shadow-float border border-slate-200/90 p-4 space-y-3.5">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { clearNavigation(); setAppMode('home'); }}
              aria-label="Back to home"
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition active:scale-95"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <h2 className="font-bold text-slate-900 text-sm tracking-tight">Plan Journey</h2>
          </div>
          <button
            type="button"
            onClick={() => { clearNavigation(); setAppMode('home'); }}
            aria-label="Close directions"
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition active:scale-95"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Input area with dots and swap */}
        <div className="relative flex items-center gap-2.5">
          {/* Visual origin-to-destination route line */}
          <div className="flex flex-col items-center gap-1 py-1 flex-shrink-0">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100 shadow-xs" aria-hidden="true" />
            <div className="h-8 w-0.5 border-l-2 border-dashed border-slate-300" aria-hidden="true" />
            <div className="h-2.5 w-2.5 rounded-full bg-rose-500 ring-4 ring-rose-100 shadow-xs" aria-hidden="true" />
          </div>

          {/* Input fields */}
          <div className="flex-1 space-y-2 min-w-0">
            {/* Origin */}
            <div className={['flex items-center gap-1.5 rounded-2xl border px-3 py-1.5 transition-all min-w-0', activeInput === 'origin' ? 'border-emerald-500 ring-2 ring-emerald-100 bg-white' : 'border-slate-200/90 bg-slate-50/80 hover:bg-slate-50'].join(' ')}>
              <input
                type="text"
                value={originQuery}
                onChange={(e) => handleSearch(e.target.value, 'origin')}
                onFocus={() => { setActiveInput('origin'); setSuggestions(originQuery ? suggestions : GURUGRAM_PRESETS); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCalculateClick(); }}
                placeholder="Starting point"
                aria-label="Starting point"
                className="flex-1 min-w-0 bg-transparent text-xs font-semibold text-slate-900 placeholder:text-slate-400 outline-none"
              />
              {originQuery && (
                <button type="button" onClick={() => { setOriginQuery(''); setOrigin(null); }} aria-label="Clear starting point" className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-200/80 transition">
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                onClick={() => { setUserLocationLoading(true); requestLocation(); }}
                aria-label="Use current location"
                className={['flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-lg transition active:scale-95', userLocation ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' : 'text-slate-400 hover:bg-slate-200/60 hover:text-slate-600'].join(' ')}
                title="Current location"
              >
                <Locate className={['h-3.5 w-3.5', isLocating || userLocationLoading ? 'animate-spin text-sky-500' : ''].join(' ')} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setPickingLocationOnMap('origin')}
                aria-label="Pick origin on map"
                className={['flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-lg transition active:scale-95', pickingLocationOnMap === 'origin' ? 'bg-emerald-500 text-white shadow-xs' : 'text-slate-400 hover:bg-slate-200/60 hover:text-slate-600'].join(' ')}
                title="Pick on map"
              >
                <Crosshair className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>

            {/* Destination */}
            <div className={['flex items-center gap-1.5 rounded-2xl border px-3 py-1.5 transition-all min-w-0', activeInput === 'destination' ? 'border-rose-500 ring-2 ring-rose-100 bg-white' : 'border-slate-200/90 bg-slate-50/80 hover:bg-slate-50'].join(' ')}>
              <input
                ref={destInputRef}
                type="text"
                value={destQuery}
                onChange={(e) => handleSearch(e.target.value, 'destination')}
                onFocus={() => { setActiveInput('destination'); setSuggestions(destQuery ? suggestions : GURUGRAM_PRESETS); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCalculateClick(); }}
                placeholder="Where to?"
                aria-label="Destination"
                className="flex-1 min-w-0 bg-transparent text-xs font-semibold text-slate-900 placeholder:text-slate-400 outline-none"
              />
              {destQuery && (
                <button type="button" onClick={() => { setDestQuery(''); setDestination(null); }} aria-label="Clear destination" className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-200/80 transition">
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setPickingLocationOnMap('destination')}
                aria-label="Pick destination on map"
                className={['flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-lg transition active:scale-95', pickingLocationOnMap === 'destination' ? 'bg-rose-500 text-white shadow-xs' : 'text-slate-400 hover:bg-slate-200/60 hover:text-slate-600'].join(' ')}
                title="Pick on map"
              >
                <Crosshair className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Swap button */}
          <button
            type="button"
            onClick={swapOriginDestination}
            aria-label="Swap origin and destination"
            className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 hover:border-slate-300 transition active:scale-90 shadow-xs"
            title="Swap Origin & Destination"
          >
            <ArrowUpDown className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>

        {/* GPS alerts */}
        {userLocationError && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200/70 rounded-xl px-3 py-1.5 font-medium" role="alert">{userLocationError}</p>
        )}
        {!userLocationError && userLocationAccuracy && userLocationAccuracy > 50 && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200/70 rounded-xl px-3 py-1.5 font-medium" role="status">
            ⚠ Accuracy: ~{Math.round(userLocationAccuracy)} m
          </p>
        )}

        {/* Map picking banner */}
        {pickingLocationOnMap && (
          <div className="flex items-center justify-between rounded-2xl bg-amber-50 border border-amber-200 px-3.5 py-2">
            <span className="flex items-center gap-2 text-xs font-semibold text-amber-800">
              <Crosshair className="h-3.5 w-3.5 text-amber-600 animate-pulse" aria-hidden="true" />
              Tap on map to set {pickingLocationOnMap}
            </span>
            <button type="button" onClick={() => setPickingLocationOnMap(null)} className="text-xs text-amber-700 hover:text-amber-900 font-bold transition">Cancel</button>
          </div>
        )}

        {/* Calculate route CTA */}
        {canCalculate && (
          <button
            type="button"
            onClick={handleCalculateClick}
            className="w-full rounded-2xl bg-sky-500 hover:bg-sky-600 active:scale-[0.99] py-3 text-sm font-bold text-white shadow-card shadow-sky-500/25 transition-all flex items-center justify-center gap-2"
          >
            <span>Find Safe Routes</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Autocomplete dropdown */}
      {activeInput && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-[1300] mt-2 max-h-72 overflow-y-auto rounded-3xl border border-slate-200/90 bg-white/95 backdrop-blur-md shadow-float fade-in divide-y divide-slate-100">
          <div className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-50/50">
            {activeInput === 'origin' ? 'Set Starting Location' : (destQuery.length > 1 ? 'Suggestions' : 'Popular Destinations')}
          </div>
          <ul>
            {suggestions.map((p) => (
              <li key={p.placeId}>
                <button
                  type="button"
                  onClick={() => handleSelectPlace(p, activeInput)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50/90 transition-colors group"
                >
                  <div className={['h-7 w-7 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors', activeInput === 'origin' ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white' : 'bg-rose-50 text-rose-500 group-hover:bg-rose-500 group-hover:text-white'].join(' ')}>
                    <Search className="h-3.5 w-3.5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 group-hover:text-slate-950 truncate">{p.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{p.formattedAddress}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
