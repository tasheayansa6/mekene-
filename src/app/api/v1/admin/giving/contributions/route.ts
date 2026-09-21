import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { error, forbidden, paginated, success, validationError } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { formatZodErrors } from '@/lib/auth/validation';
import { readJson } from '@/lib/auth/http';
import { canCreateGiving, canViewGiving } from '@/lib/giving/access';
import {
  contributionListQuerySchema,
  offlineContributionSchema,
} from '@/lib/giving/validation';
import { CONTRIBUTION_STATUSES } from '@/lib/giving/status';
import { serializeContribution } from '@/lib/giving/serialize';
import {
  contributionInclude,
  createOfflineContribution,
} from '@/lib/giving/write';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'giving', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewGiving(auth.user)) return forbidden();

  const url = new URL(request.url);
  const parsed = contributionListQuerySchema.safeParse({
    q: url.searchParams.get('q') || undefined,
    status: url.searchParams.get('status') || undefined,
    paymentMethod: url.searchParams.get('paymentMethod') || undefined,
    categoryId: url.searchParams.get('categoryId') || undefined,
    campaignId: url.searchParams.get('campaignId') || undefined,
    from: url.searchParams.get('from') || undefined,
    to: url.searchParams.get('to') || undefined,
    page: url.searchParams.get('page') || 1,
    pageSize: url.searchParams.get('pageSize') || 20,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { q, status, paymentMethod, categoryId, campaignId, from, to, page, pageSize } =
    parsed.data;
  const and: Prisma.ContributionWhereInput[] = [];
  if (status && (CONTRIBUTION_STATUSES as readonly string[]).includes(status)) {
    and.push({ status: status as (typeof CONTRIBUTION_STATUSES)[number] });
  }
  if (paymentMethod) and.push({ paymentMethod });
  if (categoryId) and.push({ categoryId });
  if (campaignId) and.push({ campaignId });
  if (from) {
    const date = new Date(from);
    if (!Number.isNaN(date.getTime())) and.push({ createdAt: { gte: date } });
  }
  if (to) {
    const date = new Date(to);
    if (!Number.isNaN(date.getTime())) and.push({ createdAt: { lte: date } });
  }
  if (q) {
    and.push({
      OR: [
        { reference: { contains: q } },
        { receiptNumber: { contains: q } },
        { guestName: { contains: q } },
        { offlineReference: { contains: q } },
        { user: { email: { contains: q } } },
        { user: { firstName: { contains: q } } },
        { user: { lastName: { contains: q } } },
      ],
    });
  }

  const where: Prisma.ContributionWhereInput = and.length ? { AND: and } : {};
  const [totalItems, rows] = await Promise.all([
    db.contribution.count({ where }),
    db.contribution.findMany({
      where,
      include: contributionInclude,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return paginated(rows.map((row) => serializeContribution(row)), {
    page,
    pageSize,
    totalItems,
  });
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'giving', 'create');
  if (!auth.ok) return auth.error;
  if (!canCreateGiving(auth.user)) return forbidden();

  const parsed = offlineContributionSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const result = await createOfflineContribution({
    ...parsed.data,
    recordedById: auth.user.id,
    request,
  });
  if (!result.ok) return error(result.error, 400);

  return success(
    { contribution: serializeContribution(result.contribution) },
    'Offline contribution recorded.',
    201
  );
}
