import { LEGEND_SAMPLES, riskColorHex } from "@/services/riskColorPalette";

export function RiskLegend() {
  return (
    <div
      className="pointer-events-auto rounded-2xl border border-white/10 bg-black/75 px-3 py-2.5 shadow-xl backdrop-blur-xl"
      aria-label="Waterlogging risk legend"
    >
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-white/50">
        Water depth risk
      </p>
      <div
        className="h-2.5 w-full rounded-full"
        style={{
          background: `linear-gradient(to right, ${LEGEND_SAMPLES.map(
            (s) => riskColorHex(s.pct),
          ).join(", ")})`,
        }}
      />
      <div className="mt-1.5 flex justify-between gap-1 text-[9px] text-white/45">
        <span>Clear</span>
        <span>Orange</span>
        <span>Red</span>
        <span>Purple</span>
        <span>Submerged</span>
      </div>
    </div>
  );
}
