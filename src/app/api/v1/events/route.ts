import { paginated, validationError } from '@/lib/api/response';
import { formatZodErrors, publicEventListSchema } from '@/lib/events/validation';
import { getPublicEventList } from '@/lib/events/public';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = publicEventListSchema.safeParse({
    q: url.searchParams.get('q') || url.searchParams.get('search') || undefined,
    search: url.searchParams.get('search') || undefined,
    page: url.searchParams.get('page') || 1,
    pageSize: url.searchParams.get('pageSize') || 12,
    category: url.searchParams.get('category') || undefined,
    ministry: url.searchParams.get('ministry') || undefined,
    location: url.searchParams.get('location') || undefined,
    online: url.searchParams.get('online') || undefined,
    upcoming: url.searchParams.get('upcoming') || undefined,
    when: url.searchParams.get('when') || undefined,
    featured: url.searchParams.get('featured') || undefined,
    from: url.searchParams.get('from') || undefined,
    to: url.searchParams.get('to') || undefined,
    sort: url.searchParams.get('sort') || undefined,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const data = parsed.data;
  const when =
    data.when ||
    (data.upcoming === 'true' ? 'upcoming' : data.upcoming === 'false' ? 'all' : 'upcoming');
  const result = await getPublicEventList({
    q: data.q || data.search,
    category: data.category,
    ministry: data.ministry,
    location: data.location,
    online: data.online === 'true' ? true : data.online === 'false' ? false : undefined,
    featured: data.featured === 'true',
    when,
    from: data.from,
    to: data.to,
    sort: data.sort || 'soonest',
    page: data.page,
    pageSize: data.pageSize,
  });
  return paginated(result.events, {
    page: result.page,
    pageSize: result.pageSize,
    totalItems: result.totalItems,
  });
}
