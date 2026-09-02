/**
 * Navigation Engine
 *
 * Provides a unified interface for live GPS and simulation-based navigation.
 * The UI is completely agnostic to the location source.
 *
 * Architecture:
 *   NavigationEngine
 *   ├── LiveGPSProvider    (navigator.geolocation.watchPosition)
 *   └── SimulationProvider (animates along route coordinates)
 */

import type { RouteResult, RouteStep } from "@/types/dataset";

// ─── Shared Types ────────────────────────────────────────────────────────────

export interface NavigationPosition {
  lat: number;
  lng: number;
  heading: number | null; // degrees from north, null if unknown
  accuracy: number;       // metres
  speed: number | null;   // m/s, null if unknown
  timestamp: number;
}

export interface NavigationState {
  position: NavigationPosition | null;
  currentStepIndex: number;
  distanceToManeuver: number; // metres
  distanceRemaining: number;  // metres
  durationRemaining: number;  // seconds
  progress: number;           // 0–1 fraction of route completed
  isOffRoute: boolean;
  isArrived: boolean;
  upcomingHazardDistance: number | null; // metres to next hazard, null if none
}

export type NavigationEvent =
  | { type: "position"; position: NavigationPosition }
  | { type: "step_advance"; stepIndex: number; step: RouteStep }
  | { type: "state"; state: NavigationState }
  | { type: "off_route" }
  | { type: "rerouting" }
  | { type: "arrived" }
  | { type: "hazard_ahead"; distanceM: number; depthCm: number }
  | { type: "error"; message: string };

export type NavigationEventHandler = (event: NavigationEvent) => void;

// ─── Provider Interface ───────────────────────────────────────────────────────

export interface ILocationProvider {
  readonly type: "gps" | "simulation";
  start(
    onPosition: (pos: NavigationPosition) => void,
    onError: (message: string) => void
  ): void;
  stop(): void;
}

// ─── Geometry Helpers ─────────────────────────────────────────────────────────

