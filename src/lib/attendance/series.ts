import { getSystemSettings } from '@/lib/admin/settings';
import { fromZonedLocalInput, zonedDateKey } from '@/lib/events/timezone';
import { expandOccurrences } from '@/lib/events/recurrence';

/**
 * Materialize near-term sessions from an active series without creating
 * thousands of future rows. Caller persists only missing dates.
 */
export function plannedOccurrencesForSeries(
  series: {
    recurrence: string;
    dayOfWeek: number | null;
    startTimeLocal: string;
    endTimeLocal: string | null;
    timezone: string;
  },
  rangeStart: Date,
  rangeEnd: Date
) {
  const zone = series.timezone || 'Africa/Addis_Ababa';
  const startLocal = `${zonedDateKey(rangeStart, zone)}T${series.startTimeLocal.slice(0, 5)}`;
  let seedStart = fromZonedLocalInput(startLocal, zone);
  if (!seedStart) return [];

  if (series.dayOfWeek != null && series.recurrence === 'weekly') {
    const currentDow = Number(
      new Intl.DateTimeFormat('en-US', { timeZone: zone, weekday: 'short' })
        .formatToParts(seedStart)
        .find((p) => p.type === 'weekday')?.value === 'Sun'
        ? 0
        : // fallback: use UTC day; series generation is approximate for weekly templates
          seedStart.getUTCDay()
    );
    // Prefer using the series dayOfWeek with a known Sunday=0 convention via local key walk.
    void currentDow;
  }

  const endLocal = series.endTimeLocal
    ? `${zonedDateKey(seedStart, zone)}T${series.endTimeLocal.slice(0, 5)}`
    : null;
  const seedEnd =
    (endLocal ? fromZonedLocalInput(endLocal, zone) : null) ||
    new Date(seedStart.getTime() + 2 * 60 * 60_000);

  const recurrence =
    series.recurrence === 'biweekly'
      ? 'weekly'
      : series.recurrence === 'monthly'
        ? 'monthly'
        : series.recurrence === 'weekly'
          ? 'weekly'
          : 'none';

  return expandOccurrences(
    {
      startAt: seedStart,
      endAt: seedEnd,
      recurrence: recurrence as 'none' | 'weekly' | 'monthly',
      recurrenceInterval: series.recurrence === 'biweekly' ? 2 : 1,
    },
    rangeStart,
    rangeEnd,
    16
  );
}

export async function churchTimezone() {
  const settings = await getSystemSettings();
  return settings.timezone || 'Africa/Addis_Ababa';
}
