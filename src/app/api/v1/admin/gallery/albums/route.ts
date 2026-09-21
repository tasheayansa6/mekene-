import { db } from '@/lib/db';
import { error, paginated, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import {
  enforceFeaturedLimit,
  logContentChange,
  revalidatePublicContent,
  uniqueContentSlug,
} from '@/lib/content/admin-write';
import { RESERVED_ALBUM_SLUGS } from '@/lib/gallery/access';
import { albumInclude, serializeAlbum } from '@/lib/gallery/serialize';
import { adminAlbumListSchema, albumWriteSchema, formatZodErrors } from '@/lib/gallery/validation';
import { prepareAlbumFields } from '@/lib/gallery/write';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'gallery', 'view');
  if (!auth.ok) return auth.error;
  const url = new URL(request.url);
  const parsed = adminAlbumListSchema.safeParse({
    q: url.searchParams.get('q') || undefined,
    page: url.searchParams.get('page') || 1,
    pageSize: url.searchParams.get('pageSize') || 20,
    status: url.searchParams.get('status') || undefined,
    category: url.searchParams.get('category') || undefined,
    ministry: url.searchParams.get('ministry') || undefined,
    event: url.searchParams.get('event') || undefined,
    featured: url.searchParams.get('featured') || undefined,
    sort: url.searchParams.get('sort') || undefined,
    dir: url.searchParams.get('dir') || undefined,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const { q, page, pageSize, status, category, ministry, event, featured, sort, dir } = parsed.data;
  const and: object[] = [];
  if (q) {
    and.push({
      OR: [
        { title: { contains: q } },
        { description: { contains: q } },
        { category: { name: { contains: q } } },
        { event: { title: { contains: q } } },
        { ministry: { name: { contains: q } } },
      ],
    });
  }
  if (status) and.push({ status });
  if (category) and.push({ categoryId: category });
  if (ministry) and.push({ ministryId: ministry });
  if (event) and.push({ eventId: event });
  if (featured === 'true') and.push({ isFeatured: true });
  const where = and.length ? { AND: and } : {};
  const orderField = ['title', 'status', 'updatedAt', 'albumDate'].includes(sort || '')
    ? sort!
    : 'updatedAt';
  const [totalItems, rows] = await Promise.all([
    db.galleryAlbum.count({ where }),
    db.galleryAlbum.findMany({
      where,
      include: albumInclude,
      orderBy: { [orderField]: dir === 'asc' ? 'asc' : 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return paginated(
    rows.map((row) => serializeAlbum(row)),
    { page, pageSize, totalItems }
  );
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'gallery', 'create');
  if (!auth.ok) return auth.error;
  const parsed = albumWriteSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const data = parsed.data;
  if (data.slug && RESERVED_ALBUM_SLUGS.has(data.slug)) {
    return error('That slug is reserved.', 409);
  }
  const prepared = prepareAlbumFields(data, auth.user);
  if (!prepared.ok) return validationError(prepared.errors);
  const slug = await uniqueContentSlug('galleryAlbum', data.title, data.slug);
  const row = await db.galleryAlbum.create({
    data: {
      ...prepared.fields,
      slug,
      authorId: auth.user.id,
      status: prepared.resolved.status,
      publishedAt: prepared.resolved.publishedAt,
    },
    include: albumInclude,
  });
  if (row.isFeatured) await enforceFeaturedLimit('galleryAlbum', row.id);
  await logContentChange({
    type: prepared.resolved.status === 'published' ? 'gallery.album_published' : 'gallery.album_created',
    entity: 'gallery_album',
    entityId: row.id,
    userId: auth.user.id,
    request,
    details: { slug: row.slug, status: row.status },
  });
  revalidatePublicContent([`/gallery/${row.slug}`]);
  return success(serializeAlbum(row), 'Album saved. Uploaded media stays draft until published.', 201);
}
