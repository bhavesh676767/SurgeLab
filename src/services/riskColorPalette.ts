/**
 * Full waterlogging spectrum: green (dry) → orange → red → purple → black (submerged).
 * Smooth interpolation for natural terrain and road painting.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Normalized stops along 0–1 risk. */
const STOPS: { t: number; rgb: Rgb }[] = [
  { t: 0, rgb: { r: 16, g: 185, b: 129 } }, // emerald — clear
  { t: 0.12, rgb: { r: 52, g: 211, b: 153 } },
  { t: 0.22, rgb: { r: 110, g: 231, b: 183 } },
  { t: 0.32, rgb: { r: 163, g: 230, b: 53 } }, // lime
  { t: 0.42, rgb: { r: 250, g: 204, b: 21 } }, // yellow
  { t: 0.52, rgb: { r: 245, g: 158, b: 11 } }, // amber / orange
  { t: 0.62, rgb: { r: 249, g: 115, b: 22 } },
  { t: 0.72, rgb: { r: 239, g: 68, b: 68 } }, // red
  { t: 0.80, rgb: { r: 220, g: 38, b: 38 } },
  { t: 0.88, rgb: { r: 168, g: 85, b: 247 } }, // purple
  { t: 0.94, rgb: { r: 124, g: 58, b: 237 } },
  { t: 1, rgb: { r: 12, g: 10, b: 18 } }, // near-black — intense inundation
];

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function interpolateRiskRgb(riskPct: number): Rgb {
  const t = clamp01(riskPct / 100);

  for (let i = 0; i < STOPS.length - 1; i++) {
    const a = STOPS[i];
    const b = STOPS[i + 1];
    if (t >= a.t && t <= b.t) {
      const span = b.t - a.t;
      const local = span === 0 ? 0 : (t - a.t) / span;
      return {
        r: Math.round(a.rgb.r + (b.rgb.r - a.rgb.r) * local),
        g: Math.round(a.rgb.g + (b.rgb.g - a.rgb.g) * local),
        b: Math.round(a.rgb.b + (b.rgb.b - a.rgb.b) * local),
      };
    }
  }

  return STOPS[STOPS.length - 1].rgb;
}

export function riskColorHex(riskPct: number): string {
  const { r, g, b } = interpolateRiskRgb(riskPct);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export function riskColorRgba(riskPct: number, alpha: number): string {
  const { r, g, b } = interpolateRiskRgb(riskPct);
  return `rgba(${r}, ${g}, ${b}, ${clamp01(alpha)})`;
}

/** Terrain wash — alpha ramps with severity for organic pooling. */
export function terrainFillAlpha(riskPct: number): number {
  if (riskPct < 12) return 0.05;
  if (riskPct < 28) return 0.08 + riskPct * 0.003;
  if (riskPct < 55) return 0.14 + riskPct * 0.003;
  if (riskPct < 78) return 0.22 + riskPct * 0.002;
  return 0.32 + (riskPct - 78) * 0.004;
}

export function terrainGlowAlpha(riskPct: number): number {
  return terrainFillAlpha(riskPct) * 0.35;
}

export function terrainInfluenceRadiusM(riskPct: number): number {
  const t = clamp01(riskPct / 100);
  return 60 + t * t * 280;
}

export type RiskLevel = 0 | 1 | 2 | 3 | 4 | 5;

export function riskLevel(riskPct: number): RiskLevel {
  if (riskPct < 12) return 0;
  if (riskPct < 28) return 1;
  if (riskPct < 45) return 2;
  if (riskPct < 62) return 3;
  if (riskPct < 80) return 4;
  return 5;
}

export function riskLevelLabel(riskPct: number): string {
  const level = riskLevel(riskPct);
  const labels = [
    "Clear — no waterlogging",
    "Trace moisture",
    "Minor pooling",
    "Moderate inundation",
    "Severe flooding",
    "Critical — submerged",
  ];
  return labels[level];
}

export interface RoadPaintStyle {
  color: string;
  weight: number;
  opacity: number;
}

export function roadPaintStyle(riskPct: number, baseWeight: number): RoadPaintStyle {
  const level = riskLevel(riskPct);
  const color = riskColorHex(riskPct);
  const weight = baseWeight + level * 0.4;
  const opacity = 0.65 + level * 0.05;

  return {
    color,
    weight,
    opacity: Math.min(0.9, opacity),
  };
}

/** Legend strip samples for UI. */
export const LEGEND_SAMPLES = [
  { label: "Clear", pct: 0 },
  { label: "Trace", pct: 18 },
  { label: "Minor", pct: 35 },
  { label: "Moderate", pct: 52 },
  { label: "Severe", pct: 72 },
  { label: "Critical", pct: 96 },
] as const;
