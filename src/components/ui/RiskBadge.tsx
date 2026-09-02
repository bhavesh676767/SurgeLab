type RiskLevel = 'safe' | 'caution' | 'moderate' | 'danger' | 'severe' | 'unknown';

interface RiskBadgeProps {
  level: RiskLevel;
  label?: string;
  size?: 'sm' | 'md';
  showDot?: boolean;
}

const LEVEL_CONFIG: Record<RiskLevel, { text: string; dot: string; badge: string; defaultLabel: string }> = {
  safe:     { dot: 'bg-green-500',  text: 'text-green-700',  badge: 'bg-green-50 border-green-200',   defaultLabel: 'Lower risk' },
  caution:  { dot: 'bg-amber-500',  text: 'text-amber-700',  badge: 'bg-amber-50 border-amber-200',   defaultLabel: 'Caution' },
  moderate: { dot: 'bg-orange-500', text: 'text-orange-700', badge: 'bg-orange-50 border-orange-200', defaultLabel: 'Moderate risk' },
  danger:   { dot: 'bg-red-500',    text: 'text-red-700',    badge: 'bg-red-50 border-red-200',       defaultLabel: 'High risk' },
  severe:   { dot: 'bg-purple-500', text: 'text-purple-700', badge: 'bg-purple-50 border-purple-200', defaultLabel: 'Severe risk' },
  unknown:  { dot: 'bg-slate-400',  text: 'text-slate-600',  badge: 'bg-slate-100 border-slate-200',  defaultLabel: 'Unknown' },
};

export function RiskBadge({ level, label, size = 'sm', showDot = true }: RiskBadgeProps) {
  const cfg = LEVEL_CONFIG[level];
  const displayLabel = label ?? cfg.defaultLabel;

  const sizeClass = size === 'sm'
    ? 'text-xs px-2 py-0.5'
    : 'text-sm px-3 py-1';

  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full border font-semibold',
        sizeClass,
        cfg.text,
        cfg.badge,
      ].join(' ')}
    >
      {showDot && (
        <span className={['inline-block h-1.5 w-1.5 rounded-full flex-shrink-0', cfg.dot].join(' ')} aria-hidden="true" />
      )}
      {displayLabel}
    </span>
  );
}

/** Derive risk level from a percentage (0–100) */
export function riskLevelFromPct(pct: number): RiskLevel {
  if (pct < 20) return 'safe';
  if (pct < 40) return 'caution';
  if (pct < 60) return 'moderate';
  if (pct < 80) return 'danger';
  return 'severe';
}

/** Derive risk level from depth in cm */
export function riskLevelFromDepth(cm: number): RiskLevel {
  if (cm < 5)  return 'safe';
  if (cm < 15) return 'caution';
  if (cm < 30) return 'moderate';
  if (cm < 50) return 'danger';
  return 'severe';
}
