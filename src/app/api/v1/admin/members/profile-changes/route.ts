import { db } from '@/lib/db';
import { forbidden, paginated, validationError } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import { canModerateApplications, canViewMembers } from '@/lib/members/access';
import { serializeProfileChangeRequest } from '@/lib/pastoral/serialize';
import { formatZodErrors, profileChangeListSchema } from '@/lib/pastoral/validation';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'members', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewMembers(auth.user)) return forbidden();
  if (!canModerateApplications(auth.user)) return forbidden();

  const url = new URL(request.url);
  const parsed = profileChangeListSchema.safeParse({
    q: url.searchParams.get('q') || undefined,
    page: url.searchParams.get('page') || 1,
    pageSize: url.searchParams.get('pageSize') || 20,
    status: url.searchParams.get('status') || undefined,
    memberId: url.searchParams.get('memberId') || undefined,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { page, pageSize, status, memberId } = parsed.data;
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (memberId) where.memberId = memberId;

  const [totalItems, rows] = await Promise.all([
    db.memberProfileChangeRequest.count({ where }),
    db.memberProfileChangeRequest.findMany({
      where,
      include: {
        requestedBy: { select: { id: true, firstName: true, lastName: true } },
        reviewedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return paginated(
    rows.map(serializeProfileChangeRequest),
    { page, pageSize, totalItems }
  );
}
