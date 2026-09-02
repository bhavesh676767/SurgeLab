import { useCallback, useEffect, useRef, useState } from "react";
import type { LatLng } from "@/types/dataset";

interface UseLocationOptions {
  onLocation?: (location: LatLng, accuracy: number) => void;
  onError?: (error: string) => void;
  enableHighAccuracy?: boolean;
}

export function useLocation(options: UseLocationOptions = {}) {
  const { onLocation, onError, enableHighAccuracy = true } = options;
  const [location, setLocation] = useState<LatLng | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      const msg = "Geolocation is not supported by your browser";
      setError(msg);
      onError?.(msg);
      return;
    }

    setError(null);
    setIsTracking(true);

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        const acc = position.coords.accuracy;
        setLocation(loc);
        setAccuracy(acc);
        onLocation?.(loc, acc);
      },
      (err) => {
        setError(err.message);
        setIsTracking(false);
        onError?.(err.message);
      },
      {
        enableHighAccuracy,
        maximumAge: 10000,
        timeout: 15000,
      },
    );
  }, [enableHighAccuracy, onLocation, onError]);

  useEffect(() => {
    return () => stopTracking();
  }, [stopTracking]);

  return {
    location,
    accuracy,
    error,
    isTracking,
    isLocating: isTracking,
    requestLocation,
    stopTracking,
  };
}

