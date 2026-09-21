function compactUtc(date: Date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function escapeIcs(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

export function buildIcs(input: {
  title: string;
  slug: string;
  description?: string | null;
  location?: string | null;
  startAt: Date;
  endAt: Date;
  url: string;
  rrule?: string | null;
}) {
  const stamp = compactUtc(new Date());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Busa Mekene Eyasus Church//Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${input.slug}@busamekeneeyasus.org`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${compactUtc(input.startAt)}`,
    `DTEND:${compactUtc(input.endAt)}`,
    `SUMMARY:${escapeIcs(input.title)}`,
    `URL:${input.url}`,
  ];
  if (input.description) lines.push(`DESCRIPTION:${escapeIcs(input.description)}`);
  if (input.location) lines.push(`LOCATION:${escapeIcs(input.location)}`);
  if (input.rrule) lines.push(`RRULE:${input.rrule}`);
  lines.push('END:VEVENT', 'END:VCALENDAR', '');
  return lines.join('\r\n');
}

export function googleCalendarUrl(input: {
  title: string;
  description?: string | null;
  location?: string | null;
  startAt: Date;
  endAt: Date;
}) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: input.title,
    dates: `${compactUtc(input.startAt)}/${compactUtc(input.endAt)}`,
  });
  if (input.description) params.set('details', input.description);
  if (input.location) params.set('location', input.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function eventJsonLd(input: {
  title: string;
  description?: string | null;
  url: string;
  startAt: string;
  endAt: string;
  image?: string | null;
  locationName?: string | null;
  locationAddress?: string | null;
  isOnline?: boolean;
  cancelled?: boolean;
  organizerName?: string | null;
}) {
  const location = input.isOnline
    ? { '@type': 'VirtualLocation', url: input.url }
    : input.locationName
      ? {
          '@type': 'Place',
          name: input.locationName,
          address: input.locationAddress || undefined,
        }
      : undefined;
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: input.title,
    description: input.description || undefined,
    url: input.url,
    startDate: input.startAt,
    endDate: input.endAt,
    image: input.image || undefined,
    eventStatus: input.cancelled
      ? 'https://schema.org/EventCancelled'
      : 'https://schema.org/EventScheduled',
    location,
    organizer: input.organizerName ? { '@type': 'Organization', name: input.organizerName } : undefined,
  };
}
