import Link from 'next/link';
import { monthGrid, monthLabel, shiftMonth, WEEKDAY_SHORT } from '@/lib/events/calendar';
import { zonedDateKey } from '@/lib/events/timezone';

export interface CalendarOccurrence {
  id: string;
  slug: string;
  title: string;
  status: string;
  timezone: string;
  href: string;
  startAt: string;
  endAt: string;
  isOnline: boolean;
  locationName: string | null;
}

export function EventCalendar({
  year,
  month,
  timezone,
  occurrences,
  query,
  basePath = '/events',
}: {
  year: number;
  month: number;
  timezone: string;
  occurrences: CalendarOccurrence[];
  query: Record<string, string | undefined>;
  basePath?: string;
}) {
  const weeks = monthGrid(year, month);
  const today = zonedDateKey(new Date(), timezone);
  const byDay = new Map<string, CalendarOccurrence[]>();
  for (const item of occurrences) {
    const key = zonedDateKey(item.startAt, item.timezone || timezone);
    const list = byDay.get(key) || [];
    list.push(item);
    byDay.set(key, list);
  }
  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);

  function hrefFor(y: number, m: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value) params.set(key, value);
    }
    params.set('view', 'month');
    params.set('year', String(y));
    params.set('month', String(m));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  return (
    <div className="overflow-x-auto">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-primary">{monthLabel(year, month)}</h2>
        <div className="flex gap-2">
          <Link
            className="inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-3 text-sm"
            href={hrefFor(prev.year, prev.month)}
          >
            Previous month
          </Link>
          <Link
            className="inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-3 text-sm"
            href={hrefFor(next.year, next.month)}
          >
            Next month
          </Link>
        </div>
      </div>
      <div role="grid" aria-label={`Calendar for ${monthLabel(year, month)}`} className="min-w-[640px]">
        <div role="row" className="grid grid-cols-7 border-b text-center text-xs font-medium uppercase text-muted-foreground">
          {WEEKDAY_SHORT.map((label) => (
            <div role="columnheader" key={label} className="px-2 py-2">
              {label}
            </div>
          ))}
        </div>
        {weeks.map((week) => (
          <div role="row" key={week[0].date} className="grid grid-cols-7 border-b">
            {week.map((day) => {
              const items = byDay.get(day.date) || [];
              const isToday = day.date === today;
              return (
                <div
                  role="gridcell"
                  key={day.date}
                  aria-selected={isToday}
                  className={`min-h-[7.5rem] border-r p-2 last:border-r-0 ${
                    day.inMonth ? 'bg-background' : 'bg-muted/30 text-muted-foreground'
                  } ${isToday ? 'ring-2 ring-inset ring-primary' : ''}`}
                >
                  <div className="mb-1 text-sm font-medium">
                    <time dateTime={day.date}>{Number(day.date.slice(-2))}</time>
                    {isToday ? <span className="sr-only"> Today</span> : null}
                  </div>
                  <ul className="space-y-1">
                    {items.map((item) => (
                      <li key={`${item.id}-${item.startAt}`}>
                        <Link
                          href={item.href}
                          className={`block rounded px-1 py-0.5 text-xs leading-snug hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            item.status === 'cancelled' ? 'line-through' : 'text-primary'
                          }`}
                        >
                          {item.status === 'cancelled' ? (
                            <span className="mr-1 font-semibold uppercase">Cancelled</span>
                          ) : null}
                          {item.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
