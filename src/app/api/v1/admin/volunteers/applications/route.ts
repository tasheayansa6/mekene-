import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { forbidden, paginated, validationError } from '@/lib/api/response';
import { enforceAdminRateLimit, guardAdminRead } from '@/lib/admin/guard';
import { applicationListWhere, canViewVolunteers } from '@/lib/volunteers/access';
import {
  applicationAdminInclude,
  serializeApplication,
} from '@/lib/volunteers/serialize';
import { applicationListSchema, formatZodErrors } from '@/lib/volunteers/validation';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'volunteers', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewVolunteers(auth.user)) return forbidden();
  const limited = enforceAdminRateLimit(request, auth.user.id, 'volunteer-apps');
  if (limited) return limited;

  const url = new URL(request.url);
  const parsed = applicationListSchema.safeParse({
    q: url.searchParams.get('q') || undefined,
    page: url.searchParams.get('page') || 1,
    pageSize: url.searchParams.get('pageSize') || 20,
    status: url.searchParams.get('status') || undefined,
    ministryId: url.searchParams.get('ministryId') || undefined,
    memberId: url.searchParams.get('memberId') || undefined,
    sort: url.searchParams.get('sort') || undefined,
    dir: url.searchParams.get('dir') || undefined,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { q, page, pageSize, status, ministryId, memberId, sort, dir } = parsed.data;
  const and: Prisma.VolunteerApplicationWhereInput[] = [applicationListWhere(auth.user)];
  if (status) and.push({ status });
  if (ministryId) and.push({ ministryId });
  if (memberId) and.push({ memberId });
  if (q) {
    and.push({
      OR: [
        { preferredMinistry: { contains: q } },
        { skills: { contains: q } },
        { member: { displayName: { contains: q } } },
        { member: { membershipNumber: { contains: q } } },
      ],
    });
  }

  const where = { AND: and };
  const orderField = ['createdAt', 'updatedAt', 'submittedAt', 'status'].includes(sort || '')
    ? sort!
    : 'updatedAt';

  const [totalItems, rows] = await Promise.all([
    db.volunteerApplication.count({ where }),
    db.volunteerApplication.findMany({
      where,
      include: applicationAdminInclude,
      orderBy: { [orderField]: dir === 'asc' ? 'asc' : 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return paginated(
    rows.map((row) => serializeApplication(row, { includeReviewNotes: true })),
    { page, pageSize, totalItems }
  );
}