/** Haversine distance between two lat/lng points in metres */
export function haversineM(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6_371_000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Bearing from (lat1,lng1) → (lat2,lng2) in degrees 0-360 */
function bearingDeg(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Find the closest point on the polyline and return its index + distance off-route */
function closestRoutePoint(
  pos: NavigationPosition,
  coords: [number, number][]
): { index: number; distanceM: number } {
  let best = { index: 0, distanceM: Infinity };
  for (let i = 0; i < coords.length; i++) {
    const d = haversineM(pos.lat, pos.lng, coords[i][0], coords[i][1]);
    if (d < best.distanceM) best = { index: i, distanceM: d };
  }
  return best;
}

/** Total route distance from index to end in metres */
function distanceFromIndex(
  coords: [number, number][],
  fromIndex: number
): number {
  let total = 0;
  for (let i = fromIndex; i < coords.length - 1; i++) {
    total += haversineM(coords[i][0], coords[i][1], coords[i + 1][0], coords[i + 1][1]);
  }
  return total;
}

// ─── Navigation Engine ────────────────────────────────────────────────────────

const OFF_ROUTE_THRESHOLD_M = 60; // metres off route before flagging deviation
const ARRIVAL_THRESHOLD_M = 30;     // metres to destination before declaring arrival
const HAZARD_WARN_THRESHOLD_M = 800; // warn about hazards within 800m

export class NavigationEngine {
  private provider: ILocationProvider | null = null;
  private route: RouteResult | null = null;
  private handlers: NavigationEventHandler[] = [];
  private state: NavigationState = {
    position: null,
    currentStepIndex: 0,
    distanceToManeuver: 0,
    distanceRemaining: 0,
    durationRemaining: 0,
    progress: 0,
    isOffRoute: false,
    isArrived: false,
    upcomingHazardDistance: null,
  };

  setProvider(provider: ILocationProvider) {
    this.provider = provider;
  }

  on(handler: NavigationEventHandler) {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  private emit(event: NavigationEvent) {
    for (const h of this.handlers) h(event);
  }

  startNavigation(route: RouteResult) {
    this.route = route;
    this.state = {
      position: null,
      currentStepIndex: 0,
      distanceToManeuver: route.steps[0]?.distanceM ?? 0,
      distanceRemaining: route.distanceMeters,
      durationRemaining: route.durationSeconds,
      progress: 0,
      isOffRoute: false,
      isArrived: false,
      upcomingHazardDistance: null,
    };

    if (!this.provider) {
      this.emit({ type: "error", message: "No location provider set." });
      return;
    }

    this.provider.start(
      (pos) => this.handlePosition(pos),
      (msg) => this.emit({ type: "error", message: msg })
    );
  }

  stopNavigation() {
    this.provider?.stop();
    this.route = null;
  }

  private handlePosition(pos: NavigationPosition) {
    const route = this.route;
    if (!route) return;

    this.state.position = pos;
    this.emit({ type: "position", position: pos });

    const coords = route.coordinates;
    const totalCoords = coords.length;

    // Find closest point on route
    const closest = closestRoutePoint(pos, coords);

    // Off-route detection
    const wasOffRoute = this.state.isOffRoute;
    this.state.isOffRoute = closest.distanceM > OFF_ROUTE_THRESHOLD_M;
    if (this.state.isOffRoute && !wasOffRoute) {
      this.emit({ type: "off_route" });
    }

    // Progress
    this.state.progress = closest.index / Math.max(1, totalCoords - 1);

    // Distance remaining
    this.state.distanceRemaining = distanceFromIndex(coords, closest.index);

    // ETA based on remaining distance and average speed from original
    const avgSpeedMs = route.distanceMeters / Math.max(1, route.durationSeconds);
    this.state.durationRemaining = Math.round(
      this.state.distanceRemaining / Math.max(1, avgSpeedMs)
    );

    // Arrival detection
    const destination = coords[coords.length - 1];
    const distToDest = haversineM(pos.lat, pos.lng, destination[0], destination[1]);
    if (distToDest < ARRIVAL_THRESHOLD_M && !this.state.isArrived) {
      this.state.isArrived = true;
      this.emit({ type: "arrived" });
      return;
    }

    // Step advancement — find current step based on position
    const steps = route.steps;
    if (steps.length > 0 && this.state.currentStepIndex < steps.length - 1) {
      // Advance step if we've covered enough of the route
      const stepProgressThreshold =
        (this.state.currentStepIndex + 1) / steps.length;
      if (
        this.state.progress >= stepProgressThreshold - 0.02 &&
        this.state.currentStepIndex < steps.length - 1
      ) {
        this.state.currentStepIndex++;
        const nextStep = steps[this.state.currentStepIndex];
        this.state.distanceToManeuver = nextStep?.distanceM ?? 0;
        this.emit({
          type: "step_advance",
          stepIndex: this.state.currentStepIndex,
          step: nextStep,
        });
      }
    }

    // Hazard look-ahead
    const hazards = route.hazardLocations;
    let nearestHazard: number | null = null;
    for (const hazard of hazards) {
      const d = haversineM(pos.lat, pos.lng, hazard.lat, hazard.lng);
      if (d < HAZARD_WARN_THRESHOLD_M) {
        // Only warn about hazards ahead (not behind)
        const bearingToHazard = bearingDeg(pos.lat, pos.lng, hazard.lat, hazard.lng);
        const headingDiff = pos.heading !== null
          ? Math.abs(bearingToHazard - pos.heading)
          : 0;
        if (headingDiff < 90 || headingDiff > 270) {
          if (nearestHazard === null || d < nearestHazard) {
            nearestHazard = d;
          }
          if (d < HAZARD_WARN_THRESHOLD_M) {
            this.emit({
              type: "hazard_ahead",
              distanceM: Math.round(d),
              depthCm: hazard.depthCm,
            });
          }
        }
      }
    }
    this.state.upcomingHazardDistance = nearestHazard;

    // Emit state update
    this.emit({ type: "state", state: { ...this.state } });
  }

  getState(): NavigationState {
    return { ...this.state };
  }
}

// Singleton instance
export const navigationEngine = new NavigationEngine();
