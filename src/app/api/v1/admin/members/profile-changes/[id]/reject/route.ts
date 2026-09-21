import { db } from '@/lib/db';
import { error, forbidden, notFound, success, validationError } from '@/lib/api/response';
import { guardAdminWrite } from '@/lib/admin/guard';
import { canModerateApplications } from '@/lib/members/access';
import { serializeProfileChangeRequest } from '@/lib/pastoral/serialize';
import { formatZodErrors, profileChangeReviewSchema } from '@/lib/pastoral/validation';
import { emitMembershipEvent } from '@/lib/members/events';
import { readJson } from '@/lib/auth/http';
import { sanitizePlainText } from '@/lib/content/sanitize';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminWrite(request, 'members', 'moderate');
  if (!auth.ok) return auth.error;
  if (!canModerateApplications(auth.user)) return forbidden();

  const parsed = profileChangeReviewSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { id } = await context.params;
  const existing = await db.memberProfileChangeRequest.findUnique({ where: { id } });
  if (!existing) return notFound('Profile change request');
  if (existing.status !== 'pending') {
    return error('This request has already been reviewed.', 409);
  }

  const updated = await db.memberProfileChangeRequest.update({
    where: { id },
    data: {
      status: 'rejected',
      reviewedById: auth.user.id,
      reviewedAt: new Date(),
      staffNote: parsed.data.staffNote
        ? sanitizePlainText(parsed.data.staffNote, 1000)
        : null,
    },
    include: {
      requestedBy: { select: { id: true, firstName: true, lastName: true } },
      reviewedBy: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  await emitMembershipEvent({
    type: 'membership.member_updated',
    userId: auth.user.id,
    entityId: existing.memberId,
    request,
    details: { profileChangeRequestId: id, action: 'rejected' },
  });

  return success(serializeProfileChangeRequest(updated), 'Profile change rejected.');
}
