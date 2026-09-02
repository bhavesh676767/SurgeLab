/**
 * SimulationProvider
 *
 * Provides the same ILocationProvider interface as LiveGPSProvider but
 * animates a virtual vehicle along a supplied route for demo/testing use.
 *
 * The UI is completely unaware of the provider source.
 *
 * Usage:
 *   const sim = new SimulationProvider();
 *   sim.setRoute(routeCoordinates);
 *   sim.setSpeed(50); // km/h
 *   navigationEngine.setProvider(sim);
 *   navigationEngine.startNavigation(route);
 */

import type { ILocationProvider, NavigationPosition } from "./navigationEngine";
import { haversineM } from "./navigationEngine";

export class SimulationProvider implements ILocationProvider {
  readonly type = "simulation" as const;

  private routeCoords: [number, number][] = [];
  private speedKmh = 40;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private currentIndex = 0;

  setRoute(coords: [number, number][]) {
    this.routeCoords = coords;
    this.currentIndex = 0;
  }

  setSpeed(kmh: number) {
    this.speedKmh = Math.max(5, Math.min(120, kmh));
  }

  start(
    onPosition: (pos: NavigationPosition) => void,
    onError: (message: string) => void
  ): void {
    if (this.routeCoords.length < 2) {
      onError("SimulationProvider: No route coordinates set.");
      return;
    }

    this.currentIndex = 0;

    // Calculate appropriate tick interval from speed and average segment length
    const avgSegmentM = this.averageSegmentLength();
    const speedMs = (this.speedKmh * 1000) / 3600;
    // How long (ms) to cross one average segment at this speed
    const msPerSegment = Math.max(100, (avgSegmentM / speedMs) * 1000);

    this.intervalId = setInterval(() => {
      if (this.currentIndex >= this.routeCoords.length) {
        if (this.intervalId) clearInterval(this.intervalId);
        return;
      }

      const [lat, lng] = this.routeCoords[this.currentIndex];

      // Compute bearing for heading
      let heading: number | null = null;
      if (this.currentIndex > 0) {
        const [pLat, pLng] = this.routeCoords[this.currentIndex - 1];
        const dy = lat - pLat;
        const dx = lng - pLng;
        heading = ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360;
      }

      onPosition({
        lat,
        lng,
        heading,
        accuracy: 8,
        speed: speedMs,
        timestamp: Date.now(),
      });

      this.currentIndex++;
    }, msPerSegment);
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.currentIndex = 0;
  }

  private averageSegmentLength(): number {
    if (this.routeCoords.length < 2) return 50;
    let total = 0;
    for (let i = 1; i < this.routeCoords.length; i++) {
      total += haversineM(
        this.routeCoords[i - 1][0],
        this.routeCoords[i - 1][1],
        this.routeCoords[i][0],
        this.routeCoords[i][1]
      );
    }
    return total / (this.routeCoords.length - 1);
  }

  get speedMs(): number {
    return (this.speedKmh * 1000) / 3600;
  }
}
