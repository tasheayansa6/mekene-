import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { forbidden, paginated, success, validationError } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { readJson } from '@/lib/auth/http';
import { slugify, uniqueSlug } from '@/lib/admin/slug';
import { sanitizePlainText } from '@/lib/content/sanitize';
import {
  canAccessMinistry,
  canManageAssignments,
  canViewVolunteers,
  teamListWhere,
} from '@/lib/volunteers/access';
import { serializeTeam, teamInclude } from '@/lib/volunteers/serialize';
import {
  formatZodErrors,
  teamCreateSchema,
  teamListSchema,
} from '@/lib/volunteers/validation';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'ministries', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewVolunteers(auth.user) && !canManageAssignments(auth.user)) {
    return forbidden();
  }

  const url = new URL(request.url);
  const parsed = teamListSchema.safeParse({
    q: url.searchParams.get('q') || undefined,
    page: url.searchParams.get('page') || 1,
    pageSize: url.searchParams.get('pageSize') || 20,
    ministryId: url.searchParams.get('ministryId') || undefined,
    isActive: url.searchParams.get('isActive') || undefined,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { q, page, pageSize, ministryId, isActive } = parsed.data;
  const and: Prisma.MinistryTeamWhereInput[] = [teamListWhere(auth.user)];
  if (ministryId) and.push({ ministryId });
  if (isActive === 'true') and.push({ isActive: true });
  if (isActive === 'false') and.push({ isActive: false });
  if (q) {
    and.push({
      OR: [{ name: { contains: q } }, { description: { contains: q } }],
    });
  }

  const where = { AND: and };
  const [totalItems, rows] = await Promise.all([
    db.ministryTeam.count({ where }),
    db.ministryTeam.findMany({
      where,
      include: teamInclude,
      orderBy: { name: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return paginated(rows.map(serializeTeam), { page, pageSize, totalItems });
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'ministries', 'assign');
  if (!auth.ok) return auth.error;
  if (!canManageAssignments(auth.user)) return forbidden();

  const parsed = teamCreateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const ministry = await db.ministry.findUnique({
    where: { id: parsed.data.ministryId },
    select: { id: true, leaderUserId: true },
  });
  if (!ministry) return validationError({ ministryId: ['Ministry not found'] });
  if (!canAccessMinistry(auth.user, ministry)) return forbidden();

  const slug =
    parsed.data.slug ||
    (await uniqueSlug(parsed.data.name, async (s) => {
      const hit = await db.ministryTeam.findUnique({
        where: {
          ministryId_slug: { ministryId: parsed.data.ministryId, slug: s },
        },
      });
      return Boolean(hit);
    }));

  const row = await db.ministryTeam.create({
    data: {
      ministryId: parsed.data.ministryId,
      name: sanitizePlainText(parsed.data.name, 120),
      slug: slugify(slug),
      description: parsed.data.description
        ? sanitizePlainText(parsed.data.description, 2000)
        : null,
      leaderUserId: parsed.data.leaderUserId || null,
      assistantLeaderUserId: parsed.data.assistantLeaderUserId || null,
      departmentId: parsed.data.departmentId || null,
      isActive: parsed.data.isActive ?? true,
    },
    include: teamInclude,
  });

  return success(serializeTeam(row), 'Ministry team created.', 201);
}
