import { db } from '@/lib/db';
import { forbidden, notFound, success } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import { canModerateApplications } from '@/lib/members/access';
import { applicationAdminInclude, serializeApplicationAdmin } from '@/lib/members/serialize';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminRead(request, 'members', 'view');
  if (!auth.ok) return auth.error;
  if (!canModerateApplications(auth.user)) return forbidden();

  const { id } = await context.params;
  const application = await db.membershipApplication.findUnique({
    where: { id },
    include: applicationAdminInclude,
  });
  if (!application) return notFound('Application');

  return success({ application: serializeApplicationAdmin(application) });
}
