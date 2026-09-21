import { db } from '@/lib/db';
import { error, success, validationError } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';
import { sanitizePlainText } from '@/lib/content/sanitize';
import { emitVolunteerEvent } from '@/lib/volunteers/events';
import {
  applicationAdminInclude,
  serializeApplicationForMember,
} from '@/lib/volunteers/serialize';
import {
  formatZodErrors,
  memberApplicationCreateSchema,
} from '@/lib/volunteers/validation';

async function requireMember(userId: string) {
  return db.member.findUnique({
    where: { userId },
    select: { id: true, userId: true },
  });
}

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const member = await requireMember(auth.user.id);
  if (!member) {
    return success({ applications: [] });
  }

  const rows = await db.volunteerApplication.findMany({
    where: { memberId: member.id },
    include: applicationAdminInclude,
    orderBy: { updatedAt: 'desc' },
  });

  return success({
    applications: rows.map(serializeApplicationForMember),
  });
}

export async function POST(request: Request) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const member = await requireMember(auth.user.id);
  if (!member) {
    return error('You do not have a church membership record yet.', 404);
  }

  const parsed = memberApplicationCreateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  if (parsed.data.ministryId) {
    const ministry = await db.ministry.findUnique({
      where: { id: parsed.data.ministryId },
      select: { id: true, isActive: true },
    });
    if (!ministry || !ministry.isActive) {
      return validationError({ ministryId: ['Ministry not found'] });
    }
  }

  const submit = parsed.data.submit !== false;
  const row = await db.volunteerApplication.create({
    data: {
      memberId: member.id,
      ministryId: parsed.data.ministryId || null,
      status: submit ? 'submitted' : 'draft',
      preferredMinistry: parsed.data.preferredMinistry
        ? sanitizePlainText(parsed.data.preferredMinistry, 120)
        : null,
      skills: parsed.data.skills
        ? sanitizePlainText(parsed.data.skills, 1000)
        : null,
      experience: parsed.data.experience
        ? sanitizePlainText(parsed.data.experience, 2000)
        : null,
      availability: parsed.data.availability
        ? sanitizePlainText(parsed.data.availability, 1000)
        : null,
      motivation: parsed.data.motivation
        ? sanitizePlainText(parsed.data.motivation, 2000)
        : null,
      preferredTimes: parsed.data.preferredTimes
        ? sanitizePlainText(parsed.data.preferredTimes, 500)
        : null,
      submittedAt: submit ? new Date() : null,
    },
    include: applicationAdminInclude,
  });

  if (submit) {
    await db.volunteerProfile.upsert({
      where: { memberId: member.id },
      create: {
        memberId: member.id,
        status: 'pending_review',
        experience: parsed.data.experience
          ? sanitizePlainText(parsed.data.experience, 2000)
          : null,
      },
      update: {
        status: 'pending_review',
      },
    });

    await emitVolunteerEvent({
      type: 'application_submitted',
      actorId: auth.user.id,
      entityId: row.id,
      recipientUserId: auth.user.id,
      request,
    });
  }

  return success(
    { application: serializeApplicationForMember(row) },
    submit ? 'Application submitted.' : 'Draft saved.',
    201
  );
}
