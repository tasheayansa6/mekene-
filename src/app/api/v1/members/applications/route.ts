import { db } from '@/lib/db';
import { error, success, validationError } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { formatZodErrors } from '@/lib/auth/validation';
import { membershipApplicationSchema } from '@/lib/members/validation';
import {
  applicationSelfInclude,
  serializeApplicationApplicant,
} from '@/lib/members/serialize';
import { assertCanApply, recordStatusHistory } from '@/lib/members/write';
import { emitMembershipEvent } from '@/lib/members/events';
import { getClientIp } from '@/lib/auth/audit';
import { rateLimitKey } from '@/lib/auth/rate-limit';
import { tooManyRequests } from '@/lib/api/response';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';

export async function POST(request: Request) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const limited = rateLimitKey(`membership-apply:${auth.user.id}:${getClientIp(request)}`, 8, 60_000);
  if (!limited.allowed) {
    return tooManyRequests(
      'Too many application attempts. Please wait a moment and try again.',
      limited.retryAfterSeconds
    );
  }

  const parsed = membershipApplicationSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const allowed = await assertCanApply(auth.user.id);
  if (!allowed.ok) return error(allowed.message, allowed.status as 409);

  const created = await db.membershipApplication.create({
    data: {
      userId: auth.user.id,
      status: 'submitted',
      fullName: parsed.data.fullName,
      preferredContact: parsed.data.preferredContact || auth.user.phone,
      preferredLanguage: parsed.data.preferredLanguage,
      howHeard: parsed.data.howHeard || null,
      ministryInterests: parsed.data.ministryInterests || null,
      applicantNote: parsed.data.applicantNote || null,
    },
    include: applicationSelfInclude,
  });

  await recordStatusHistory({
    applicationId: created.id,
    newStatus: 'submitted',
    changedById: auth.user.id,
  });

  await emitMembershipEvent({
    type: 'membership.application_submitted',
    userId: auth.user.id,
    entityId: created.id,
    request,
    details: { applicationId: created.id },
  });

  return success(
    { application: serializeApplicationApplicant(created) },
    'Your membership application has been submitted.',
    201
  );
}

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const rows = await db.membershipApplication.findMany({
    where: { userId: auth.user.id },
    orderBy: { submittedAt: 'desc' },
    include: applicationSelfInclude,
  });

  return success({
    applications: rows.map(serializeApplicationApplicant),
  });
}
