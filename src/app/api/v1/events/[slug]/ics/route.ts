import { NextResponse } from 'next/server';
import { error, notFound } from '@/lib/api/response';
import { getPublicEventBySlug } from '@/lib/events/public';
import { buildIcs, googleCalendarUrl } from '@/lib/events/ics';
import { toRRule } from '@/lib/events/recurrence';
import { RESERVED_EVENT_SLUGS } from '@/lib/events/access';

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  if (RESERVED_EVENT_SLUGS.has(slug)) return notFound('Event');
  try {
    const result = await getPublicEventBySlug(slug);
    if (!result) return notFound('Event');
    const event = result.event;
    const url = new URL(request.url);
    const pageUrl = `${url.origin}/events/${event.slug}`;
    const locationParts = [event.location?.name, event.location?.address].filter(Boolean);
    const location = event.isOnline ? 'Online event' : locationParts.join(', ') || null;
    const ics = buildIcs({
      title: event.title,
      slug: event.slug,
      description: event.shortDescription || event.description,
      location,
      startAt: new Date(event.startAt),
      endAt: new Date(event.endAt),
      url: pageUrl,
      rrule: toRRule({
        startAt: new Date(event.startAt),
        endAt: new Date(event.endAt),
        recurrence: event.recurrence as 'none',
        recurrenceInterval: event.recurrenceInterval,
        recurrenceUntil: event.recurrenceUntil ? new Date(event.recurrenceUntil) : null,
      }),
    });
    if (url.searchParams.get('format') === 'google') {
      return NextResponse.redirect(
        googleCalendarUrl({
          title: event.title,
          description: event.shortDescription || event.description,
          location,
          startAt: new Date(event.startAt),
          endAt: new Date(event.endAt),
        })
      );
    }
    return new NextResponse(ics, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${event.slug}.ics"`,
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch {
    return error('Unable to generate calendar file.', 500);
  }
}
