import { error, success, validationError } from '@/lib/api/response';
import { guardAdminWrite } from '@/lib/admin/guard';
import { saveContentImage, saveSermonAudio, saveSermonNotes } from '@/lib/content/uploads';
import { logContentChange } from '@/lib/content/admin-write';

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'sermons', 'update');
  if (!auth.ok) return auth.error;
  const form = await request.formData().catch(() => null);
  if (!form) return validationError({ file: ['Upload a file'] });
  const file = form.get('file');
  const kind = String(form.get('kind') || 'image');
  if (!(file instanceof File) || file.size === 0) {
    return validationError({ file: ['A file is required'] });
  }
  try {
    if (kind === 'audio') {
      const saved = await saveSermonAudio(file);
      await logContentChange({
        type: 'sermon.audio_uploaded',
        entity: 'sermon',
        entityId: 'upload',
        userId: auth.user.id,
        request,
        details: { fileName: saved.fileName },
      });
      return success(saved, 'Audio uploaded.');
    }
    if (kind === 'notes') {
      const saved = await saveSermonNotes(file);
      await logContentChange({
        type: 'sermon.notes_uploaded',
        entity: 'sermon',
        entityId: 'upload',
        userId: auth.user.id,
        request,
        details: { fileName: saved.fileName },
      });
      return success(saved, 'Notes uploaded.');
    }
    const url = await saveContentImage(file, 'sermons');
    return success({ url }, 'Image uploaded.');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed.';
    return error(message, 422);
  }
}
