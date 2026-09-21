import { db } from '@/lib/db';
import { forbidden, success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { getMemberByUserId } from '@/lib/education/enrollment';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const member = await getMemberByUserId(auth.user.id);
  if (!member) return forbidden('A member profile is required.');

  const grades = await db.educationGrade.findMany({
    where: { memberId: member.id },
    include: {
      course: { select: { id: true, title: true, slug: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return success({
    grades: grades.map((g) => ({
      id: g.id,
      courseId: g.courseId,
      course: g.course,
      assignmentScore: g.assignmentScore,
      quizScore: g.quizScore,
      examScore: g.examScore,
      attendanceScore: g.attendanceScore,
      finalScore: g.finalScore,
      letterGrade: g.letterGrade,
      status: g.status,
      feedback: g.feedback,
      updatedAt: g.updatedAt.toISOString(),
    })),
  });
}
