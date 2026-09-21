import { db } from '@/lib/db';
import { forbidden, success, validationError } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { readJson } from '@/lib/auth/http';
import { sanitizePlainText } from '@/lib/content/sanitize';
import {
  canAccessMinistry,
  canManageAssignments,
  canViewVolunteers,
  trainingProgramListWhere,
} from '@/lib/volunteers/access';
import { serializeTrainingSession } from '@/lib/volunteers/serialize';
import {
  formatZodErrors,
  trainingSessionCreateSchema,
} from '@/lib/volunteers/validation';
import { SEATED_ENROLLMENT_STATUSES } from '@/lib/volunteers/status';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'ministries', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewVolunteers(auth.user) && !canManageAssignments(auth.user)) {
    return forbidden();
  }

  const programId = new URL(request.url).searchParams.get('programId') || undefined;

  const rows = await db.trainingSession.findMany({
    where: {
      ...(programId ? { programId } : {}),
      program: trainingProgramListWhere(auth.user),
    },
    include: {
      program: { select: { id: true, name: true, slug: true } },
      instructor: { select: { id: true, firstName: true, lastName: true } },
      _count: {
        select: {
          enrollments: { where: { status: { in: [...SEATED_ENROLLMENT_STATUSES] } } },
          waitlist: true,
        },
      },
    },
    orderBy: { startsAt: 'asc' },
    take: 100,
  });

  return success(rows.map(serializeTrainingSession));
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'ministries', 'assign');
  if (!auth.ok) return auth.error;
  if (!canManageAssignments(auth.user)) return forbidden();

  const parsed = trainingSessionCreateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const program = await db.trainingProgram.findUnique({
    where: { id: parsed.data.programId },
    include: { ministry: { select: { id: true, leaderUserId: true } } },
  });
  if (!program) return validationError({ programId: ['Program not found'] });
  if (program.ministry && !canAccessMinistry(auth.user, program.ministry)) {
    return forbidden();
  }
  if (
    auth.user.role.slug === 'ministry_leader' &&
    program.ministryId &&
    program.ministry?.leaderUserId !== auth.user.id
  ) {
    return forbidden();
  }

  const startsAt = new Date(parsed.data.startsAt);
  if (Number.isNaN(startsAt.getTime())) {
    return validationError({ startsAt: ['Invalid date'] });
  }
  const endsAt = parsed.data.endsAt ? new Date(parsed.data.endsAt) : null;
  if (endsAt && Number.isNaN(endsAt.getTime())) {
    return validationError({ endsAt: ['Invalid date'] });
  }

  const row = await db.trainingSession.create({
    data: {
      programId: parsed.data.programId,
      title: sanitizePlainText(parsed.data.title, 160),
      startsAt,
      endsAt,
      location: parsed.data.location
        ? sanitizePlainText(parsed.data.location, 200)
        : null,
      capacity: parsed.data.capacity ?? null,
      instructorId: parsed.data.instructorId || null,
      status: parsed.data.status || 'scheduled',
    },
    include: {
      program: { select: { id: true, name: true, slug: true } },
      instructor: { select: { id: true, firstName: true, lastName: true } },
      _count: { select: { enrollments: true, waitlist: true } },
    },
  });

  return success(serializeTrainingSession(row), 'Training session created.', 201);
}
