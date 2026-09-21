import { db } from '@/lib/db';
import { forbidden, success, validationError } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { readJson } from '@/lib/auth/http';
import { slugify, uniqueSlug } from '@/lib/admin/slug';
import { sanitizePlainText } from '@/lib/content/sanitize';
import {
  canAccessMinistry,
  canManageAssignments,
  canViewVolunteers,
  trainingProgramListWhere,
} from '@/lib/volunteers/access';
import { serializeTrainingProgram } from '@/lib/volunteers/serialize';
import {
  formatZodErrors,
  trainingProgramCreateSchema,
} from '@/lib/volunteers/validation';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'ministries', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewVolunteers(auth.user) && !canManageAssignments(auth.user)) {
    return forbidden();
  }

  const rows = await db.trainingProgram.findMany({
    where: trainingProgramListWhere(auth.user),
    include: {
      ministry: { select: { id: true, name: true, slug: true } },
      _count: { select: { sessions: true } },
    },
    orderBy: { name: 'asc' },
  });

  return success(rows.map(serializeTrainingProgram));
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'ministries', 'assign');
  if (!auth.ok) return auth.error;
  if (!canManageAssignments(auth.user)) return forbidden();

  const parsed = trainingProgramCreateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  if (parsed.data.ministryId) {
    const ministry = await db.ministry.findUnique({
      where: { id: parsed.data.ministryId },
      select: { id: true, leaderUserId: true },
    });
    if (!ministry) return validationError({ ministryId: ['Ministry not found'] });
    if (!canAccessMinistry(auth.user, ministry)) return forbidden();
  }

  const slug =
    parsed.data.slug ||
    (await uniqueSlug(parsed.data.name, async (s) => {
      const hit = await db.trainingProgram.findUnique({ where: { slug: s } });
      return Boolean(hit);
    }));

  const row = await db.trainingProgram.create({
    data: {
      ministryId: parsed.data.ministryId || null,
      name: sanitizePlainText(parsed.data.name, 160),
      slug: slugify(slug),
      description: parsed.data.description
        ? sanitizePlainText(parsed.data.description, 4000)
        : null,
      isActive: parsed.data.isActive ?? true,
    },
    include: {
      ministry: { select: { id: true, name: true, slug: true } },
      _count: { select: { sessions: true } },
    },
  });

  return success(serializeTrainingProgram(row), 'Training program created.', 201);
}
