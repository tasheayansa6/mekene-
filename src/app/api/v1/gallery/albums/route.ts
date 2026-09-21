import { paginated, validationError } from '@/lib/api/response';
import { formatZodErrors, publicGalleryListSchema } from '@/lib/gallery/validation';
import { getPublicAlbumList } from '@/lib/gallery/public';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = publicGalleryListSchema.safeParse({
    q: url.searchParams.get('q') || url.searchParams.get('search') || undefined,
    search: url.searchParams.get('search') || undefined,
    page: url.searchParams.get('page') || 1,
    pageSize: url.searchParams.get('pageSize') || 12,
    category: url.searchParams.get('category') || undefined,
    ministry: url.searchParams.get('ministry') || undefined,
    event: url.searchParams.get('event') || undefined,
    type: url.searchParams.get('type') || undefined,
    featured: url.searchParams.get('featured') || undefined,
    from: url.searchParams.get('from') || undefined,
    to: url.searchParams.get('to') || undefined,
    sort: url.searchParams.get('sort') || undefined,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const data = parsed.data;
  const result = await getPublicAlbumList({
    q: data.q || data.search,
    category: data.category,
    ministry: data.ministry,
    event: data.event,
    type: data.type,
    featured: data.featured === 'true',
    from: data.from,
    to: data.to,
    sort: data.sort || 'newest',
    page: data.page,
    pageSize: data.pageSize,
  });
  return paginated(result.albums, {
    page: result.page,
    pageSize: result.pageSize,
    totalItems: result.totalItems,
  });
}
