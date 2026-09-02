import { useState } from 'react';
import { ShieldCheck, Scale, Zap, ChevronDown, ChevronUp, Activity, Droplets, Mountain, CloudRain, Map, GitBranch } from 'lucide-react';
import { useMapStore } from '@/store/mapStore';
import type { NavSettings } from '@/store/mapStore';
import { BottomSheet } from './BottomSheet';

function ToggleSwitch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={['relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200', checked ? 'bg-slate-900' : 'bg-slate-200'].join(' ')}
    >
      <span
        className={['inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200', checked ? 'translate-x-6' : 'translate-x-1'].join(' ')}
        aria-hidden="true"
      />
    </button>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 mt-5 first:mt-0">{children}</p>;
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export function SettingsPanel() {
  const isOpen = useMapStore((s) => s.isSettingsOpen);
  const navSettings = useMapStore((s) => s.navSettings);
  const simulationMode = useMapStore((s) => s.simulationMode);
  const stormIntensity = useMapStore((s) => s.stormIntensity);
  const weather = useMapStore((s) => s.weather);
  const basemapMode = useMapStore((s) => s.basemapMode);
  const showTerrainPaint = useMapStore((s) => s.showTerrainPaint);
  const toggleSatellite = useMapStore((s) => s.toggleSatellite);
  const setSettingsOpen = useMapStore((s) => s.setSettingsOpen);
  const setNavSettings = useMapStore((s) => s.setNavSettings);
  const setSimulationMode = useMapStore((s) => s.setSimulationMode);
  const setShowTerrainPaint = useMapStore((s) => s.setShowTerrainPaint);

  const [devTapCount, setDevTapCount] = useState(0);
  const [showDev, setShowDev] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const update = (patch: Partial<NavSettings>) => setNavSettings(patch);

  const handleVersionTap = () => {
    const next = devTapCount + 1;
    setDevTapCount(next);
    if (next >= 7) { setShowDev(true); setDevTapCount(0); }
  };

  const routeOptions: { label: string; Icon: React.ComponentType<{ className?: string }>; value: NavSettings['routePreference'] }[] = [
    { label: 'Lower risk', Icon: ShieldCheck, value: 'safe' },
    { label: 'Balanced', Icon: Scale, value: 'balanced' },
    { label: 'Fastest', Icon: Zap, value: 'fast' },
  ];

  return (
    <BottomSheet isOpen={isOpen} onClose={() => setSettingsOpen(false)} title="Settings">
      {/* Navigation preference */}
      <SectionHeader>Navigation</SectionHeader>
      <div className="grid grid-cols-3 gap-2 mb-2">
        {routeOptions.map(({ label, Icon, value }) => {
          const selected = navSettings.routePreference === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => update({ routePreference: value })}
              className={[
                'rounded-2xl py-3 text-xs font-bold border flex flex-col items-center gap-1.5 transition active:scale-95',
                selected ? 'bg-sky-500 text-white border-sky-500 shadow-md shadow-sky-500/20' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300',
              ].join(' ')}
            >
              <Icon className={['h-4 w-4', selected ? 'text-white' : 'text-slate-500'].join(' ')} aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>

      {/* Map appearance */}
      <SectionHeader>Map style</SectionHeader>
      <SettingRow label="Satellite view" description="Switch between standard light map and high-resolution Esri satellite imagery">
        <ToggleSwitch
          label="Satellite view"
          checked={basemapMode === 'satellite'}
          onChange={() => toggleSatellite()}
        />
      </SettingRow>
      <SettingRow
        label="Risk street lines"
        description="Show colour-coded street-level flood-risk overlay on the map"
      >
        <ToggleSwitch
          label="Risk street lines"
          checked={showTerrainPaint}
          onChange={(v) => setShowTerrainPaint(v)}
        />
      </SettingRow>

      {/* Risk avoidance */}
      <SectionHeader>Risk avoidance</SectionHeader>
      <SettingRow label="Avoid high-risk roads" description="Route around roads with estimated severe flooding">
        <ToggleSwitch label="Avoid high-risk roads" checked={navSettings.avoidHighRisk} onChange={(v) => update({ avoidHighRisk: v })} />
      </SettingRow>
      <SettingRow label="Avoid flooded underpasses" description="Skip underpasses with high estimated water depth">
        <ToggleSwitch label="Avoid flooded underpasses" checked={navSettings.avoidUnderpasses} onChange={(v) => update({ avoidUnderpasses: v })} />
      </SettingRow>
      <SettingRow label="Avoid low-elevation roads">
        <ToggleSwitch label="Avoid low-elevation roads" checked={navSettings.avoidLowElevation} onChange={(v) => update({ avoidLowElevation: v })} />
      </SettingRow>

      {/* SMART ANALYSIS (§17 requirement: technical depth accessible on-demand) */}
      <SectionHeader>Advanced intelligence</SectionHeader>
      <button
        type="button"
        onClick={() => setShowAnalysis((s) => !s)}
        aria-expanded={showAnalysis}
        className="flex w-full items-center justify-between py-3 px-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-sm font-semibold text-slate-800 hover:bg-slate-100/80 transition"
      >
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-sky-500" aria-hidden="true" />
          <span>Smart Analysis</span>
        </div>
        {showAnalysis ? (
          <ChevronUp className="h-4 w-4 text-slate-400" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />
        )}
      </button>

      {showAnalysis && (
        <div className="mt-3 rounded-2xl bg-slate-50 border border-slate-200/80 p-4 space-y-3 fade-in text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white p-3 border border-slate-100">
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1">
                <CloudRain className="h-3.5 w-3.5 text-sky-500" /> Rainfall
              </p>
              <p className="text-sm font-bold text-slate-900">{weather?.rain ?? 0} mm/hr</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Precipitation: {weather?.precipitation ?? 0} mm</p>
            </div>
            <div className="rounded-xl bg-white p-3 border border-slate-100">
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1">
                <Droplets className="h-3.5 w-3.5 text-blue-500" /> Water Depth
              </p>
              <p className="text-sm font-bold text-slate-900">Estimated</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Based on terrain slope</p>
            </div>
            <div className="rounded-xl bg-white p-3 border border-slate-100">
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1">
                <Mountain className="h-3.5 w-3.5 text-amber-500" /> Elevation
              </p>
              <p className="text-sm font-bold text-slate-900">218–226 m</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Gurugram terrain grid</p>
            </div>
            <div className="rounded-xl bg-white p-3 border border-slate-100">
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1">
                <Activity className="h-3.5 w-3.5 text-emerald-500" /> Storm Intensity
              </p>
              <p className="text-sm font-bold text-slate-900">{stormIntensity}%</p>
              <p className="text-[10px] text-slate-400 mt-0.5">ML model weight</p>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 italic">
            Detailed calculations combining Open-Meteo live weather, spatial terrain slope, and historical waterlogging hotspots.
          </p>
        </div>
      )}

      {/* Notifications */}
      <SectionHeader>Notifications</SectionHeader>
      <SettingRow label="Route risk changes" description="Alert when conditions along your route worsen">
        <ToggleSwitch label="Route risk change notifications" checked={navSettings.notifyRiskChange} onChange={(v) => update({ notifyRiskChange: v })} />
      </SettingRow>
      <SettingRow label="Severe waterlogging alerts">
        <ToggleSwitch label="Severe waterlogging alerts" checked={navSettings.notifySevereWaterlogging} onChange={(v) => update({ notifySevereWaterlogging: v })} />
      </SettingRow>

      {/* About */}
      <SectionHeader>About</SectionHeader>
      <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4 space-y-1">
        <button type="button" onClick={handleVersionTap} className="w-full text-left">
          <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-sky-500" aria-hidden="true" />
            SurgeLab v0.1.0
          </p>
        </button>
        <p className="text-xs text-slate-500">Flood-aware consumer navigation for Gurugram</p>
        <p className="text-xs text-slate-400 leading-relaxed mt-2">
          Risk estimates are calculated using terrain, rainfall, and historical data.
          <strong className="font-semibold"> Always use your own judgement when driving.</strong>
        </p>
      </div>

      {/* Developer panel (hidden, revealed by 7 taps on version) */}
      {showDev && (
        <div className="mt-4 rounded-2xl border-2 border-dashed border-orange-300 bg-orange-50 p-4 fade-in">
          <p className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-3">Developer Mode</p>
          <SettingRow label="Simulation mode" description="Simulate GPS movement along route (demo/testing only)">
            <ToggleSwitch label="Simulation mode" checked={simulationMode} onChange={setSimulationMode} />
          </SettingRow>
          <button type="button" onClick={() => setShowDev(false)} className="mt-2 text-xs text-orange-500 underline font-medium">Hide developer panel</button>
        </div>
      )}
    </BottomSheet>
  );
}
