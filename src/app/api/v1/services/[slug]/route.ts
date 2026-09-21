import { db } from '@/lib/db';
import { notFound, success } from '@/lib/api/response';
import { optionalAuth } from '@/lib/auth/authorize';
import { eventInclude, serializeEvent } from '@/lib/events/serialize';
import { isEventPubliclyVisible } from '@/lib/events/status';
import { getLiveBySlug } from '@/lib/live/public';

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const { user } = await optionalAuth(request);
  const now = new Date();

  const event = await db.event.findUnique({
    where: { slug },
    include: eventInclude,
  });

  if (!event || !isEventPubliclyVisible(event, now)) {
    return notFound('Service');
  }

  const liveSession = await db.liveSession.findFirst({
    where: { eventId: event.id },
    orderBy: { scheduledStartAt: 'desc' },
    select: { slug: true },
  });

  const live = liveSession ? await getLiveBySlug(liveSession.slug, user) : null;

  return success({
    event: serializeEvent(event, { isAuthenticated: Boolean(user) }),
    live,
  });
}
