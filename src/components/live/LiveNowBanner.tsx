import Link from 'next/link';
import { Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LiveStatusBadge } from '@/components/live/LiveStatusBadge';

export function LiveNowBanner({
  title,
  slug,
  displayStatus,
}: {
  title: string;
  slug: string;
  displayStatus: string;
}) {
  return (
    <div
      role="region"
      aria-label="Live now"
      className="border-b border-destructive/20 bg-destructive/10"
    >
      <div className="container flex flex-col items-start justify-between gap-3 py-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Radio className="size-5 shrink-0 text-destructive" aria-hidden />
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <LiveStatusBadge status={displayStatus} pulse />
              <span className="text-sm font-medium">We&apos;re live now</span>
            </div>
            <p className="text-sm text-muted-foreground">{title}</p>
          </div>
        </div>
        <Button asChild size="sm">
          <Link href={`/live/${slug}`}>Watch Service</Link>
        </Button>
      </div>
    </div>
  );
}
