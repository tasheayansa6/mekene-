import { error, success, validationError } from '@/lib/api/response';
import { guardAdminWrite } from '@/lib/admin/guard';
import { saveGalleryPhoto } from '@/lib/content/uploads';
import { canUploadGallery } from '@/lib/gallery/access';
import { MAX_GALLERY_UPLOADS } from '@/lib/gallery/status';

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'gallery', 'update');
  if (!auth.ok) return auth.error;
  if (!canUploadGallery(auth.user)) return error('You cannot upload gallery media.', 403);

  const form = await request.formData().catch(() => null);
  if (!form) return validationError({ file: ['Upload a file'] });
  const files = form.getAll('file').filter((item): item is File => item instanceof File && item.size > 0);
  const single = form.get('file');
  const list = files.length ? files : single instanceof File && single.size > 0 ? [single] : [];
  if (!list.length) return validationError({ file: ['A file is required'] });
  if (list.length > MAX_GALLERY_UPLOADS) {
    return error(`Upload at most ${MAX_GALLERY_UPLOADS} photos at a time.`, 422);
  }

  const saved = [];
  const failed: Array<{ name: string; message: string }> = [];
  for (const file of list) {
    try {
      saved.push({ name: file.name, ...(await saveGalleryPhoto(file)) });
    } catch (err) {
      failed.push({
        name: file.name,
        message: err instanceof Error ? err.message : 'Upload failed.',
      });
    }
  }
  if (!saved.length) {
    return error(failed[0]?.message || 'Upload failed.', 422);
  }
  return success({ saved, failed }, failed.length ? 'Some files could not be uploaded.' : 'Image uploaded.');
}
