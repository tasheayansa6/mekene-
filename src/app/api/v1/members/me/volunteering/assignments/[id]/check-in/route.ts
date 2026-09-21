import { db } from '@/lib/db';
import { error, notFound, success, validationError } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';
import { checkInSchema, formatZodErrors } from '@/lib/volunteers/validation';
import { checkInAssignment, VolunteerWriteError } from '@/lib/volunteers/write';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;
  const member = await db.member.findUnique({
    where: { userId: auth.user.id },
    select: { id: true },
  });
  if (!member) return error('You do not have a church membership record yet.', 404);

  const parsed = checkInSchema.safeParse((await readJson(request)) ?? {});
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const { id } = await context.params;
  try {
    const result = await checkInAssignment({
      assignmentId: id,
      actorMemberId: member.id,
      attendanceStatus: parsed.data.attendanceStatus,
    });
    if (!result) return notFound('Service assignment');
    return success({ assignment: result }, 'Checked in.');
  } catch (err) {
    if (err instanceof VolunteerWriteError) {
      return error(err.message, err.code === 'unauthorized' ? 403 : 400);
    }
    throw err;
  }
}
