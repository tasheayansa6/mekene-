import { db } from '@/lib/db';
import { forbidden, notFound, success, validationError } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { readJson } from '@/lib/auth/http';
import {
  canAccessApplication,
  canApproveVolunteers,
  canViewVolunteers,
} from '@/lib/volunteers/access';
import {
  applicationAdminInclude,
  serializeApplication,
} from '@/lib/volunteers/serialize';
import { applicationReviewSchema, formatZodErrors } from '@/lib/volunteers/validation';
import {
  approveApplication,
  rejectApplication,
  requestApplicationInfo,
} from '@/lib/volunteers/write';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminRead(request, 'volunteers', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewVolunteers(auth.user)) return forbidden();

  const { id } = await context.params;
  const row = await db.volunteerApplication.findUnique({
    where: { id },
    include: applicationAdminInclude,
  });
  if (!row) return notFound('Volunteer application');
  if (!canAccessApplication(auth.user, row)) return notFound('Volunteer application');

  return success(serializeApplication(row, { includeReviewNotes: true }));
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminWrite(request, 'volunteers', 'approve');
  if (!auth.ok) return auth.error;
  if (!canApproveVolunteers(auth.user)) return forbidden();

  const parsed = applicationReviewSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { id } = await context.params;
  const existing = await db.volunteerApplication.findUnique({
    where: { id },
    include: { ministry: { select: { id: true, leaderUserId: true } } },
  });
  if (!existing) return notFound('Volunteer application');
  if (!canAccessApplication(auth.user, existing)) {
    return notFound('Volunteer application');
  }

  if (parsed.data.action === 'approve') {
    const result = await approveApplication({
      applicationId: id,
      reviewerId: auth.user.id,
      reviewNotes: parsed.data.reviewNotes,
      reviewerMessage: parsed.data.reviewerMessage,
      addToMinistry: parsed.data.addToMinistry,
      request,
    });
    if (!result) return notFound('Volunteer application');
    return success(
      {
        application: serializeApplication(result.application, {
          includeReviewNotes: true,
        }),
        profile: {
          id: result.profile.id,
          memberId: result.profile.memberId,
          status: result.profile.status,
        },
        ministryLink: result.ministryLink
          ? {
              id: result.ministryLink.id,
              ministryId: result.ministryLink.ministryId,
              status: result.ministryLink.status,
            }
          : null,
      },
      'Application approved.'
    );
  }

  if (parsed.data.action === 'reject') {
    const row = await rejectApplication({
      applicationId: id,
      reviewerId: auth.user.id,
      reviewNotes: parsed.data.reviewNotes,
      reviewerMessage: parsed.data.reviewerMessage,
      request,
    });
    if (!row) return notFound('Volunteer application');
    return success(
      serializeApplication(row, { includeReviewNotes: true }),
      'Application rejected.'
    );
  }

  if (parsed.data.action === 'request_info') {
    const row = await requestApplicationInfo({
      applicationId: id,
      reviewerId: auth.user.id,
      reviewNotes: parsed.data.reviewNotes,
      reviewerMessage: parsed.data.reviewerMessage,
      request,
    });
    if (!row) return notFound('Volunteer application');
    return success(
      serializeApplication(row, { includeReviewNotes: true }),
      'More information requested.'
    );
  }

  const row = await db.volunteerApplication.update({
    where: { id },
    data: {
      status: 'under_review',
      reviewedById: auth.user.id,
      reviewedAt: new Date(),
      reviewNotes: parsed.data.reviewNotes ?? undefined,
      reviewerMessage: parsed.data.reviewerMessage ?? undefined,
    },
    include: applicationAdminInclude,
  });
  return success(
    serializeApplication(row, { includeReviewNotes: true }),
    'Application marked under review.'
  );
}
