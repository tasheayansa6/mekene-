import { db } from '@/lib/db';
import { error, notFound, success, validationError } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';
import {
  assignmentDeclineSchema,
  formatZodErrors,
} from '@/lib/volunteers/validation';
import { declineAssignment } from '@/lib/volunteers/write';

export async function PATCH(
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
  if (!member) {
    return error('You do not have a church membership record yet.', 404);
  }

  const body = await readJson(request);
  const parsed = assignmentDeclineSchema.safeParse(body ?? {});
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { id } = await context.params;
  const result = await declineAssignment({
    assignmentId: id,
    memberId: member.id,
    declineReason: parsed.data.declineReason,
    request,
  });
  if (!result) return notFound('Service assignment');

  return success({ assignment: result }, 'Assignment declined.');
}

export const POST = PATCH;
