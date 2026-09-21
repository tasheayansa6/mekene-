import { db } from '@/lib/db';
import { error, success, validationError } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { formatZodErrors } from '@/lib/auth/validation';
import { applicationUpdateSchema } from '@/lib/members/validation';
import {
  applicationSelfInclude,
  serializeApplicationApplicant,
} from '@/lib/members/serialize';
import { recordStatusHistory } from '@/lib/members/write';
import { emitMembershipEvent } from '@/lib/members/events';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const application = await db.membershipApplication.findFirst({
    where: { userId: auth.user.id },
    orderBy: { submittedAt: 'desc' },
    include: applicationSelfInclude,
  });

  return success({
    application: application ? serializeApplicationApplicant(application) : null,
  });
}

export async function PATCH(request: Request) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const parsed = applicationUpdateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const existing = await db.membershipApplication.findFirst({
    where: { userId: auth.user.id },
    orderBy: { submittedAt: 'desc' },
  });
  if (!existing) return error('No membership application found.', 404);
  if (existing.status !== 'needs_information') {
    return error('This application cannot be updated right now.', 409);
  }

  const updated = await db.membershipApplication.update({
    where: { id: existing.id },
    data: {
      fullName: parsed.data.fullName ?? existing.fullName,
      preferredContact: parsed.data.preferredContact ?? existing.preferredContact,
      preferredLanguage: parsed.data.preferredLanguage ?? existing.preferredLanguage,
      howHeard: parsed.data.howHeard === undefined ? undefined : parsed.data.howHeard || null,
      ministryInterests:
        parsed.data.ministryInterests === undefined
          ? undefined
          : parsed.data.ministryInterests || null,
      applicantNote:
        parsed.data.applicantNote === undefined ? undefined : parsed.data.applicantNote || null,
      status: 'resubmitted',
    },
    include: applicationSelfInclude,
  });

  await recordStatusHistory({
    applicationId: existing.id,
    oldStatus: existing.status,
    newStatus: 'resubmitted',
    changedById: auth.user.id,
    reason: 'Applicant provided additional information.',
  });

  await emitMembershipEvent({
    type: 'membership.application_updated',
    userId: auth.user.id,
    entityId: existing.id,
    request,
    details: { applicationId: existing.id, status: 'resubmitted' },
  });

  return success(
    { application: serializeApplicationApplicant(updated) },
    'Your application has been updated.'
  );
}
