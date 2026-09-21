import { badRequest, forbidden, paginated, success } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { readJson } from '@/lib/auth/http';
import { canCreateEducation, canViewEducation } from '@/lib/education/access';
import { createCourse, listCourses } from '@/lib/education/courses';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'education', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewEducation(auth.user)) return forbidden();

  const url = new URL(request.url);
  const result = await listCourses({
    status: url.searchParams.get('status') || undefined,
    programId: url.searchParams.get('programId') || undefined,
    page: Number(url.searchParams.get('page') || 1),
    pageSize: Number(url.searchParams.get('pageSize') || 50),
    includeWeights: true,
  });

  return paginated(result.items, {
    page: result.page,
    pageSize: result.pageSize,
    totalItems: result.totalItems,
  });
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'education', 'create');
  if (!auth.ok) return auth.error;
  if (!canCreateEducation(auth.user)) return forbidden();

  const body = (await readJson(request)) as Record<string, unknown> | null;
  if (!body || typeof body.title !== 'string' || !body.title.trim()) {
    return badRequest('title is required');
  }

  const delivery =
    body.deliveryType === 'online' ||
    body.deliveryType === 'in_person' ||
    body.deliveryType === 'hybrid'
      ? body.deliveryType
      : 'hybrid';
  const status =
    body.status === 'published' || body.status === 'archived' || body.status === 'draft'
      ? body.status
      : 'draft';

  const course = await createCourse({
    title: body.title,
    slug: typeof body.slug === 'string' ? body.slug : undefined,
    programId: typeof body.programId === 'string' ? body.programId : null,
    description: typeof body.description === 'string' ? body.description : null,
    category: typeof body.category === 'string' ? body.category : null,
    level: typeof body.level === 'string' ? body.level : null,
    deliveryType: delivery,
    durationLabel: typeof body.durationLabel === 'string' ? body.durationLabel : null,
    instructorUserId:
      typeof body.instructorUserId === 'string' ? body.instructorUserId : null,
    status,
    requiresMembership:
      typeof body.requiresMembership === 'boolean' ? body.requiresMembership : false,
    minAge: typeof body.minAge === 'number' ? body.minAge : null,
    maxCapacity: typeof body.maxCapacity === 'number' ? body.maxCapacity : null,
    enrollmentDeadline:
      typeof body.enrollmentDeadline === 'string' ? body.enrollmentDeadline : null,
    prerequisiteCourseId:
      typeof body.prerequisiteCourseId === 'string' ? body.prerequisiteCourseId : null,
    assignmentWeight:
      typeof body.assignmentWeight === 'number' ? body.assignmentWeight : undefined,
    quizWeight: typeof body.quizWeight === 'number' ? body.quizWeight : undefined,
    examWeight: typeof body.examWeight === 'number' ? body.examWeight : undefined,
    attendanceWeight:
      typeof body.attendanceWeight === 'number' ? body.attendanceWeight : undefined,
    passingScore: typeof body.passingScore === 'number' ? body.passingScore : undefined,
    attendanceThreshold:
      typeof body.attendanceThreshold === 'number' ? body.attendanceThreshold : undefined,
    sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : undefined,
  });

  return success(course, 'Course created.', 201);
}
