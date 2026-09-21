import { db } from '@/lib/db';
import { forbidden, success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { ACTIVE_ENROLLMENT_STATUSES } from '@/lib/education/access';
import { getMemberByUserId } from '@/lib/education/enrollment';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const member = await getMemberByUserId(auth.user.id);
  if (!member) return forbidden('A member profile is required.');

  const enrollments = await db.educationEnrollment.findMany({
    where: {
      memberId: member.id,
      status: { in: [...ACTIVE_ENROLLMENT_STATUSES] },
    },
    select: { courseId: true },
  });
  const courseIds = enrollments.map((e) => e.courseId);
  if (!courseIds.length) return success({ assignments: [] });

  const assignments = await db.educationAssignment.findMany({
    where: { courseId: { in: courseIds }, status: 'published' },
    include: {
      course: { select: { id: true, title: true, slug: true } },
      submissions: {
        where: { memberId: member.id },
        select: {
          id: true,
          status: true,
          score: true,
          feedback: true,
          submittedAt: true,
        },
      },
    },
    orderBy: [{ dueAt: 'asc' }, { title: 'asc' }],
  });

  return success({
    assignments: assignments.map((a) => ({
      id: a.id,
      title: a.title,
      instructions: a.instructions,
      dueAt: a.dueAt?.toISOString() ?? null,
      maxScore: a.maxScore,
      submissionType: a.submissionType,
      course: a.course,
      submission: a.submissions[0]
        ? {
            id: a.submissions[0].id,
            status: a.submissions[0].status,
            score: a.submissions[0].score,
            feedback: a.submissions[0].feedback,
            submittedAt: a.submissions[0].submittedAt.toISOString(),
          }
        : null,
    })),
  });
}
