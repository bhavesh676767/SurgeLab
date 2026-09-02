import type { WaterloggingReport } from "@/store/mapStore";

const STORAGE_KEY = "surgelab-waterlogging-reports-v1";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

type SupabaseReport = {
  id: string;
  lat: number;
  lng: number;
  created_at: string;
};

function cachedReports(): WaterloggingReport[] {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value ? JSON.parse(value) : [];
  } catch {
    return [];
  }
}

function cacheReports(reports: WaterloggingReport[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}

function supabaseHeaders() {
  return {
    apikey: SUPABASE_KEY ?? "",
    Authorization: `Bearer ${SUPABASE_KEY ?? ""}`,
    "Content-Type": "application/json",
  };
}

function toAppReport(report: SupabaseReport): WaterloggingReport {
  return { id: report.id, lat: report.lat, lng: report.lng, createdAt: report.created_at };
}

function toDatabaseReport(report: WaterloggingReport): SupabaseReport {
  return { id: report.id, lat: report.lat, lng: report.lng, created_at: report.createdAt };
}

/** Uses Supabase when public credentials are configured, with local persistence as a safe fallback. */
export async function loadWaterloggingReports(): Promise<WaterloggingReport[]> {
  const local = cachedReports();
  if (!SUPABASE_URL || !SUPABASE_KEY) return local;

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/waterlogging_reports?select=id,lat,lng,created_at&order=created_at.desc`,
      { headers: supabaseHeaders() },
    );
    if (!response.ok) throw new Error("Could not load waterlogging reports");
    const remote = ((await response.json()) as SupabaseReport[]).map(toAppReport);
    cacheReports(remote);
    return remote;
  } catch {
    return local;
  }
}

export async function saveWaterloggingReports(reports: WaterloggingReport[]) {
  const next = [...cachedReports(), ...reports];
  cacheReports(next);
  if (!SUPABASE_URL || !SUPABASE_KEY) return;

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/waterlogging_reports`, {
      method: "POST",
      headers: { ...supabaseHeaders(), Prefer: "return=minimal" },
      body: JSON.stringify(reports.map(toDatabaseReport)),
    });
    if (!response.ok) throw new Error("Could not save waterlogging reports");
  } catch {
    // Local persistence keeps field reports safe while the API is unavailable.
  }
}

export async function deleteWaterloggingReports(ids: string[]) {
  if (!ids.length) return;
  cacheReports(cachedReports().filter((report) => !ids.includes(report.id)));
  if (!SUPABASE_URL || !SUPABASE_KEY) return;

  try {
    const filter = ids.join(",");
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/waterlogging_reports?id=in.(${filter})`,
      { method: "DELETE", headers: { ...supabaseHeaders(), Prefer: "return=minimal" } },
    );
    if (!response.ok) throw new Error("Could not remove waterlogging reports");
  } catch {
    // The browser cache is updated immediately; the next successful sync restores server truth.
  }
}
