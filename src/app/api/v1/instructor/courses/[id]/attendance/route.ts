import { db } from '@/lib/db';
import { badRequest, forbidden, notFound, success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';
import { canInstructCourse } from '@/lib/education/access';

async function assertInstructor(
  courseId: string,
  user: Parameters<typeof canInstructCourse>[0]
) {
  const course = await db.educationCourse.findUnique({
    where: { id: courseId },
    select: { id: true, instructorUserId: true },
  });
  if (!course) return { ok: false as const, error: 'not_found' as const };
  if (!canInstructCourse(user, course.instructorUserId)) {
    return { ok: false as const, error: 'forbidden' as const };
  }
  return { ok: true as const, course };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const { id } = await context.params;
  const gate = await assertInstructor(id, auth.user);
  if (!gate.ok) {
    return gate.error === 'not_found' ? notFound('Course not found') : forbidden();
  }

  const sessions = await db.educationClassSession.findMany({
    where: { courseId: id },
    include: {
      attendance: {
        include: {
          member: { select: { id: true, displayName: true, membershipNumber: true } },
        },
      },
    },
    orderBy: { startsAt: 'desc' },
  });

  return success({
    sessions: sessions.map((s) => ({
      id: s.id,
      title: s.title,
      startsAt: s.startsAt.toISOString(),
      endsAt: s.endsAt?.toISOString() ?? null,
      location: s.location,
      onlineUrl: s.onlineUrl,
      deliveryType: s.deliveryType,
      attendance: s.attendance.map((a) => ({
        id: a.id,
        memberId: a.memberId,
        member: a.member,
        status: a.status,
        attendedAt: a.attendedAt.toISOString(),
        notes: a.notes,
      })),
    })),
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const csrf = rejectIfCsrfInvalid(request);
  if (csrf) return csrf;

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const { id } = await context.params;
  const gate = await assertInstructor(id, auth.user);
  if (!gate.ok) {
    return gate.error === 'not_found' ? notFound('Course not found') : forbidden();
  }

  const body = (await readJson(request)) as Record<string, unknown> | null;
  if (!body || typeof body.memberId !== 'string') {
    return badRequest('memberId is required');
  }
  const status =
    body.status === 'present' ||
    body.status === 'late' ||
    body.status === 'excused' ||
    body.status === 'absent'
      ? body.status
      : 'present';
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : null;

  if (sessionId) {
    const session = await db.educationClassSession.findFirst({
      where: { id: sessionId, courseId: id },
    });
    if (!session) return badRequest('Invalid sessionId');
  }

  const row = sessionId
    ? await db.educationAttendance.upsert({
        where: {
          courseId_memberId_sessionId: {
            courseId: id,
            memberId: body.memberId,
            sessionId,
          },
        },
        create: {
          courseId: id,
          memberId: body.memberId,
          sessionId,
          status,
          notes: typeof body.notes === 'string' ? body.notes : null,
        },
        update: {
          status,
          notes: typeof body.notes === 'string' ? body.notes : undefined,
          attendedAt: new Date(),
        },
      })
    : await (async () => {
        const existing = await db.educationAttendance.findFirst({
          where: { courseId: id, memberId: body.memberId, sessionId: null },
        });
        if (existing) {
          return db.educationAttendance.update({
            where: { id: existing.id },
            data: {
              status,
              notes: typeof body.notes === 'string' ? body.notes : undefined,
              attendedAt: new Date(),
            },
          });
        }
        return db.educationAttendance.create({
          data: {
            courseId: id,
            memberId: body.memberId,
            sessionId: null,
            status,
            notes: typeof body.notes === 'string' ? body.notes : null,
          },
        });
      })();

  return success(
    {
      id: row.id,
      courseId: row.courseId,
      memberId: row.memberId,
      sessionId: row.sessionId,
      status: row.status,
      attendedAt: row.attendedAt.toISOString(),
    },
    'Attendance recorded.',
    201
  );
}
