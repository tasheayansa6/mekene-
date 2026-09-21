import Link from 'next/link';
import { MapPin, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CardHover } from './CardHover';
import { formatInTimeZone } from '@/lib/events/timezone';

interface EventCardProps {
  title: string;
  date: string;
  endDate?: string;
  location?: string;
  description?: string;
  isRecurring?: boolean;
  href?: string;
  timeZone?: string;
  cancelled?: boolean;
  isOnline?: boolean;
}

export function EventCard({
  title,
  date,
  endDate,
  location,
  description,
  isRecurring,
  href,
  timeZone = 'Africa/Addis_Ababa',
  cancelled,
  isOnline,
}: EventCardProps) {
  const day = formatInTimeZone(date, timeZone, { day: 'numeric' });
  const month = formatInTimeZone(date, timeZone, { month: 'short' }).toUpperCase();
  const dateLabel = formatInTimeZone(date, timeZone, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const content = (
    <Card
      className={`group gap-0 overflow-hidden py-0 transition-colors hover:border-primary/30 hover:shadow-md ${
        cancelled ? 'border-destructive/40' : ''
      }`}
    >
      <CardContent className="flex gap-4 p-4">
        <div className="flex min-w-[72px] flex-shrink-0 flex-col items-center justify-center rounded-lg bg-primary/5 p-3">
          <span className="text-3xl font-bold text-primary leading-none" aria-hidden="true">
            {day}
          </span>
          <span className="mt-1 text-xs uppercase text-muted-foreground" aria-hidden="true">
            {month}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold leading-snug">{title}</h3>
            {cancelled ? (
              <Badge variant="destructive" className="uppercase tracking-wide">
                Cancelled
              </Badge>
            ) : null}
            {isRecurring ? (
              <Badge variant="secondary" className="gap-1">
                <RefreshCw className="h-3 w-3" />
                Recurring
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            <time dateTime={date}>{dateLabel}</time>
            {endDate
              ? ` – ${formatInTimeZone(endDate, timeZone, { month: 'short', day: 'numeric' })}`
              : null}
          </p>
          {description ? (
            <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{description}</p>
          ) : null}
          {location || isOnline ? (
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{isOnline ? 'Online event' : location}</span>
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );

  if (!href) {
    return <CardHover>{content}</CardHover>;
  }

  return (
    <CardHover>
      <Link href={href} className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {content}
      </Link>
    </CardHover>
  );
}
