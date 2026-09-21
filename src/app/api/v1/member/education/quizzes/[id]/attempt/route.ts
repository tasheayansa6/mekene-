import { db } from '@/lib/db';
import { badRequest, forbidden, notFound, success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';
import { requireActiveEnrollment, getMemberByUserId } from '@/lib/education/enrollment';
import { evaluateQuizAttempt } from '@/lib/education/quiz';

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
  const quiz = await db.educationQuiz.findUnique({
    where: { id },
    include: {
      questions: {
        select: {
          id: true,
          questionType: true,
          correctJson: true,
          points: true,
        },
      },
    },
  });
  if (!quiz || quiz.status !== 'published') return notFound('Quiz not found');

  const enrollment = await requireActiveEnrollment(quiz.courseId, member.id);
  if (!enrollment) return forbidden('You must be enrolled to attempt this quiz.');

  const attemptCount = await db.quizAttempt.count({
    where: { quizId: id, memberId: member.id, submittedAt: { not: null } },
  });
  if (attemptCount >= quiz.maxAttempts) {
    return badRequest('Maximum attempts reached');
  }

  const body = (await readJson(request)) as Record<string, unknown> | null;
  const answers =
    body?.answers && typeof body.answers === 'object' && !Array.isArray(body.answers)
      ? (body.answers as Record<string, unknown>)
      : null;
  if (!answers) return badRequest('answers object is required');

  const scored = evaluateQuizAttempt(quiz.questions, answers, quiz.passingScore);

  const attempt = await db.quizAttempt.create({
    data: {
      quizId: id,
      memberId: member.id,
      answersJson: JSON.stringify(answers),
      score: scored.score,
      maxScore: scored.maxScore,
      passed: scored.passed,
      submittedAt: new Date(),
    },
  });

  return success(
    {
      id: attempt.id,
      score: scored.score,
      maxScore: scored.maxScore,
      percent: scored.percent,
      passed: scored.passed,
      submittedAt: attempt.submittedAt?.toISOString() ?? null,
    },
    'Quiz submitted.',
    201
  );
}
