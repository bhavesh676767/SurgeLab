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
import { DesktopRoutePanel } from "@/components/ui/DesktopRoutePanel";
import { WaterRiskLayerControl } from "@/components/ui/WaterRiskLayerControl";

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

      <div className="relative h-[100dvh] w-screen overflow-hidden bg-slate-100 font-sans select-none">
        {/* Full-screen 100% viewport map */}
        <MapContainer />

        {/* Left Desktop Floating Stack (Top Search / Route Bar + Left Route Panel) */}
        {!isNavigating && (
          <div className="pointer-events-none absolute left-3 top-3 z-[1100] sm:left-6 sm:top-6 flex flex-col gap-3 max-w-[calc(100vw-24px)] w-full sm:w-[390px] lg:w-[410px]">
            {/* Top Search / Route Bar */}
            <div className="pointer-events-auto w-full">
              <NavigationPanel />
            </div>

            {/* Desktop Left Route Information Panel (Rendered on >=1024px screens) */}
            <div className="pointer-events-auto hidden lg:block w-full">
              <DesktopRoutePanel />
            </div>
          </div>
        )}

        {/* Lower-left: Water-Risk Layer Control & Depth Guide */}
        {!isNavigating && (
          <div className="pointer-events-none absolute bottom-6 left-4 z-[1000] sm:bottom-6 sm:left-6">
            <WaterRiskLayerControl />
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
