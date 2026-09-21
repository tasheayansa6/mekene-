import { db } from '@/lib/db';
import { error, forbidden, notFound, success, validationError } from '@/lib/api/response';
import { guardAdminWrite } from '@/lib/admin/guard';
import { canModerateApplications } from '@/lib/members/access';
import { canTransitionApplication } from '@/lib/members/status';
import { applicationAdminInclude, serializeApplicationAdmin } from '@/lib/members/serialize';
import { recordStatusHistory } from '@/lib/members/write';
import { emitMembershipEvent } from '@/lib/members/events';
import { reviewActionSchema } from '@/lib/members/validation';
import { formatZodErrors } from '@/lib/auth/validation';
import { readJson } from '@/lib/auth/http';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminWrite(request, 'members', 'moderate');
  if (!auth.ok) return auth.error;
  if (!canModerateApplications(auth.user)) return forbidden();

  const parsed = reviewActionSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { id } = await context.params;
  const existing = await db.membershipApplication.findUnique({ where: { id } });
  if (!existing) return notFound('Application');
  if (!canTransitionApplication(existing.status, 'rejected')) {
    return error('This application cannot be declined from its current status.', 409);
  }

  const updated = await db.membershipApplication.update({
    where: { id },
    data: {
      status: 'rejected',
      reviewedById: auth.user.id,
      reviewedAt: new Date(),
      reviewNotes: parsed.data.notes || existing.reviewNotes,
    },
    include: applicationAdminInclude,
  });

  await recordStatusHistory({
    applicationId: id,
    oldStatus: existing.status,
    newStatus: 'rejected',
    changedById: auth.user.id,
    reason: parsed.data.reason || parsed.data.notes || null,
  });

  await emitMembershipEvent({
    type: 'membership.application_rejected',
    userId: auth.user.id,
    entityId: id,
    request,
    details: { applicationId: id },
  });

  return success({ application: serializeApplicationAdmin(updated) }, 'Application declined.');
}
