import { paginated, validationError } from '@/lib/api/response';
import { formatZodErrors, publicSermonListSchema } from '@/lib/sermons/validation';
import { getPublicSermonList } from '@/lib/sermons/public';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = publicSermonListSchema.safeParse({
    q: url.searchParams.get('q') || url.searchParams.get('search') || undefined,
    search: url.searchParams.get('search') || undefined,
    page: url.searchParams.get('page') || 1,
    pageSize: url.searchParams.get('pageSize') || 12,
    speaker: url.searchParams.get('speaker') || undefined,
    series: url.searchParams.get('series') || undefined,
    category: url.searchParams.get('category') || undefined,
    contentType: url.searchParams.get('contentType') || undefined,
    mediaType: url.searchParams.get('mediaType') || undefined,
    featured: url.searchParams.get('featured') || undefined,
    from: url.searchParams.get('from') || undefined,
    to: url.searchParams.get('to') || undefined,
    sort: url.searchParams.get('sort') || undefined,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const data = parsed.data;
  const result = await getPublicSermonList({
    q: data.q || data.search,
    speaker: data.speaker,
    series: data.series,
    category: data.category,
    contentType: data.contentType,
    mediaType: data.mediaType,
    featured: data.featured === 'true',
    from: data.from,
    to: data.to,
    sort: data.sort === 'oldest' ? 'oldest' : 'newest',
    page: data.page,
    pageSize: data.pageSize,
  });
  return paginated(result.sermons, {
    page: result.page,
    pageSize: result.pageSize,
    totalItems: result.totalItems,
  });
}
