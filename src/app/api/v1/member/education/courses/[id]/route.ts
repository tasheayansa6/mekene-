import { db } from '@/lib/db';
import { forbidden, notFound, success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { isActiveEnrollmentStatus } from '@/lib/education/access';
import { getCourseById } from '@/lib/education/courses';
import { getMemberByUserId } from '@/lib/education/enrollment';
import { serializeEnrollment } from '@/lib/education/serialize';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const member = await getMemberByUserId(auth.user.id);
  if (!member) return forbidden('A member profile is required.');

  const { id } = await context.params;
  const enrollment = await db.educationEnrollment.findUnique({
    where: { courseId_memberId: { courseId: id, memberId: member.id } },
  });

  const canAccess =
    (enrollment && isActiveEnrollmentStatus(enrollment.status)) ||
    false;

  const course = await getCourseById(id, {
    includeModules: true,
    publishedLessonsOnly: true,
    includeWeights: canAccess,
  });
  if (!course) return notFound('Course not found');

  if (!canAccess && course.status !== 'published') {
    return notFound('Course not found');
  }

  return success({
    course,
    enrollment: enrollment ? serializeEnrollment(enrollment) : null,
  });
}
