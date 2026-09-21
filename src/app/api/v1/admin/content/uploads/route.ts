import { error, success, validationError } from '@/lib/api/response';
import { guardAdminWrite } from '@/lib/admin/guard';
import { saveContentImage, saveResourceFile } from '@/lib/content/uploads';

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'content', 'create');
  if (!auth.ok) return auth.error;

  const form = await request.formData().catch(() => null);
  if (!form) return validationError({ file: ['Upload a file'] });
  const file = form.get('file');
  const kind = String(form.get('kind') || 'image');
  if (!(file instanceof File) || file.size === 0) {
    return validationError({ file: ['A file is required'] });
  }

  try {
    if (kind === 'resource') {
      const saved = await saveResourceFile(file);
      return success(saved, 'File uploaded.');
    }
    const folder = kind === 'thumbnail' ? 'resources' : 'content';
    const url = await saveContentImage(file, folder);
    return success({ url }, 'Image uploaded.');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed.';
    return error(message, 422);
  }
}
