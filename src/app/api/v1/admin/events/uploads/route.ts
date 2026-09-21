import { error, success, validationError } from '@/lib/api/response';
import { guardAdminWrite } from '@/lib/admin/guard';
import { saveContentImage } from '@/lib/content/uploads';

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'events', 'update');
  if (!auth.ok) return auth.error;
  const form = await request.formData().catch(() => null);
  if (!form) return validationError({ file: ['Upload a file'] });
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return validationError({ file: ['A file is required'] });
  }
  try {
    const url = await saveContentImage(file, 'events');
    return success({ url }, 'Image uploaded.');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed.';
    return error(message, 422);
  }
}
