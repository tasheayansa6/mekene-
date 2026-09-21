import { db } from '@/lib/db';
import { error, forbidden, notFound, success } from '@/lib/api/response';
import { guardAdminWrite } from '@/lib/admin/guard';
import { canApproveMembership } from '@/lib/members/access';
import { canTransitionApplication } from '@/lib/members/status';
import { applicationAdminInclude, serializeApplicationAdmin } from '@/lib/members/serialize';
import { activateMemberFromApplication, recordStatusHistory } from '@/lib/members/write';
import { emitMembershipEvent } from '@/lib/members/events';
import { reviewActionSchema } from '@/lib/members/validation';
import { formatZodErrors } from '@/lib/auth/validation';
import { validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminWrite(request, 'members', 'approve');
  if (!auth.ok) return auth.error;
  if (!canApproveMembership(auth.user)) return forbidden();

  const parsed = reviewActionSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { id } = await context.params;
  const existing = await db.membershipApplication.findUnique({ where: { id } });
  if (!existing) return notFound('Application');
  if (!canTransitionApplication(existing.status, 'approved')) {
    return error('This application cannot be approved from its current status.', 409);
  }

  const member = await activateMemberFromApplication({
    userId: existing.userId,
    preferredLanguage: existing.preferredLanguage,
  });

  const updated = await db.membershipApplication.update({
    where: { id },
    data: {
      status: 'approved',
      memberId: member.id,
      reviewedById: auth.user.id,
      reviewedAt: new Date(),
      reviewNotes: parsed.data.notes || existing.reviewNotes,
    },
    include: applicationAdminInclude,
  });

  await recordStatusHistory({
    applicationId: id,
    memberId: member.id,
    oldStatus: existing.status,
    newStatus: 'approved',
    changedById: auth.user.id,
    reason: parsed.data.reason || parsed.data.notes || null,
  });
  await recordStatusHistory({
    memberId: member.id,
    oldStatus: null,
    newStatus: member.status,
    changedById: auth.user.id,
    reason: 'Membership approved.',
  });

  await emitMembershipEvent({
    type: 'membership.application_approved',
    userId: auth.user.id,
    entityId: id,
    request,
    details: { applicationId: id, memberId: member.id },
  });
  await emitMembershipEvent({
    type: 'membership.member_created',
    userId: auth.user.id,
    entityId: member.id,
    request,
    details: { memberId: member.id, applicationId: id },
  });

  return success({ application: serializeApplicationAdmin(updated) }, 'Membership approved.');
}
