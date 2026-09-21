import { db } from '@/lib/db';
import { forbidden, paginated } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import { canViewGovernance } from '@/lib/governance/access';
import { serializeAppointment } from '@/lib/governance/serialize';

const appointmentInclude = {
  position: { select: { id: true, title: true, termMonths: true } },
  member: {
    select: {
      id: true,
      displayName: true,
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  },
} as const;

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'governance', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewGovernance(auth.user)) return forbidden();

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') || 20)));
  const memberId = url.searchParams.get('memberId') || undefined;
  const positionId = url.searchParams.get('positionId') || undefined;

  const where = {
    ...(memberId ? { memberId } : {}),
    ...(positionId ? { positionId } : {}),
  };

  const [totalItems, rows] = await Promise.all([
    db.governanceAppointment.count({ where }),
    db.governanceAppointment.findMany({
      where,
      include: appointmentInclude,
      orderBy: { startAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return paginated(
    rows.map((row) =>
      serializeAppointment({
        ...row,
        member: row.member
          ? {
              id: row.member.id,
              firstName: row.member.user?.firstName ?? row.member.displayName,
              lastName: row.member.user?.lastName ?? null,
              email: row.member.user?.email ?? null,
            }
          : null,
      })
    ),
    { page, pageSize, totalItems }
  );
}
