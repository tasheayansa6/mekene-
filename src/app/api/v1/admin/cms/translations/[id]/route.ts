import { notFound, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminWrite } from '@/lib/admin/guard';
import { getTranslation, publishTranslation, upsertTranslation } from '@/lib/cms/translations';
import { formatZodErrors, translationPatchSchema } from '@/lib/cms/validation';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'content', 'update');
  if (!auth.ok) return auth.error;

  const { id } = await context.params;
  const existing = await getTranslation(id);
  if (!existing) return notFound('Translation');

  const parsed = translationPatchSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  if (parsed.data.status === 'published') {
    const row = await publishTranslation(id);
    return success(row, 'Translation published.');
  }

  const row = await upsertTranslation({
    entityType: existing.entityType,
    entityId: existing.entityId,
    language: existing.language,
    ...parsed.data,
    translatorId: auth.user.id,
  });
  return success(row, 'Translation updated.');
}
