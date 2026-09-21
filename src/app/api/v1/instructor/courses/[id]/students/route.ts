import { db } from '@/lib/db';
import { forbidden, notFound, success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { canInstructCourse } from '@/lib/education/access';
import { serializeEnrollment } from '@/lib/education/serialize';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const { id } = await context.params;
  const course = await db.educationCourse.findUnique({
    where: { id },
    select: { id: true, instructorUserId: true },
  });
  if (!course) return notFound('Course not found');
  if (!canInstructCourse(auth.user, course.instructorUserId)) return forbidden();

  const enrollments = await db.educationEnrollment.findMany({
    where: { courseId: id },
    include: {
      member: { select: { id: true, displayName: true, membershipNumber: true } },
      course: { select: { id: true, title: true, slug: true, status: true } },
    },
    orderBy: { appliedAt: 'desc' },
  });

  return success({ enrollments: enrollments.map(serializeEnrollment) });
}
