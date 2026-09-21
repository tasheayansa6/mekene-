import { db } from '@/lib/db';
import { error, forbidden, notFound, success, validationError } from '@/lib/api/response';
import { guardAdminWrite } from '@/lib/admin/guard';
import { readJson } from '@/lib/auth/http';
import { canCorrectVolunteerHours, canManageAssignment } from '@/lib/volunteers/access';
import { assignmentInclude } from '@/lib/volunteers/serialize';
import { formatZodErrors, hourCorrectionSchema } from '@/lib/volunteers/validation';
import { correctHours, VolunteerWriteError } from '@/lib/volunteers/write';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminWrite(request, 'volunteers', 'manage');
  if (!auth.ok) return auth.error;
  if (!canCorrectVolunteerHours(auth.user)) return forbidden();
  const parsed = hourCorrectionSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const { id } = await context.params;
  const existing = await db.serviceAssignment.findUnique({
    where: { id },
    include: {
      ...assignmentInclude,
      team: { include: { ministry: { select: { id: true, leaderUserId: true } } } },
    },
  });
  if (!existing) return notFound('Service assignment');
  if (!canManageAssignment(auth.user, existing)) return forbidden();
  try {
    const result = await correctHours({
      assignmentId: id,
      hoursMinutes: parsed.data.hoursMinutes,
      attendanceStatus: parsed.data.attendanceStatus,
      reason: parsed.data.reason,
      actorId: auth.user.id,
      request,
    });
    return success({ assignment: result }, 'Hours corrected.');
  } catch (err) {
    if (err instanceof VolunteerWriteError) return error(err.message, 400);
    throw err;
  }
}
