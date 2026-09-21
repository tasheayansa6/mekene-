import { db } from '@/lib/db';
import { error, forbidden, notFound, success } from '@/lib/api/response';
import { guardAdminWrite } from '@/lib/admin/guard';
import { canImportMembers } from '@/lib/members/access';
import { confirmImportJob } from '@/lib/members/import';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'members', 'import');
  if (!auth.ok) return auth.error;
  if (!canImportMembers(auth.user)) return forbidden();
  const { id } = await context.params;
  const job = await db.memberImportJob.findUnique({ where: { id } });
  if (!job) return notFound('Import job');
  try {
    const updated = await confirmImportJob({
      jobId: id,
      createdById: auth.user.id,
      request,
    });
    return success(updated, 'Import completed.');
  } catch (err) {
    return error(err instanceof Error ? err.message : 'Import failed.', 409);
  }
}
