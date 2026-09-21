import { db } from '@/lib/db';
import { badRequest, forbidden, notFound, success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';
import { requireActiveEnrollment, getMemberByUserId } from '@/lib/education/enrollment';

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
  const assignment = await db.educationAssignment.findUnique({
    where: { id },
    select: { id: true, courseId: true, status: true, dueAt: true },
  });
  if (!assignment || assignment.status !== 'published') {
    return notFound('Assignment not found');
  }

  const enrollment = await requireActiveEnrollment(assignment.courseId, member.id);
  if (!enrollment) return forbidden('You must be enrolled to submit.');

  const body = (await readJson(request)) as Record<string, unknown> | null;
  const textBody = typeof body?.textBody === 'string' ? body.textBody : null;
  const linkUrl = typeof body?.linkUrl === 'string' ? body.linkUrl : null;
  const fileKey = typeof body?.fileKey === 'string' ? body.fileKey : null;
  if (!textBody && !linkUrl && !fileKey) {
    return badRequest('Provide textBody, linkUrl, or fileKey');
  }

  const late = assignment.dueAt ? assignment.dueAt < new Date() : false;
  const row = await db.assignmentSubmission.upsert({
    where: {
      assignmentId_memberId: { assignmentId: id, memberId: member.id },
    },
    create: {
      assignmentId: id,
      memberId: member.id,
      textBody,
      linkUrl,
      fileKey,
      status: late ? 'late' : 'submitted',
    },
    update: {
      textBody,
      linkUrl,
      fileKey,
      status: late ? 'late' : 'submitted',
      submittedAt: new Date(),
    },
  });

  return success(
    {
      id: row.id,
      status: row.status,
      score: row.score,
      feedback: row.feedback,
      submittedAt: row.submittedAt.toISOString(),
    },
    'Submission saved.',
    201
  );
}
