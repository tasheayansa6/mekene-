import { db } from '@/lib/db';
import { badRequest, forbidden, paginated, success } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { readJson } from '@/lib/auth/http';
import { canApproveEnrollment, canViewEducation } from '@/lib/education/access';
import { setEnrollmentStatus } from '@/lib/education/enrollment';
import { serializeEnrollment } from '@/lib/education/serialize';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'education', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewEducation(auth.user)) return forbidden();

  const url = new URL(request.url);
  const status = url.searchParams.get('status') || undefined;
  const courseId = url.searchParams.get('courseId') || undefined;
  const page = Number(url.searchParams.get('page') || 1);
  const pageSize = Math.min(Number(url.searchParams.get('pageSize') || 50), 100);

  const where = {
    ...(status ? { status: status as never } : {}),
    ...(courseId ? { courseId } : {}),
  };

  const [totalItems, rows] = await Promise.all([
    db.educationEnrollment.count({ where }),
    db.educationEnrollment.findMany({
      where,
      include: {
        course: { select: { id: true, title: true, slug: true, status: true } },
        member: { select: { id: true, displayName: true, membershipNumber: true } },
      },
      orderBy: { appliedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return paginated(rows.map(serializeEnrollment), { page, pageSize, totalItems });
}

export async function PATCH(request: Request) {
  const auth = await guardAdminWrite(request, 'education', 'approve');
  if (!auth.ok) return auth.error;
  if (!canApproveEnrollment(auth.user)) return forbidden();

  const body = (await readJson(request)) as Record<string, unknown> | null;
  if (!body || typeof body.id !== 'string' || typeof body.status !== 'string') {
    return badRequest('id and status are required');
  }

  const result = await setEnrollmentStatus({
    enrollmentId: body.id,
    status: body.status,
    notes: typeof body.notes === 'string' ? body.notes : undefined,
  });
  if (!result.ok) return badRequest(result.error);
  return success(result.enrollment, 'Enrollment updated.');
}
