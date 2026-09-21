import { db } from '@/lib/db';
import { error, success, validationError } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';
import { serializeProfileChangeRequest } from '@/lib/pastoral/serialize';
import {
  formatZodErrors,
  PROFILE_CHANGE_PROTECTED_FIELDS,
  profileChangeRequestSchema,
} from '@/lib/pastoral/validation';
import { sanitizePlainText } from '@/lib/content/sanitize';
import { emitMembershipEvent } from '@/lib/members/events';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const member = await db.member.findUnique({
    where: { userId: auth.user.id },
    select: { id: true },
  });
  if (!member) return success({ requests: [] });

  const rows = await db.memberProfileChangeRequest.findMany({
    where: { memberId: member.id },
    include: {
      requestedBy: { select: { id: true, firstName: true, lastName: true } },
      reviewedBy: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return success({ requests: rows.map(serializeProfileChangeRequest) });
}

export async function POST(request: Request) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const parsed = profileChangeRequestSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const member = await db.member.findUnique({
    where: { userId: auth.user.id },
    select: { id: true },
  });
  if (!member) {
    return error('You do not have a church membership record yet.', 404);
  }

  const pending = await db.memberProfileChangeRequest.count({
    where: { memberId: member.id, status: 'pending' },
  });
  if (pending >= 3) {
    return error('You already have pending profile change requests. Please wait for a review.', 429);
  }

  const payload: Record<string, unknown> = {};
  for (const key of PROFILE_CHANGE_PROTECTED_FIELDS) {
    const value = parsed.data[key];
    if (value === undefined) continue;
    if (value === null || value === '') {
      payload[key] = null;
      continue;
    }
    if (key === 'dateOfBirth' || key === 'baptismDate') {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return validationError({ [key]: ['Invalid date'] });
      }
      payload[key] = date.toISOString().slice(0, 10);
    } else {
      payload[key] = sanitizePlainText(value, 400);
    }
  }

  const row = await db.memberProfileChangeRequest.create({
    data: {
      memberId: member.id,
      requestedById: auth.user.id,
      status: 'pending',
      payload: JSON.stringify(payload),
    },
    include: {
      requestedBy: { select: { id: true, firstName: true, lastName: true } },
      reviewedBy: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  await emitMembershipEvent({
    type: 'membership.member_updated',
    userId: auth.user.id,
    entityId: member.id,
    request,
    details: { profileChangeRequestId: row.id, action: 'submitted' },
  });

  return success(
    { request: serializeProfileChangeRequest(row) },
    'Profile change submitted for review.',
    201
  );
}
