import { db } from '@/lib/db';
import { error, forbidden, notFound, success, validationError } from '@/lib/api/response';
import { guardAdminWrite } from '@/lib/admin/guard';
import { readJson } from '@/lib/auth/http';
import { canCorrectVolunteerHours, canManageAssignment } from '@/lib/volunteers/access';
import { checkInSchema, formatZodErrors, hourCorrectionSchema } from '@/lib/volunteers/validation';
import {
  checkInAssignment,
  checkOutAssignment,
  correctHours,
  VolunteerWriteError,
} from '@/lib/volunteers/write';
import { assignmentInclude } from '@/lib/volunteers/serialize';

async function loadAssignment(id: string) {
  return db.serviceAssignment.findUnique({
    where: { id },
    include: {
      ...assignmentInclude,
      team: {
        include: { ministry: { select: { id: true, leaderUserId: true } } },
      },
    },
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminWrite(request, 'ministries', 'assign');
  if (!auth.ok) return auth.error;
  const { id } = await context.params;
  const existing = await loadAssignment(id);
  if (!existing) return notFound('Service assignment');
  if (!canManageAssignment(auth.user, existing)) return forbidden();

  const parsed = checkInSchema.safeParse((await readJson(request)) ?? {});
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  try {
    const result = await checkInAssignment({
      assignmentId: id,
      token: parsed.data.token,
      staffUserId: auth.user.id,
      attendanceStatus: parsed.data.attendanceStatus,
    });
    return success({ assignment: result }, 'Checked in.');
  } catch (err) {
    if (err instanceof VolunteerWriteError) return error(err.message, 400);
    throw err;
  }
}
