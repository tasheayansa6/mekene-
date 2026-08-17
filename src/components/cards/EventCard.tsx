import { MapPin, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CardHover } from './CardHover';

interface EventCardProps {
  title: string;
  date: string;
  endDate?: string;
  location?: string;
  description?: string;
  isRecurring?: boolean;
}

function formatDateParts(dateStr: string) {
  const date = new Date(dateStr);
  return {
    day: date.getDate().toString(),
    month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
  };
}

export function EventCard({
  title,
  date,
  endDate,
  location,
  description,
  isRecurring,
}: EventCardProps) {
  const { day, month } = formatDateParts(date);
  const endDateParts = endDate ? formatDateParts(endDate) : null;

  return (
    <CardHover>
      <Card className="group gap-0 overflow-hidden py-0 transition-colors hover:border-primary/30 hover:shadow-md">
        <CardContent className="flex gap-4 p-4">
          {/* Date block */}
          <div className="flex min-w-[72px] flex-shrink-0 flex-col items-center justify-center rounded-lg bg-primary/5 p-3">
            <span className="text-3xl font-bold text-primary leading-none">
              {day}
            </span>
            <span className="mt-1 text-xs uppercase text-muted-foreground">
              {month}
            </span>
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold leading-snug">{title}</h3>
              {isRecurring && (
                <Badge variant="secondary" className="gap-1">
                  <RefreshCw className="h-3 w-3" />
                  Recurring
                </Badge>
              )}
            </div>

            {/* Date range */}
            <p className="mt-1 text-sm text-muted-foreground">
              {endDateParts
                ? `${month} ${day} – ${endDateParts.month} ${endDateParts.day}`
                : `${month} ${day}`}
            </p>

            {description && (
              <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                {description}
              </p>
            )}

            {location && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{location}</span>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </CardHover>
  );
}
