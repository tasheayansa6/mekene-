export const DEFAULT_EVENT_TIMEZONE = 'Africa/Addis_Ababa';

export function isValidTimeZone(value?: string | null): boolean {
  if (!value || !/^[A-Za-z_]+\/[A-Za-z0-9_+\-]+$/.test(value)) return false;
  try {
    Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second)
  );
  return asUtc - date.getTime();
}

/** Parse a naive `YYYY-MM-DDTHH:mm` wall time in `timeZone` into a UTC Date. */
export function fromZonedLocalInput(value: string, timeZone: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value.trim());
  if (!match) return null;
  if (!isValidTimeZone(timeZone)) return null;
  const utcGuess = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    0
  );
  const first = new Date(utcGuess - timeZoneOffsetMs(new Date(utcGuess), timeZone));
  const corrected = new Date(utcGuess - timeZoneOffsetMs(first, timeZone));
  return Number.isNaN(corrected.getTime()) ? null : corrected;
}

export function toZonedLocalInput(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }
  return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}`;
}

export function formatInTimeZone(
  date: Date | string,
  timeZone: string,
  options: Intl.DateTimeFormatOptions
) {
  const value = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', { timeZone, ...options }).format(value);
}

export function zonedDateKey(date: Date | string, timeZone: string) {
  const value = typeof date === 'string' ? new Date(date) : date;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }
  return `${map.year}-${map.month}-${map.day}`;
}

/** Parse datetime-local (`YYYY-MM-DDTHH:mm`) in a zone, or an ISO instant. */
export function parseEventDateTime(value: string | null | undefined, timeZone: string): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
    return fromZonedLocalInput(trimmed, timeZone);
  }
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}
