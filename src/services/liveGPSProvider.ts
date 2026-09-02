/**
 * LiveGPSProvider
 *
 * Uses the browser's navigator.geolocation.watchPosition API to provide
 * real-time position updates during navigation.
 */

import type { ILocationProvider, NavigationPosition } from "./navigationEngine";

export class LiveGPSProvider implements ILocationProvider {
  readonly type = "gps" as const;
  private watchId: number | null = null;

  start(
    onPosition: (pos: NavigationPosition) => void,
    onError: (message: string) => void
  ): void {
    if (!("geolocation" in navigator)) {
      onError("GPS is not available on this device or browser.");
      return;
    }

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        onPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          heading: pos.coords.heading,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed,
          timestamp: pos.timestamp,
        });
      },
      (err) => {
        switch (err.code) {
          case GeolocationPositionError.PERMISSION_DENIED:
            onError("Location permission was denied. Enable it in your browser settings.");
            break;
          case GeolocationPositionError.POSITION_UNAVAILABLE:
            onError("Unable to determine your location. GPS signal may be weak.");
            break;
          case GeolocationPositionError.TIMEOUT:
            onError("Location request timed out. Trying again…");
            break;
          default:
            onError("An unknown location error occurred.");
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5_000,    // accept cached position up to 5 s old
        timeout: 15_000,      // fail after 15 s without a fix
      }
    );
  }

  stop(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }
}
