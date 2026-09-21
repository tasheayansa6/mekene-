import { notFound, success } from '@/lib/api/response';
import { guardAdminWrite } from '@/lib/admin/guard';
import { restoreRevision } from '@/lib/cms/revisions';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'content', 'update');
  if (!auth.ok) return auth.error;

  const { id } = await context.params;
  const payload = await restoreRevision(id, auth.user.id);
  if (!payload) return notFound('Revision');

  return success(payload, 'Revision snapshot ready to apply.');
}
