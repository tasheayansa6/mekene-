import { badRequest, forbidden, success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';
import { applyToCourse, getMemberByUserId } from '@/lib/education/enrollment';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const csrf = rejectIfCsrfInvalid(request);
  if (csrf) return csrf;

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const member = await getMemberByUserId(auth.user.id);
  if (!member) return forbidden('A member profile is required.');

  const { id } = await context.params;
  const body = (await readJson(request)) as Record<string, unknown> | null;
  const notes = typeof body?.notes === 'string' ? body.notes : null;

  const result = await applyToCourse({
    courseId: id,
    memberId: member.id,
    notes,
  });
  if (!result.ok) return badRequest(result.error);
  return success(result.enrollment, result.created ? 'Application submitted.' : 'Already enrolled.', result.created ? 201 : 200);
}
