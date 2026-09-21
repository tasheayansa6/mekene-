import { db } from '@/lib/db';
import { error, notFound, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminWrite } from '@/lib/admin/guard';
import { logContentChange, revalidatePublicContent, uniqueContentSlug } from '@/lib/content/admin-write';
import { canDeleteGallery } from '@/lib/gallery/access';
import { mediaInclude, serializeMedia } from '@/lib/gallery/serialize';
import { formatZodErrors, mediaWriteSchema } from '@/lib/gallery/validation';
import { prepareMediaFields } from '@/lib/gallery/write';

type RouteContext = { params: Promise<{ id: string; mediaId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'gallery', 'update');
  if (!auth.ok) return auth.error;
  const { id, mediaId } = await context.params;
  const existing = await db.galleryMediaItem.findFirst({
    where: { id: mediaId, albumId: id },
    include: { album: { select: { slug: true } } },
  });
  if (!existing) return notFound('Media');
  const parsed = mediaWriteSchema.partial().safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const data = parsed.data;
  const prepared = prepareMediaFields(
    {
      title: data.title ?? existing.title,
      description: data.description === undefined ? existing.description : data.description,
      mediaType: data.mediaType ?? (existing.mediaType as 'photo' | 'video'),
      fileUrl: data.fileUrl === undefined ? existing.fileUrl : data.fileUrl,
      thumbnailUrl: data.thumbnailUrl === undefined ? existing.thumbnailUrl : data.thumbnailUrl,
      externalUrl: data.externalUrl === undefined ? existing.externalUrl : data.externalUrl,
      caption: data.caption === undefined ? existing.caption : data.caption,
      altText: data.altText === undefined ? existing.altText : data.altText,
      photographer: data.photographer === undefined ? existing.photographer : data.photographer,
      takenAt: data.takenAt === undefined ? existing.takenAt?.toISOString() : data.takenAt,
      status: data.status ?? (existing.status as 'draft' | 'review' | 'published' | 'archived'),
      isFeatured: data.isFeatured ?? existing.isFeatured,
      sortOrder: data.sortOrder ?? existing.sortOrder,
      sermonId: data.sermonId === undefined ? existing.sermonId : data.sermonId,
      eventId: data.eventId === undefined ? existing.eventId : data.eventId,
      ministryId: data.ministryId === undefined ? existing.ministryId : data.ministryId,
    },
    auth.user
  );
  if (!prepared.ok) return validationError(prepared.errors);
  const slug =
    data.title || data.slug
      ? await uniqueContentSlug('galleryMediaItem', data.title ?? existing.title, data.slug, existing.id)
      : existing.slug;
  const previous = existing.status;
  const updated = await db.galleryMediaItem.update({
    where: { id: mediaId },
    data: {
      ...prepared.fields,
      slug,
      status: prepared.resolved.status,
    },
    include: mediaInclude,
  });
  await logContentChange({
    type:
      prepared.resolved.status === 'published' && previous !== 'published'
        ? 'gallery.media_published'
        : 'gallery.media_updated',
    entity: 'gallery_media',
    entityId: updated.id,
    userId: auth.user.id,
    request,
    details: { albumId: id, status: updated.status },
  });
  revalidatePublicContent([`/gallery/${existing.album.slug}`]);
  return success(serializeMedia(updated), 'Media updated.');
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'gallery', 'update');
  if (!auth.ok) return auth.error;
  const { id, mediaId } = await context.params;
  const existing = await db.galleryMediaItem.findFirst({
    where: { id: mediaId, albumId: id },
    include: { album: { select: { slug: true } } },
  });
  if (!existing) return notFound('Media');
  if (existing.status === 'published' && !canDeleteGallery(auth.user)) {
    await db.galleryMediaItem.update({
      where: { id: mediaId },
      data: { status: 'archived', isFeatured: false },
    });
    await logContentChange({
      type: 'gallery.media_removed',
      entity: 'gallery_media',
      entityId: mediaId,
      userId: auth.user.id,
      request,
      details: { albumId: id, archived: true },
    });
    revalidatePublicContent([`/gallery/${existing.album.slug}`]);
    return success({ id: mediaId, archived: true }, 'Published media was archived.');
  }
  await db.galleryMediaItem.delete({ where: { id: mediaId } });
  await logContentChange({
    type: 'gallery.media_removed',
    entity: 'gallery_media',
    entityId: mediaId,
    userId: auth.user.id,
    request,
    details: { albumId: id },
  });
  revalidatePublicContent([`/gallery/${existing.album.slug}`]);
  return success({ id: mediaId, deleted: true }, 'Media removed.');
}
