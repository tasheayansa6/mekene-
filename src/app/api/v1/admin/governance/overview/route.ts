import { db } from '@/lib/db';
import { forbidden, success } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import { canViewGovernance } from '@/lib/governance/access';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'governance', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewGovernance(auth.user)) return forbidden();

  const now = new Date();

  const [
    leadershipActive,
    committees,
    upcomingMeetings,
    openActionItems,
    pendingRequests,
    policiesAwaitingApproval,
    recentDecisions,
  ] = await Promise.all([
    db.governanceAppointment.count({ where: { status: 'active' } }),
    db.committee.count({ where: { isActive: true, status: 'active' } }),
    db.governanceMeeting.count({
      where: {
        startsAt: { gte: now },
        status: { in: ['draft', 'scheduled', 'in_progress'] },
      },
    }),
    db.governanceActionItem.count({
      where: { status: { in: ['open', 'in_progress', 'blocked'] } },
    }),
    db.administrativeRequest.count({
      where: { status: { in: ['submitted', 'assigned', 'under_review'] } },
    }),
    db.governancePolicy.count({
      where: { status: { in: ['review', 'approval'] } },
    }),
    db.governanceDecision.findMany({
      orderBy: { decisionDate: 'desc' },
      take: 8,
      select: {
        id: true,
        title: true,
        status: true,
        decisionDate: true,
        committeeId: true,
      },
    }),
  ]);

  return success({
    counts: {
      leadershipActive,
      committees,
      upcomingMeetings,
      openActionItems,
      pendingRequests,
      policiesAwaitingApproval,
    },
    recentDecisions: recentDecisions.map((d) => ({
      id: d.id,
      title: d.title,
      status: d.status,
      decisionDate: d.decisionDate.toISOString(),
      committeeId: d.committeeId,
    })),
  });
}
