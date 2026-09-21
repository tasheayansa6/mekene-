import { db } from '@/lib/db';
import { isActiveEnrollmentStatus } from './access';

/** Mark a published lesson complete and recompute enrollment progressPct. */
export async function markLessonComplete(input: {
  lessonId: string;
  memberId: string;
}) {
  const lesson = await db.courseLesson.findUnique({
    where: { id: input.lessonId },
    select: {
      id: true,
      status: true,
      module: { select: { courseId: true } },
    },
  });
  if (!lesson || lesson.status !== 'published') {
    return { ok: false as const, error: 'Lesson not found' };
  }

  const courseId = lesson.module.courseId;
  const enrollment = await db.educationEnrollment.findUnique({
    where: { courseId_memberId: { courseId, memberId: input.memberId } },
  });
  if (!enrollment || !isActiveEnrollmentStatus(enrollment.status)) {
    return { ok: false as const, error: 'Not enrolled in this course' };
  }

  await db.lessonProgress.upsert({
    where: {
      lessonId_memberId: { lessonId: input.lessonId, memberId: input.memberId },
    },
    create: {
      lessonId: input.lessonId,
      memberId: input.memberId,
      completed: true,
      completedAt: new Date(),
    },
    update: {
      completed: true,
      completedAt: new Date(),
    },
  });

  const progressPct = await recomputeEnrollmentProgress(courseId, input.memberId);
  return { ok: true as const, progressPct };
}

export async function recomputeEnrollmentProgress(courseId: string, memberId: string) {
  const publishedLessons = await db.courseLesson.findMany({
    where: {
      status: 'published',
      module: { courseId },
    },
    select: { id: true },
  });
  const total = publishedLessons.length;
  if (total === 0) {
    await db.educationEnrollment.update({
      where: { courseId_memberId: { courseId, memberId } },
      data: { progressPct: 0 },
    });
    return 0;
  }

  const completed = await db.lessonProgress.count({
    where: {
      memberId,
      completed: true,
      lessonId: { in: publishedLessons.map((l) => l.id) },
    },
  });

  const progressPct = Math.min(100, Math.round((completed / total) * 100));
  await db.educationEnrollment.update({
    where: { courseId_memberId: { courseId, memberId } },
    data: { progressPct },
  });
  return progressPct;
}
