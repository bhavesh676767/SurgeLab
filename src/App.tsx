import { useEffect, useState } from "react";
import { MapContainer } from "@/components/map/MapContainer";
import { NavigationPanel } from "@/components/ui/NavigationPanel";
import { ConditionsPanel } from "@/components/ui/ConditionsPanel";
import { RouteBottomSheet } from "@/components/ui/RouteBottomSheet";
import { NavigationHUD } from "@/components/ui/NavigationHUD";
import { HazardCallout } from "@/components/ui/HazardCallout";
import { RerouteAlert } from "@/components/ui/RerouteAlert";
import { WaterloggingSheet } from "@/components/ui/WaterloggingSheet";
import { FloodedRoadSheet } from "@/components/ui/FloodedRoadSheet";
import { SettingsPanel } from "@/components/ui/SettingsPanel";
import { LayerSelector } from "@/components/map/LayerSelector";
import { RiskLegend } from "@/components/ui/RiskLegend";
import { OnboardingFlow } from "@/components/ui/OnboardingFlow";
import { SplashScreen } from "@/components/SplashScreen";
import { Preloader } from "@/components/Preloader";
import { SatellitePromptModal } from "@/components/ui/SatellitePromptModal";
import { startWeatherStream } from "@/services/weatherService";
import { useMapStore } from "@/store/mapStore";

import { SmartAnalysisDrawer } from "@/components/ui/SmartAnalysisDrawer";
import { ElevationProfileModal } from "@/components/ui/ElevationProfile";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

  const setWeather = useMapStore((s) => s.setWeather);
  const appMode = useMapStore((s) => s.appMode);
  const setSettingsOpen = useMapStore((s) => s.setSettingsOpen);

  useEffect(() => {
    // Fast, responsive Preloader & Splash sequence
    const loadTimer = window.setTimeout(() => setLoading(false), 280);
    const splashTimer = window.setTimeout(() => setShowSplash(false), 900);
    return () => {
      window.clearTimeout(loadTimer);
      window.clearTimeout(splashTimer);
    };
  }, []);

  useEffect(() => {
    const stop = startWeatherStream(setWeather);
    return stop;
  }, [setWeather]);

  if (loading) {
    return <Preloader label="Loading SurgeLab Navigation..." />;
  }

  const isNavigating = appMode === 'navigating';

  return (
    <>
      {showSplash && <SplashScreen />}

      <div className="relative h-[100dvh] w-screen overflow-hidden bg-slate-100 font-sans">
        {/* Full-screen map */}
        <MapContainer />

        {/* Top bar container */}
        {!isNavigating && (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-[1100] p-3 sm:p-4">
            <div className="pointer-events-auto w-full max-w-md mx-auto">
              <NavigationPanel />
            </div>
          </div>
        )}

        {/* Risk Legend — bottom-left, single Water risk chip that expands to full legend */}
        {!isNavigating && (
          <div className="pointer-events-none absolute bottom-6 left-4 z-[1000] sm:bottom-8 sm:left-6">
            <RiskLegend />
          </div>
        )}

        {/* Layer Selector Floating Popover */}
        <LayerSelector />

        {/* Active Turn-by-Turn Navigation Overlay */}
        <NavigationHUD />
        <HazardCallout />
        <RerouteAlert />

        {/* Bottom Sheets & Advanced Drawers */}
        <RouteBottomSheet />
        <ConditionsPanel />
        <WaterloggingSheet />
        <FloodedRoadSheet />
        <SettingsPanel />
        <SmartAnalysisDrawer />
        <ElevationProfileModal />

        {/* Onboarding Flow & Satellite Mode Prompt */}
        <OnboardingFlow />
        <SatellitePromptModal />
      </div>
    </>
  );
}
