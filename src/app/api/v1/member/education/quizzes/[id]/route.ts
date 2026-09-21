import { db } from '@/lib/db';
import { forbidden, notFound, success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { requireActiveEnrollment, getMemberByUserId } from '@/lib/education/enrollment';
import { serializeQuizForLearner } from '@/lib/education/serialize';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const member = await getMemberByUserId(auth.user.id);
  if (!member) return forbidden('A member profile is required.');

  const { id } = await context.params;
  const quiz = await db.educationQuiz.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          prompt: true,
          questionType: true,
          optionsJson: true,
          points: true,
          sortOrder: true,
        },
      },
    },
  });
  if (!quiz || quiz.status !== 'published') return notFound('Quiz not found');

  const enrollment = await requireActiveEnrollment(quiz.courseId, member.id);
  if (!enrollment) return forbidden('You must be enrolled to view this quiz.');

  return success(serializeQuizForLearner(quiz));
}
