import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type LiveDisplayStatus =
  | 'scheduled'
  | 'starting_soon'
  | 'live'
  | 'paused'
  | 'ended'
  | 'cancelled'
  | 'failed';

const LABELS: Record<LiveDisplayStatus, string> = {
  live: 'Live',
  starting_soon: 'Starting soon',
  scheduled: 'Scheduled',
  paused: 'Paused',
  ended: 'Ended',
  cancelled: 'Cancelled',
  failed: 'Failed',
};

function variantFor(status: LiveDisplayStatus) {
  if (status === 'live') return 'destructive' as const;
  if (status === 'starting_soon') return 'default' as const;
  if (status === 'ended') return 'secondary' as const;
  if (status === 'cancelled' || status === 'failed') return 'outline' as const;
  return 'secondary' as const;
}

export function LiveStatusBadge({
  status,
  className,
  pulse,
}: {
  status: LiveDisplayStatus | string;
  className?: string;
  pulse?: boolean;
}) {
  const key = (status in LABELS ? status : 'scheduled') as LiveDisplayStatus;
  const label = LABELS[key];
  const isLive = key === 'live';

  return (
    <Badge
      variant={variantFor(key)}
      className={cn(isLive || pulse ? 'gap-1.5' : undefined, className)}
    >
      {isLive || key === 'starting_soon' ? (
        <span
          className={cn(
            'inline-block size-2 rounded-full bg-current',
            (isLive || pulse) && 'animate-pulse'
          )}
          aria-hidden
        />
      ) : null}
      {label}
    </Badge>
  );
}
