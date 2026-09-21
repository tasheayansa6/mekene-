import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { forbidden, paginated, validationError } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import { formatZodErrors } from '@/lib/auth/validation';
import { canViewMembers, memberListWhere } from '@/lib/members/access';
import { memberListQuerySchema } from '@/lib/members/validation';
import { serializeMemberList } from '@/lib/members/serialize';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'members', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewMembers(auth.user)) return forbidden();

  const url = new URL(request.url);
  const parsed = memberListQuerySchema.safeParse({
    q: url.searchParams.get('q') || undefined,
    status: url.searchParams.get('status') || undefined,
    householdId: url.searchParams.get('householdId') || undefined,
    ministryId: url.searchParams.get('ministryId') || undefined,
    from: url.searchParams.get('from') || undefined,
    to: url.searchParams.get('to') || undefined,
    sort: url.searchParams.get('sort') || undefined,
    dir: url.searchParams.get('dir') || undefined,
    page: url.searchParams.get('page') || 1,
    pageSize: url.searchParams.get('pageSize') || 20,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { q, status, householdId, ministryId, from, to, sort, dir, page, pageSize } = parsed.data;
  const and: Prisma.MemberWhereInput[] = [memberListWhere(auth.user)];

  if (q) {
    and.push({
      OR: [
        { membershipNumber: { contains: q } },
        { displayName: { contains: q } },
        { user: { firstName: { contains: q } } },
        { user: { lastName: { contains: q } } },
        { user: { email: { contains: q } } },
      ],
    });
  }
  if (status) and.push({ status });
  if (householdId) and.push({ householdId });
  if (ministryId) and.push({ ministries: { some: { ministryId } } });
  if (from) {
    const date = new Date(from);
    if (!Number.isNaN(date.getTime())) and.push({ dateJoined: { gte: date } });
  }
  if (to) {
    const date = new Date(to);
    if (!Number.isNaN(date.getTime())) and.push({ dateJoined: { lte: date } });
  }

  const where: Prisma.MemberWhereInput = { AND: and };
  const orderField = sort || 'updatedAt';

  const [totalItems, rows] = await Promise.all([
    db.member.count({ where }),
    db.member.findMany({
      where,
      include: {
        user: { select: { firstName: true, lastName: true } },
        household: { select: { id: true, name: true } },
      },
      orderBy: { [orderField]: dir === 'asc' ? 'asc' : 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return paginated(rows.map(serializeMemberList), { page, pageSize, totalItems });
}
