import { db } from '@/lib/db';
import { error, notFound, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import {
  enforceFeaturedLimit,
  logContentChange,
  revalidatePublicContent,
  uniqueContentSlug,
} from '@/lib/content/admin-write';
import { canArchiveGallery, canDeleteGallery, RESERVED_ALBUM_SLUGS } from '@/lib/gallery/access';
import { albumInclude, mediaInclude, serializeAlbum } from '@/lib/gallery/serialize';
import { albumWriteSchema, formatZodErrors } from '@/lib/gallery/validation';
import { prepareAlbumFields } from '@/lib/gallery/write';

type RouteContext = { params: Promise<{ id: string }> };

async function loadAlbum(id: string) {
  return db.galleryAlbum.findUnique({
    where: { id },
    include: {
      ...albumInclude,
      items: {
        include: mediaInclude,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      },
    },
  });
}

export async function GET(request: Request, context: RouteContext) {
  const auth = await guardAdminRead(request, 'gallery', 'view');
  if (!auth.ok) return auth.error;
  const { id } = await context.params;
  const row = await loadAlbum(id);
  if (!row) return notFound('Album');
  return success(serializeAlbum(row, { includeItems: true }));
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'gallery', 'update');
  if (!auth.ok) return auth.error;
  const { id } = await context.params;
  const existing = await loadAlbum(id);
  if (!existing) return notFound('Album');
  const parsed = albumWriteSchema.partial().safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const data = parsed.data;
  if (data.slug && RESERVED_ALBUM_SLUGS.has(data.slug)) {
    return error('That slug is reserved.', 409);
  }
  const prepared = prepareAlbumFields(
    {
      title: data.title ?? existing.title,
      description: data.description === undefined ? existing.description : data.description,
      categoryId: data.categoryId === undefined ? existing.categoryId : data.categoryId,
      eventId: data.eventId === undefined ? existing.eventId : data.eventId,
      ministryId: data.ministryId === undefined ? existing.ministryId : data.ministryId,
      albumDate: data.albumDate === undefined ? existing.albumDate?.toISOString() : data.albumDate,
      coverImageUrl: data.coverImageUrl === undefined ? existing.coverImageUrl : data.coverImageUrl,
      coverImageAlt: data.coverImageAlt === undefined ? existing.coverImageAlt : data.coverImageAlt,
      status: data.status ?? (existing.status as 'draft' | 'review' | 'published' | 'archived'),
      isFeatured: data.isFeatured ?? existing.isFeatured,
      seoTitle: data.seoTitle === undefined ? existing.seoTitle : data.seoTitle,
      seoDescription: data.seoDescription === undefined ? existing.seoDescription : data.seoDescription,
      publishAt: data.publishAt === undefined ? existing.publishAt?.toISOString() : data.publishAt,
    },
    auth.user
  );
  if (!prepared.ok) return validationError(prepared.errors);
  const slug =
    data.title || data.slug
      ? await uniqueContentSlug('galleryAlbum', data.title ?? existing.title, data.slug, existing.id)
      : existing.slug;
  const previous = existing.status;
  const updated = await db.galleryAlbum.update({
    where: { id },
    data: {
      ...prepared.fields,
      slug,
      status: prepared.resolved.status,
      publishedAt: prepared.resolved.publishedAt,
    },
    include: {
      ...albumInclude,
      items: {
        include: mediaInclude,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      },
    },
  });
  if (updated.isFeatured) await enforceFeaturedLimit('galleryAlbum', updated.id);
  const type =
    prepared.resolved.status === 'published' && previous !== 'published'
      ? 'gallery.album_published'
      : prepared.resolved.status === 'archived'
        ? 'gallery.album_archived'
        : 'gallery.album_updated';
  await logContentChange({
    type,
    entity: 'gallery_album',
    entityId: updated.id,
    userId: auth.user.id,
    request,
    details: { slug: updated.slug, status: updated.status },
  });
  revalidatePublicContent([`/gallery/${updated.slug}`, `/gallery/${existing.slug}`]);
  return success(serializeAlbum(updated, { includeItems: true }), 'Album updated.');
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'gallery', 'update');
  if (!auth.ok) return auth.error;
  const { id } = await context.params;
  const existing = await db.galleryAlbum.findUnique({ where: { id } });
  if (!existing) return notFound('Album');
  if (existing.status !== 'archived') {
    if (!canArchiveGallery(auth.user)) {
      return error('Archive the album before deleting it, or request archive permission.', 403);
    }
    await db.galleryAlbum.update({
      where: { id },
      data: { status: 'archived', isFeatured: false, publishedAt: null },
    });
    await logContentChange({
      type: 'gallery.album_archived',
      entity: 'gallery_album',
      entityId: id,
      userId: auth.user.id,
      request,
      details: { slug: existing.slug },
    });
    revalidatePublicContent([`/gallery/${existing.slug}`]);
    return success({ id, archived: true }, 'Album archived.');
  }
  if (!canDeleteGallery(auth.user)) {
    return error('Permanent deletion requires gallery delete permission.', 403);
  }
  await db.galleryAlbum.delete({ where: { id } });
  await logContentChange({
    type: 'gallery.media_removed',
    entity: 'gallery_album',
    entityId: id,
    userId: auth.user.id,
    request,
    details: { slug: existing.slug, permanent: true },
  });
  revalidatePublicContent([`/gallery/${existing.slug}`]);
  return success({ id, deleted: true }, 'Album permanently deleted.');
}
