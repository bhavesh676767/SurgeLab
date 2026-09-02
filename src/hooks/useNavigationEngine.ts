/**
 * useNavigationEngine
 *
 * React hook that connects the NavigationEngine to the mapStore.
 * Handles provider selection (GPS vs simulation), starts/stops navigation,
 * and forwards all engine events to the store.
 */

import { useEffect, useRef } from "react";
import { navigationEngine, NavigationEvent } from "@/services/navigationEngine";
import { LiveGPSProvider } from "@/services/liveGPSProvider";
import { SimulationProvider } from "@/services/simulationProvider";
import { useMapStore } from "@/store/mapStore";

export function useNavigationEngine() {
  const isNavigating = useMapStore((s) => s.isNavigating);
  const safeRoute = useMapStore((s) => s.safeRoute);
  const activeRouteTab = useMapStore((s) => s.activeRouteTab);
  const simulationMode = useMapStore((s) => s.simulationMode);

  const setNavigationPosition = useMapStore((s) => s.setNavigationPosition);
  const setCurrentStepIndex = useMapStore((s) => s.setCurrentStepIndex);
  const setIsRerouting = useMapStore((s) => s.setIsRerouting);
  const setShowHazardCallout = useMapStore((s) => s.setShowHazardCallout);
  const setShowRerouteAlert = useMapStore((s) => s.setShowRerouteAlert);
  const setUserLocation = useMapStore((s) => s.setUserLocation);
  const flyTo = useMapStore((s) => s.flyTo);

  const simProviderRef = useRef<SimulationProvider | null>(null);
  const activeRoute = activeRouteTab === "safe" ? safeRoute : null;

  useEffect(() => {
    if (!isNavigating || !activeRoute) {
      navigationEngine.stopNavigation();
      return;
    }

    // Select provider
    if (simulationMode) {
      const sim = new SimulationProvider();
      sim.setRoute(activeRoute.coordinates);
      sim.setSpeed(35);
      simProviderRef.current = sim;
      navigationEngine.setProvider(sim);
    } else {
      navigationEngine.setProvider(new LiveGPSProvider());
    }

    // Register event handler
    const unsubscribe = navigationEngine.on((event: NavigationEvent) => {
      switch (event.type) {
        case "position":
          setNavigationPosition(event.position);
          setUserLocation(
            { lat: event.position.lat, lng: event.position.lng },
            event.position.accuracy
          );
          flyTo({ lat: event.position.lat, lng: event.position.lng });
          break;

        case "step_advance":
          setCurrentStepIndex(event.stepIndex);
          break;

        case "state":
          // Sync key state to store
          setCurrentStepIndex(event.state.currentStepIndex);
          if (event.state.isOffRoute) {
            setIsRerouting(true);
            setShowRerouteAlert(true);
          }
          break;

        case "off_route":
          setIsRerouting(true);
          setShowRerouteAlert(true);
          break;

        case "hazard_ahead":
          setShowHazardCallout(true);
          break;

        case "arrived":
          setIsRerouting(false);
          setShowHazardCallout(false);
          setShowRerouteAlert(false);
          break;

        case "error":
          console.warn("[NavigationEngine]", event.message);
          break;
      }
    });

    // Start navigation
    navigationEngine.startNavigation(activeRoute);

    return () => {
      unsubscribe();
      navigationEngine.stopNavigation();
      setIsRerouting(false);
      setShowHazardCallout(false);
      setShowRerouteAlert(false);
    };
  }, [
    isNavigating,
    simulationMode,
    activeRoute?.coordinates,
    setNavigationPosition,
    setCurrentStepIndex,
    setIsRerouting,
    setShowHazardCallout,
    setShowRerouteAlert,
    setUserLocation,
    flyTo,
  ]);
}
