import { notFound, success } from '@/lib/api/response';
import { RESERVED_EVENT_SLUGS } from '@/lib/events/access';
import { getPublicEventBySlug } from '@/lib/events/public';

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  if (RESERVED_EVENT_SLUGS.has(slug) || slug === 'categories' || slug === 'locations' || slug === 'calendar') {
    return notFound('Event');
  }
  const result = await getPublicEventBySlug(slug);
  if (!result) return notFound('Event');
  return success(result);
}
