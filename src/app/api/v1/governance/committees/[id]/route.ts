import { db } from '@/lib/db';
import { forbidden, notFound, success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { canViewCommittee, isGlobalGovernanceAdmin } from '@/lib/governance/access';
import { hasPermission } from '@/lib/auth/permissions';
import { serializeCommittee, serializeMeeting } from '@/lib/governance/serialize';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const { id } = await context.params;
  const committee = await db.committee.findUnique({
    where: { id },
    include: {
      _count: { select: { members: true, meetings: true } },
      members: {
        where: { status: 'active' },
        include: {
          member: {
            select: {
              id: true,
              displayName: true,
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
        take: 50,
      },
    },
  });
  if (!committee) return notFound('Committee');

  const member = await db.member.findFirst({
    where: { userId: auth.user.id },
    select: { id: true },
  });
  const isActiveMember = Boolean(
    member && committee.members.some((m) => m.memberId === member.id)
  );

  const adminListScope =
    isGlobalGovernanceAdmin(auth.user) ||
    hasPermission(auth.user, 'governance', 'view') ||
    hasPermission(auth.user, 'governance', 'manage');

  if (
    !canViewCommittee(auth.user, committee, {
      isActiveMember,
      adminListScope,
    })
  ) {
    return forbidden();
  }

  const now = new Date();
  const [upcomingMeetings, openActionItems, recentDecisions] = await Promise.all([
    db.governanceMeeting.findMany({
      where: {
        committeeId: id,
        startsAt: { gte: now },
        status: { in: ['scheduled', 'in_progress', 'draft'] },
      },
      orderBy: { startsAt: 'asc' },
      take: 10,
    }),
    db.governanceActionItem.findMany({
      where: {
        committeeId: id,
        status: { in: ['open', 'in_progress', 'blocked'] },
      },
      orderBy: { dueAt: 'asc' },
      take: 15,
    }),
    db.governanceDecision.findMany({
      where: { committeeId: id },
      orderBy: { decisionDate: 'desc' },
      take: 10,
    }),
  ]);

  return success({
    committee: serializeCommittee(committee),
    members: committee.members.map((m) => ({
      id: m.id,
      memberId: m.memberId,
      roleLabel: m.roleLabel,
      name:
        m.member.displayName ||
        [m.member.user?.firstName, m.member.user?.lastName].filter(Boolean).join(' ') ||
        null,
    })),
    upcomingMeetings: upcomingMeetings.map(serializeMeeting),
    openActionItems: openActionItems.map((item) => ({
      id: item.id,
      title: item.title,
      status: item.status,
      dueAt: item.dueAt?.toISOString() ?? null,
      assigneeUserId: item.assigneeUserId,
    })),
    recentDecisions: recentDecisions.map((d) => ({
      id: d.id,
      title: d.title,
      status: d.status,
      decisionDate: d.decisionDate.toISOString(),
    })),
  });
}
