import { success, validationError } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import { listRevisions } from '@/lib/cms/revisions';
import { formatZodErrors, revisionListSchema } from '@/lib/cms/validation';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'content', 'view');
  if (!auth.ok) return auth.error;

  const url = new URL(request.url);
  const parsed = revisionListSchema.safeParse({
    entityType: url.searchParams.get('entityType') || '',
    entityId: url.searchParams.get('entityId') || '',
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const rows = await listRevisions(parsed.data.entityType, parsed.data.entityId);
  return success(
    rows.map((row) => ({
      id: row.id,
      entityType: row.entityType,
      entityId: row.entityId,
      version: row.version,
      title: row.title,
      slug: row.slug,
      createdAt: row.createdAt.toISOString(),
      createdBy: row.createdBy,
    }))
  );
}
