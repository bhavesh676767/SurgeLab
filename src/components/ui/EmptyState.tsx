import {
  MapPinOff,
  RouteOff,
  Droplets,
  Clock,
  WifiOff,
  MapPin,
  CloudDrizzle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

type EmptyStateType =
  | 'gps-unavailable'
  | 'no-route'
  | 'no-flood-data'
  | 'stale-data'
  | 'network-failure'
  | 'destination-unavailable'
  | 'low-rainfall-data'
  | 'generic';

interface EmptyStateProps {
  type: EmptyStateType;
  customTitle?: string;
  customBody?: string;
  onRetry?: () => void;
  className?: string;
}

const STATE_CONFIG: Record<
  EmptyStateType,
  { Icon: React.ComponentType<{ className?: string }>; iconColor: string; title: string; body: string }
> = {
  'gps-unavailable': {
    Icon: MapPinOff,
    iconColor: 'text-slate-400',
    title: 'Location unavailable',
    body: 'Enter your starting point manually, or check your browser location permissions.',
  },
  'no-route': {
    Icon: RouteOff,
    iconColor: 'text-slate-400',
    title: 'No route found',
    body: 'We could not calculate a route to this destination. Try a different location.',
  },
  'no-flood-data': {
    Icon: Droplets,
    iconColor: 'text-slate-400',
    title: 'No waterlogging data',
    body: "We can't verify current water conditions for this area. Navigation will use standard route information.",
  },
  'stale-data': {
    Icon: Clock,
    iconColor: 'text-amber-500',
    title: 'Data may be outdated',
    body: 'Last confirmed over 15 minutes ago. Estimates shown may not reflect current conditions.',
  },
  'network-failure': {
    Icon: WifiOff,
    iconColor: 'text-slate-400',
    title: 'Connection lost',
    body: 'Check your internet connection and try again.',
  },
  'destination-unavailable': {
    Icon: MapPin,
    iconColor: 'text-slate-400',
    title: 'Destination not found',
    body: 'Try a different search term, or tap on the map to pick a location.',
  },
  'low-rainfall-data': {
    Icon: CloudDrizzle,
    iconColor: 'text-slate-400',
    title: 'Limited rainfall data',
    body: 'Risk estimates for this area are approximate and may not reflect local conditions.',
  },
  generic: {
    Icon: AlertCircle,
    iconColor: 'text-slate-400',
    title: 'Something went wrong',
    body: 'Please try again.',
  },
};

export function EmptyState({ type, customTitle, customBody, onRetry, className = '' }: EmptyStateProps) {
  const cfg = STATE_CONFIG[type];
  const { Icon } = cfg;

  return (
    <div
      className={[
        'bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center',
        className,
      ].join(' ')}
    >
      <Icon className={['h-10 w-10 mx-auto mb-3', cfg.iconColor].join(' ')} aria-hidden="true" />
      <h3 className="text-sm font-semibold text-slate-900 mb-1">
        {customTitle ?? cfg.title}
      </h3>
      <p className="text-xs text-slate-500 leading-relaxed">
        {customBody ?? cfg.body}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-sky-500 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-600 active:scale-95 transition"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Try again
        </button>
      )}
    </div>
  );
}
