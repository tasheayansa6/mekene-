import { db } from '@/lib/db';
import { error, notFound, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { logContentChange, revalidatePublicContent, uniqueContentSlug } from '@/lib/content/admin-write';
import { canUploadGallery } from '@/lib/gallery/access';
import { mediaInclude, serializeMedia } from '@/lib/gallery/serialize';
import { formatZodErrors, mediaReorderSchema, mediaWriteSchema } from '@/lib/gallery/validation';
import { prepareMediaFields } from '@/lib/gallery/write';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = await guardAdminRead(request, 'gallery', 'view');
  if (!auth.ok) return auth.error;
  const { id } = await context.params;
  const album = await db.galleryAlbum.findUnique({ where: { id }, select: { id: true } });
  if (!album) return notFound('Album');
  const rows = await db.galleryMediaItem.findMany({
    where: { albumId: id },
    include: mediaInclude,
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  return success(rows.map((row) => serializeMedia(row)));
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'gallery', 'update');
  if (!auth.ok) return auth.error;
  if (!canUploadGallery(auth.user)) return error('You cannot upload gallery media.', 403);
  const { id } = await context.params;
  const album = await db.galleryAlbum.findUnique({ where: { id } });
  if (!album) return notFound('Album');
  const parsed = mediaWriteSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const prepared = prepareMediaFields(parsed.data, auth.user);
  if (!prepared.ok) return validationError(prepared.errors);
  const last = await db.galleryMediaItem.findFirst({
    where: { albumId: id },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });
  const slug = await uniqueContentSlug('galleryMediaItem', parsed.data.title, parsed.data.slug);
  const row = await db.galleryMediaItem.create({
    data: {
      ...prepared.fields,
      slug,
      albumId: id,
      eventId: prepared.fields.eventId || album.eventId,
      ministryId: prepared.fields.ministryId || album.ministryId,
      sortOrder: prepared.fields.sortOrder || (last ? last.sortOrder + 1 : 0),
      authorId: auth.user.id,
      status: prepared.resolved.status,
    },
    include: mediaInclude,
  });
  await logContentChange({
    type: prepared.resolved.status === 'published' ? 'gallery.media_published' : 'gallery.media_uploaded',
    entity: 'gallery_media',
    entityId: row.id,
    userId: auth.user.id,
    request,
    details: { albumId: id, mediaType: row.mediaType, status: row.status },
  });
  revalidatePublicContent([`/gallery/${album.slug}`]);
  return success(serializeMedia(row), 'Media added as a draft unless you published it.', 201);
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'gallery', 'update');
  if (!auth.ok) return auth.error;
  const { id } = await context.params;
  const album = await db.galleryAlbum.findUnique({ where: { id } });
  if (!album) return notFound('Album');
  const parsed = mediaReorderSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const owned = await db.galleryMediaItem.findMany({
    where: { albumId: id, id: { in: parsed.data.ids } },
    select: { id: true },
  });
  if (owned.length !== parsed.data.ids.length) {
    return error('Some media items do not belong to this album.', 422);
  }
  await db.$transaction(
    parsed.data.ids.map((mediaId, index) =>
      db.galleryMediaItem.update({ where: { id: mediaId }, data: { sortOrder: index } })
    )
  );
  await logContentChange({
    type: 'gallery.media_reordered',
    entity: 'gallery_album',
    entityId: id,
    userId: auth.user.id,
    request,
    details: { count: parsed.data.ids.length },
  });
  revalidatePublicContent([`/gallery/${album.slug}`]);
  return success({ ids: parsed.data.ids }, 'Media order saved.');
}
