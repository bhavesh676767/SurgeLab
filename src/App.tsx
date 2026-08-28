import { useEffect, useState } from "react";
import { MapContainer } from "@/components/map/MapContainer";
import { SearchBar } from "@/components/ui/SearchBar";
import { WeatherWidget } from "@/components/ui/WeatherWidget";
import { StormSimulator } from "@/components/ui/StormSimulator";
import { TerrainInspector } from "@/components/ui/TerrainInspector";
import { RiskLegend } from "@/components/ui/RiskLegend";
import { SplashScreen } from "@/components/SplashScreen";
import { startWeatherStream } from "@/services/weatherService";
import { useMapStore } from "@/store/mapStore";

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const setWeather = useMapStore((s) => s.setWeather);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 2800);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const stop = startWeatherStream(setWeather);
    return stop;
  }, [setWeather]);

  return (
    <>
      {showSplash && <SplashScreen />}

      <div className="relative h-[100dvh] w-screen overflow-hidden bg-black">
        <MapContainer />

        <div className="pointer-events-none absolute inset-0 z-[1000] flex flex-col p-4 sm:p-6">
          <header className="pointer-events-auto flex flex-col gap-3 max-w-xl">
            <SearchBar />
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <WeatherWidget />
              <StormSimulator />
            </div>
          </header>
        </div>

        <TerrainInspector />

        <div className="pointer-events-none absolute bottom-6 right-16 z-[1000] sm:bottom-8 sm:right-20">
          <RiskLegend />
        </div>
      </div>
    </>
  );
}
