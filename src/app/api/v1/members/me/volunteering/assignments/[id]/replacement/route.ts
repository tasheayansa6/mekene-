import { db } from '@/lib/db';
import { error, notFound, success, validationError } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';
import { formatZodErrors, substitutionCreateSchema } from '@/lib/volunteers/validation';
import { requestReplacement, VolunteerWriteError } from '@/lib/volunteers/write';

async function handle(
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

  const parsed = substitutionCreateSchema.safeParse((await readJson(request)) ?? {});
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { id } = await context.params;
  try {
    const result = await requestReplacement({
      assignmentId: id,
      memberId: member.id,
      reason: parsed.data.reason,
      actorId: auth.user.id,
      request,
    });
    if (!result) return notFound('Service assignment');
    return success(result, 'Replacement requested.');
  } catch (err) {
    if (err instanceof VolunteerWriteError) return error(err.message, 400);
    throw err;
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return handle(request, context);
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return handle(request, context);
}
