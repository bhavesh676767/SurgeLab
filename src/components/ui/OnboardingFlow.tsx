import { useState, useEffect, useCallback } from 'react';
import { ArrowRight, ShieldCheck, Route as RouteIcon, MapPin, Droplets } from 'lucide-react';
import { useMapStore } from '@/store/mapStore';
import { useLocation } from '@/hooks/useLocation';
import { reverseGeocodeLatLng } from '@/services/geocodingService';

const screens = [
  {
    icon: '🌊',
    brand: true,
    heading: 'Navigate with confidence\nduring heavy rain.',
    sub: 'Your intelligent co-pilot for safer journeys.',
    cta: 'Get started',
  },
  {
    Icon: ShieldCheck,
    heading: 'Smarter roads.\nSafer journeys.',
    body: 'We analyze rainfall, terrain elevation, and waterlogging data to help you choose safer roads — especially when it matters most.',
    cta: 'Continue',
  },
  {
    Icon: RouteIcon,
    heading: 'Reroute when\nconditions change.',
    body: "When waterlogging increases along your route, we'll automatically suggest a safer path.",
    ctaPrimary: 'Enable location',
    ctaSecondary: 'Continue without location',
  },
];

export function OnboardingFlow() {
  const onboardingComplete = useMapStore((s) => s.onboardingComplete);
  const setOnboardingComplete = useMapStore((s) => s.setOnboardingComplete);
  const setUserLocation = useMapStore((s) => s.setUserLocation);
  const setUserLocationLoading = useMapStore((s) => s.setUserLocationLoading);
  const setUserLocationError = useMapStore((s) => s.setUserLocationError);

  const [current, setCurrent] = useState(0);
  const [locationError, setLocationError] = useState('');

  const { requestLocation, isLocating } = useLocation({
    onLocation: useCallback(async (loc: { lat: number; lng: number }, acc: number) => {
      setUserLocation(loc, acc);
      try {
        await reverseGeocodeLatLng(loc.lat, loc.lng);
      } catch {
        // ignore
      }
      setOnboardingComplete(true);
    }, [setUserLocation, setOnboardingComplete]),
    onError: useCallback((msg: string) => {
      setLocationError(msg);
      setUserLocationError(msg);
      setUserLocationLoading(false);
    }, [setUserLocationError, setUserLocationLoading]),
  });

  if (onboardingComplete) return null;

  const handleNext = () => {
    if (current < screens.length - 1) setCurrent((c) => c + 1);
  };

  const handleComplete = () => setOnboardingComplete(true);

  const handleEnableLocation = () => {
    setLocationError('');
    requestLocation();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-white" role="dialog" aria-modal="true" aria-label="Welcome to SurgeLab">
      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center max-w-sm mx-auto w-full">

        {/* Screen 0 */}
        {current === 0 && (
          <div className="fade-in space-y-6">
            <div className="h-20 w-20 mx-auto rounded-3xl bg-sky-50 flex items-center justify-center">
              <Droplets className="h-10 w-10 text-sky-500" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sky-500 font-bold text-xl tracking-tight mb-1">SurgeLab</p>
              <h1 className="text-3xl font-bold text-slate-900 leading-tight whitespace-pre-line">
                Navigate with confidence{'\n'}during heavy rain.
              </h1>
            </div>
            <p className="text-slate-500 text-base">Your intelligent co-pilot for safer journeys.</p>
          </div>
        )}

        {/* Screen 1 */}
        {current === 1 && (
          <div className="fade-in space-y-6">
            <div className="h-20 w-20 mx-auto rounded-3xl bg-sky-50 flex items-center justify-center">
              <ShieldCheck className="h-10 w-10 text-sky-500" aria-hidden="true" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 leading-tight whitespace-pre-line">
              Smarter roads.{'\n'}Safer journeys.
            </h1>
            <p className="text-slate-500 text-base leading-relaxed">
              We analyze rainfall, terrain elevation, and waterlogging data to help you choose safer roads — especially when it matters most.
            </p>
          </div>
        )}

        {/* Screen 2 */}
        {current === 2 && (
          <div className="fade-in space-y-6">
            <div className="h-20 w-20 mx-auto rounded-3xl bg-sky-50 flex items-center justify-center">
              <RouteIcon className="h-10 w-10 text-sky-500" aria-hidden="true" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 leading-tight whitespace-pre-line">
              Reroute when{'\n'}conditions change.
            </h1>
            <p className="text-slate-500 text-base leading-relaxed">
              When waterlogging increases along your route, we'll automatically suggest a safer path.
            </p>
            {locationError && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2">{locationError}</p>
            )}
          </div>
        )}
      </div>

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 py-6">
        {screens.map((_, i) => (
          <div
            key={i}
            className={[
              'h-2 rounded-full transition-all duration-300',
              i === current ? 'w-6 bg-sky-500' : 'w-2 bg-slate-200',
            ].join(' ')}
            aria-hidden="true"
          />
        ))}
      </div>

      {/* Buttons */}
      <div className="px-8 pb-10 max-w-sm mx-auto w-full space-y-3">
        {current < 2 && (
          <button
            type="button"
            onClick={handleNext}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 py-4 text-base font-semibold text-white shadow-md shadow-sky-500/25 hover:bg-sky-600 active:scale-[0.98] transition"
          >
            {screens[current].cta}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        )}

        {current === 2 && (
          <>
            <button
              type="button"
              onClick={handleEnableLocation}
              disabled={isLocating}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 py-4 text-base font-semibold text-white shadow-md shadow-sky-500/25 hover:bg-sky-600 active:scale-[0.98] transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <MapPin className="h-4 w-4" aria-hidden="true" />
              {isLocating ? 'Finding your location…' : 'Enable location'}
            </button>
            <button
              type="button"
              onClick={handleComplete}
              className="w-full py-3 text-sm font-medium text-slate-500 hover:text-slate-700 transition"
            >
              Continue without location
            </button>
          </>
        )}
      </div>
    </div>
  );
}
