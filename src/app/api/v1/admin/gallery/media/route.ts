import { db } from '@/lib/db';
import { paginated, validationError } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import { mediaInclude, serializeMedia } from '@/lib/gallery/serialize';
import { adminMediaListSchema, formatZodErrors } from '@/lib/gallery/validation';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'gallery', 'view');
  if (!auth.ok) return auth.error;
  const url = new URL(request.url);
  const parsed = adminMediaListSchema.safeParse({
    q: url.searchParams.get('q') || undefined,
    page: url.searchParams.get('page') || 1,
    pageSize: url.searchParams.get('pageSize') || 20,
    status: url.searchParams.get('status') || undefined,
    type: url.searchParams.get('type') || undefined,
    album: url.searchParams.get('album') || undefined,
    featured: url.searchParams.get('featured') || undefined,
    sort: url.searchParams.get('sort') || undefined,
    dir: url.searchParams.get('dir') || undefined,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const { q, page, pageSize, status, type, album, featured, sort, dir } = parsed.data;
  const and: object[] = [];
  if (q) {
    and.push({
      OR: [
        { title: { contains: q } },
        { caption: { contains: q } },
        { altText: { contains: q } },
        { album: { title: { contains: q } } },
      ],
    });
  }
  if (status) and.push({ status });
  if (type) and.push({ mediaType: type });
  if (album) and.push({ albumId: album });
  if (featured === 'true') and.push({ isFeatured: true });
  const where = and.length ? { AND: and } : {};
  const orderField = ['title', 'status', 'updatedAt', 'sortOrder'].includes(sort || '') ? sort! : 'updatedAt';
  const [totalItems, rows] = await Promise.all([
    db.galleryMediaItem.count({ where }),
    db.galleryMediaItem.findMany({
      where,
      include: mediaInclude,
      orderBy: { [orderField]: dir === 'asc' ? 'asc' : 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return paginated(
    rows.map((row) => serializeMedia(row)),
    { page, pageSize, totalItems }
  );
}
