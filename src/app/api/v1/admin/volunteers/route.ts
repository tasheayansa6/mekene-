import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { forbidden, paginated, validationError } from '@/lib/api/response';
import { enforceAdminRateLimit, guardAdminRead } from '@/lib/admin/guard';
import { canViewVolunteers } from '@/lib/volunteers/access';
import {
  serializeVolunteerProfile,
  volunteerProfileInclude,
} from '@/lib/volunteers/serialize';
import { formatZodErrors, volunteerListSchema } from '@/lib/volunteers/validation';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'volunteers', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewVolunteers(auth.user)) return forbidden();
  const limited = enforceAdminRateLimit(request, auth.user.id, 'volunteers');
  if (limited) return limited;

  const url = new URL(request.url);
  const parsed = volunteerListSchema.safeParse({
    q: url.searchParams.get('q') || undefined,
    page: url.searchParams.get('page') || 1,
    pageSize: url.searchParams.get('pageSize') || 20,
    status: url.searchParams.get('status') || undefined,
    sort: url.searchParams.get('sort') || undefined,
    dir: url.searchParams.get('dir') || undefined,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { q, page, pageSize, status, sort, dir } = parsed.data;
  const and: Prisma.VolunteerProfileWhereInput[] = [];

  if (auth.user.role.slug === 'ministry_leader') {
    and.push({
      member: {
        ministries: {
          some: { ministry: { leaderUserId: auth.user.id } },
        },
      },
    });
  }

  if (status) and.push({ status });
  if (q) {
    and.push({
      OR: [
        { member: { displayName: { contains: q } } },
        { member: { membershipNumber: { contains: q } } },
        { member: { user: { firstName: { contains: q } } } },
        { member: { user: { lastName: { contains: q } } } },
      ],
    });
  }

  const where: Prisma.VolunteerProfileWhereInput = and.length ? { AND: and } : {};
  const orderField = ['createdAt', 'updatedAt', 'status', 'joinedAt'].includes(sort || '')
    ? sort!
    : 'updatedAt';

  const [totalItems, rows] = await Promise.all([
    db.volunteerProfile.count({ where }),
    db.volunteerProfile.findMany({
      where,
      include: volunteerProfileInclude,
      orderBy: { [orderField]: dir === 'asc' ? 'asc' : 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return paginated(rows.map(serializeVolunteerProfile), { page, pageSize, totalItems });
}
