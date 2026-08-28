import type { WeatherSnapshot } from "@/types/dataset";

const OPEN_METEO_URL =
  "https://api.open-meteo.com/v1/forecast?latitude=28.4593&longitude=77.0326&current=precipitation,rain,weather_code,temperature_2m&timezone=Asia%2FKolkata";

const DEFAULT_POLL_MS = 60_000;

export async function fetchLiveWeather(): Promise<WeatherSnapshot> {
  const res = await fetch(OPEN_METEO_URL);
  if (!res.ok) {
    throw new Error(`Weather API error: ${res.status}`);
  }
  const data = await res.json();
  return {
    precipitation: data.current?.precipitation ?? 0,
    rain: data.current?.rain ?? 0,
    weatherCode: data.current?.weather_code ?? 0,
    temperature: data.current?.temperature_2m ?? 0,
    updatedAt: data.current?.time ?? new Date().toISOString(),
  };
}

export function startWeatherStream(
  onUpdate: (weather: WeatherSnapshot) => void,
  intervalMs = DEFAULT_POLL_MS,
): () => void {
  let cancelled = false;

  const poll = async () => {
    if (cancelled) return;
    try {
      const snapshot = await fetchLiveWeather();
      if (!cancelled) onUpdate(snapshot);
    } catch {
      /* best-effort streaming */
    }
  };

  poll();
  const id = window.setInterval(poll, intervalMs);

  return () => {
    cancelled = true;
    window.clearInterval(id);
  };
}
