import { db } from '@/lib/db';
import { forbidden, success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { canManageEducation, canUpdateEducation } from '@/lib/education/access';
import { serializeCourse } from '@/lib/education/serialize';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const manageAll = canManageEducation(auth.user) || canUpdateEducation(auth.user);
  const rows = await db.educationCourse.findMany({
    where: manageAll ? undefined : { instructorUserId: auth.user.id },
    include: {
      program: { select: { id: true, name: true, slug: true } },
      instructorUser: { select: { id: true, firstName: true, lastName: true } },
      _count: { select: { enrollments: true, modules: true } },
    },
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    take: 200,
  });

  if (!manageAll && rows.length === 0) {
    return forbidden('No instructor courses assigned.');
  }

  return success({
    courses: rows.map((row) => serializeCourse(row, { includeWeights: true })),
  });
}
