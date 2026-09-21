import { db } from '@/lib/db';
import { error, forbidden, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminWrite } from '@/lib/admin/guard';
import { logContentChange, revalidatePublicContent } from '@/lib/content/admin-write';
import { canArchiveGallery, canDeleteGallery, canPublishGallery } from '@/lib/gallery/access';
import { formatZodErrors, galleryBulkSchema } from '@/lib/gallery/validation';

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'gallery', 'update');
  if (!auth.ok) return auth.error;
  const parsed = galleryBulkSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const { action, ids } = parsed.data;
  if (action === 'publish' && !canPublishGallery(auth.user)) {
    return forbidden('You do not have permission to publish gallery content.');
  }
  if (action === 'archive' && !canArchiveGallery(auth.user)) return forbidden();
  if (action === 'delete' && !canDeleteGallery(auth.user)) {
    return forbidden('Permanent deletion requires gallery delete permission.');
  }
  const where = { id: { in: ids } };
  const now = new Date();
  if (action === 'publish') {
    await db.galleryAlbum.updateMany({
      where,
      data: { status: 'published', publishedAt: now, publishAt: now },
    });
  } else if (action === 'unpublish') {
    await db.galleryAlbum.updateMany({
      where,
      data: { status: 'draft', publishedAt: null, isFeatured: false },
    });
  } else if (action === 'archive') {
    await db.galleryAlbum.updateMany({
      where,
      data: { status: 'archived', isFeatured: false, publishedAt: null },
    });
  } else if (action === 'feature') {
    await db.galleryAlbum.updateMany({ where, data: { isFeatured: true } });
  } else if (action === 'unfeature') {
    await db.galleryAlbum.updateMany({ where, data: { isFeatured: false } });
  } else if (action === 'delete') {
    await db.galleryAlbum.deleteMany({ where: { ...where, status: 'archived' } });
  }
  await logContentChange({
    type:
      action === 'publish'
        ? 'gallery.album_published'
        : action === 'archive'
          ? 'gallery.album_archived'
          : 'gallery.album_updated',
    entity: 'gallery_album',
    userId: auth.user.id,
    request,
    details: { action, count: ids.length },
    entityId: ids[0],
  });
  revalidatePublicContent();
  return success({ ids, action }, 'Albums updated.');
}
