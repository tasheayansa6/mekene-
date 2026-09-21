import { db } from '@/lib/db';
import { error, forbidden, notFound, success, validationError } from '@/lib/api/response';
import { guardAdminWrite } from '@/lib/admin/guard';
import { canModerateApplications } from '@/lib/members/access';
import { serializeProfileChangeRequest } from '@/lib/pastoral/serialize';
import { formatZodErrors, profileChangeReviewSchema } from '@/lib/pastoral/validation';
import { PROFILE_CHANGE_PROTECTED_FIELDS } from '@/lib/pastoral/validation';
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

  let fields: Record<string, unknown> = {};
  try {
    fields = JSON.parse(existing.payload) as Record<string, unknown>;
  } catch {
    return error('Invalid change payload.', 422);
  }

  const data: Record<string, unknown> = {};
  for (const key of PROFILE_CHANGE_PROTECTED_FIELDS) {
    if (!(key in fields)) continue;
    const value = fields[key];
    if (value === null || value === '') {
      data[key] = null;
      continue;
    }
    if (key === 'dateOfBirth' || key === 'baptismDate') {
      const date = new Date(String(value));
      if (Number.isNaN(date.getTime())) {
        return validationError({ [key]: ['Invalid date in request payload'] });
      }
      data[key] = date;
    } else {
      data[key] = typeof value === 'string' ? sanitizePlainText(value, 400) : value;
    }
  }

  await db.member.update({
    where: { id: existing.memberId },
    data,
  });

  const updated = await db.memberProfileChangeRequest.update({
    where: { id },
    data: {
      status: 'approved',
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
    details: { profileChangeRequestId: id, action: 'approved' },
  });

  return success(serializeProfileChangeRequest(updated), 'Profile change approved.');
}
