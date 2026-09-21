import { db } from '@/lib/db';
import { error, forbidden, notFound, success } from '@/lib/api/response';
import { guardAdminWrite } from '@/lib/admin/guard';
import { canArchiveMembers } from '@/lib/members/access';
import { canTransitionApplication } from '@/lib/members/status';
import { applicationAdminInclude, serializeApplicationAdmin } from '@/lib/members/serialize';
import { recordStatusHistory } from '@/lib/members/write';
import { emitMembershipEvent } from '@/lib/members/events';
import { readJson } from '@/lib/auth/http';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminWrite(request, 'members', 'archive');
  if (!auth.ok) return auth.error;
  if (!canArchiveMembers(auth.user)) return forbidden();

  await readJson(request);

  const { id } = await context.params;
  const existing = await db.membershipApplication.findUnique({ where: { id } });
  if (!existing) return notFound('Application');
  if (!canTransitionApplication(existing.status, 'archived')) {
    return error('This application cannot be archived from its current status.', 409);
  }

  const updated = await db.membershipApplication.update({
    where: { id },
    data: { status: 'archived' },
    include: applicationAdminInclude,
  });

  await recordStatusHistory({
    applicationId: id,
    oldStatus: existing.status,
    newStatus: 'archived',
    changedById: auth.user.id,
  });

  await emitMembershipEvent({
    type: 'membership.application_archived',
    userId: auth.user.id,
    entityId: id,
    request,
    details: { applicationId: id },
  });

  return success({ application: serializeApplicationAdmin(updated) }, 'Application archived.');
}
