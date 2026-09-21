import { db } from '@/lib/db';
import { forbidden, success } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import { canViewMembers, memberListWhere } from '@/lib/members/access';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'members', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewMembers(auth.user)) return forbidden();

  const scoped = memberListWhere(auth.user);
  const [
    active,
    applications,
    pendingApps,
    families,
    transfers,
    inactive,
  ] = await Promise.all([
    db.member.count({ where: { ...scoped, status: { in: ['active', 'approved'] } } }),
    db.membershipApplication.count({
      where: { status: { in: ['submitted', 'under_review', 'resubmitted', 'needs_information'] } },
    }),
    db.membershipApplication.count({
      where: { status: { in: ['submitted', 'under_review', 'resubmitted'] } },
    }),
    db.household.count({ where: { status: 'active' } }),
    db.membershipTransfer.count({
      where: { status: { in: ['requested', 'under_review', 'approved'] } },
    }),
    db.member.count({ where: { ...scoped, status: { in: ['inactive', 'suspended'] } } }),
  ]);

  const byType = await db.member.groupBy({
    by: ['membershipTypeId'],
    where: { ...scoped, status: { in: ['active', 'approved'] } },
    _count: { _all: true },
  });

  return success({
    cards: {
      activeMembers: active,
      openApplications: applications,
      pendingApprovals: pendingApps,
      families,
      openTransfers: transfers,
      inactiveMembers: inactive,
    },
    membershipTypeCounts: byType.map((row) => ({
      membershipTypeId: row.membershipTypeId,
      count: row._count._all,
    })),
  });
}
