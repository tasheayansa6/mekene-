import { db } from '@/lib/db';
import { forbidden, notFound, success } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import { canImportMembers } from '@/lib/members/access';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = await guardAdminRead(request, 'members', 'import');
  if (!auth.ok) return auth.error;
  if (!canImportMembers(auth.user)) return forbidden();
  const { id } = await context.params;
  const job = await db.memberImportJob.findUnique({ where: { id } });
  if (!job) return notFound('Import job');
  return success({
    ...job,
    preview: job.previewJson ? JSON.parse(job.previewJson) : [],
    errors: job.errorReport ? JSON.parse(job.errorReport) : [],
    previewJson: undefined,
    errorReport: undefined,
  });
}
