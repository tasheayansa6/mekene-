import { db } from '@/lib/db';
import { badRequest, forbidden, notFound, success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';
import { canInstructCourse } from '@/lib/education/access';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const csrf = rejectIfCsrfInvalid(request);
  if (csrf) return csrf;

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const { id } = await context.params;
  const submission = await db.assignmentSubmission.findUnique({
    where: { id },
    include: {
      assignment: { select: { courseId: true, maxScore: true } },
    },
  });
  if (!submission) return notFound('Submission not found');

  const course = await db.educationCourse.findUnique({
    where: { id: submission.assignment.courseId },
    select: { instructorUserId: true },
  });
  if (!course || !canInstructCourse(auth.user, course.instructorUserId)) {
    return forbidden();
  }

  const body = (await readJson(request)) as Record<string, unknown> | null;
  if (!body) return badRequest('Body required');

  const score = typeof body.score === 'number' ? body.score : undefined;
  if (score !== undefined && (score < 0 || score > submission.assignment.maxScore)) {
    return badRequest(`score must be between 0 and ${submission.assignment.maxScore}`);
  }

  const row = await db.assignmentSubmission.update({
    where: { id },
    data: {
      ...(score !== undefined ? { score } : {}),
      feedback: typeof body.feedback === 'string' ? body.feedback : undefined,
      privateNote: typeof body.privateNote === 'string' ? body.privateNote : undefined,
      status: 'graded',
      gradedById: auth.user.id,
      gradedAt: new Date(),
    },
  });

  return success({
    id: row.id,
    status: row.status,
    score: row.score,
    feedback: row.feedback,
    privateNote: row.privateNote,
    gradedAt: row.gradedAt?.toISOString() ?? null,
  });
}
