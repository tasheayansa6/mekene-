import { success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { listTranslations, upsertTranslation } from '@/lib/cms/translations';
import { formatZodErrors, translationWriteSchema } from '@/lib/cms/validation';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'content', 'view');
  if (!auth.ok) return auth.error;

  const url = new URL(request.url);
  const entityType = url.searchParams.get('entityType');
  const entityId = url.searchParams.get('entityId');
  if (!entityType || !entityId) {
    return validationError({
      entityType: entityType ? [] : ['entityType is required'],
      entityId: entityId ? [] : ['entityId is required'],
    });
  }

  const rows = await listTranslations(entityType, entityId);
  return success(rows);
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'content', 'update');
  if (!auth.ok) return auth.error;

  const parsed = translationWriteSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  try {
    const row = await upsertTranslation({
      ...parsed.data,
      translatorId: auth.user.id,
    });
    return success(row, 'Translation saved.', 201);
  } catch (err) {
    if (err instanceof Error && err.message === 'unsupported-language') {
      return validationError({ language: ['Unsupported language. Use en, om, or am.'] });
    }
    throw err;
  }
}
