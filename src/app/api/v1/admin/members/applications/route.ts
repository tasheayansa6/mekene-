import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { forbidden, paginated, validationError } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import { formatZodErrors } from '@/lib/auth/validation';
import { canModerateApplications } from '@/lib/members/access';
import { applicationListQuerySchema } from '@/lib/members/validation';
import { serializeApplicationAdminList } from '@/lib/members/serialize';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'members', 'view');
  if (!auth.ok) return auth.error;
  if (!canModerateApplications(auth.user)) return forbidden();

  const url = new URL(request.url);
  const parsed = applicationListQuerySchema.safeParse({
    q: url.searchParams.get('q') || undefined,
    status: url.searchParams.get('status') || undefined,
    pending: url.searchParams.get('pending') || undefined,
    from: url.searchParams.get('from') || undefined,
    to: url.searchParams.get('to') || undefined,
    page: url.searchParams.get('page') || 1,
    pageSize: url.searchParams.get('pageSize') || 20,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { q, status, pending, from, to, page, pageSize } = parsed.data;
  const and: Prisma.MembershipApplicationWhereInput[] = [];
  if (q) {
    and.push({
      OR: [
        { fullName: { contains: q } },
        { user: { firstName: { contains: q } } },
        { user: { lastName: { contains: q } } },
        { user: { email: { contains: q } } },
      ],
    });
  }
  if (status) and.push({ status });
  else if (pending) {
    and.push({ status: { in: ['submitted', 'under_review', 'resubmitted'] } });
  }
  if (from) {
    const date = new Date(from);
    if (!Number.isNaN(date.getTime())) and.push({ submittedAt: { gte: date } });
  }
  if (to) {
    const date = new Date(to);
    if (!Number.isNaN(date.getTime())) and.push({ submittedAt: { lte: date } });
  }

  const where: Prisma.MembershipApplicationWhereInput = and.length ? { AND: and } : {};

  const [totalItems, rows] = await Promise.all([
    db.membershipApplication.count({ where }),
    db.membershipApplication.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        reviewedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { submittedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return paginated(rows.map(serializeApplicationAdminList), { page, pageSize, totalItems });
}
