import { badRequest, forbidden, success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { rejectIfCsrfInvalid } from '@/lib/auth/http';
import { getMemberByUserId } from '@/lib/education/enrollment';
import { markLessonComplete } from '@/lib/education/progress';

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
  const result = await markLessonComplete({ lessonId: id, memberId: member.id });
  if (!result.ok) return badRequest(result.error);
  return success({ progressPct: result.progressPct }, 'Lesson marked complete.');
}
