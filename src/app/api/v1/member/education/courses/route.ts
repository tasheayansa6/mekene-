import { db } from '@/lib/db';
import { forbidden, success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { listCourses } from '@/lib/education/courses';
import { getMemberByUserId } from '@/lib/education/enrollment';
import { serializeEnrollment } from '@/lib/education/serialize';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const member = await getMemberByUserId(auth.user.id);
  if (!member) return forbidden('A member profile is required.');

  const [enrollments, available] = await Promise.all([
    db.educationEnrollment.findMany({
      where: { memberId: member.id },
      include: {
        course: { select: { id: true, title: true, slug: true, status: true } },
      },
      orderBy: { appliedAt: 'desc' },
    }),
    listCourses({ publishedOnly: true, pageSize: 100 }),
  ]);

  const enrolledIds = new Set(enrollments.map((e) => e.courseId));
  return success({
    enrollments: enrollments.map(serializeEnrollment),
    availableCourses: available.items.filter((c) => !enrolledIds.has(c.id)),
  });
}
