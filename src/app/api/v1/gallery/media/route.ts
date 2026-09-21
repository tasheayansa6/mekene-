import { paginated, validationError } from '@/lib/api/response';
import { formatZodErrors, publicMediaListSchema } from '@/lib/gallery/validation';
import { getPublicMediaList } from '@/lib/gallery/public';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = publicMediaListSchema.safeParse({
    q: url.searchParams.get('q') || url.searchParams.get('search') || undefined,
    search: url.searchParams.get('search') || undefined,
    page: url.searchParams.get('page') || 1,
    pageSize: url.searchParams.get('pageSize') || 24,
    album: url.searchParams.get('album') || undefined,
    type: url.searchParams.get('type') || undefined,
    ministry: url.searchParams.get('ministry') || undefined,
    event: url.searchParams.get('event') || undefined,
    featured: url.searchParams.get('featured') || undefined,
    sort: url.searchParams.get('sort') || undefined,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const data = parsed.data;
  const result = await getPublicMediaList({
    q: data.q || data.search,
    album: data.album,
    type: data.type,
    ministry: data.ministry,
    event: data.event,
    featured: data.featured === 'true',
    sort: data.sort || 'newest',
    page: data.page,
    pageSize: Math.min(data.pageSize, 48),
  });
  return paginated(result.media, {
    page: result.page,
    pageSize: result.pageSize,
    totalItems: result.totalItems,
  });
}
