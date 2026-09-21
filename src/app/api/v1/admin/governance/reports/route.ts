import { db } from '@/lib/db';
import { forbidden, success } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import { canViewReports } from '@/lib/governance/access';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'governance', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewReports(auth.user)) return forbidden();

  const [
    leadershipActive,
    leadershipEnded,
    committeesActive,
    committeesInactive,
    meetingsScheduled,
    meetingsCompleted,
    decisionsTotal,
    decisionsApproved,
    resolutionsTotal,
    resolutionsApproved,
    actionItemsOpen,
    actionItemsCompleted,
    policiesPublished,
    policiesInReview,
    requestsOpen,
    requestsCompleted,
  ] = await Promise.all([
    db.governanceAppointment.count({ where: { status: 'active' } }),
    db.governanceAppointment.count({ where: { status: { in: ['ended', 'replaced'] } } }),
    db.committee.count({ where: { status: 'active', isActive: true } }),
    db.committee.count({ where: { OR: [{ status: 'inactive' }, { isActive: false }] } }),
    db.governanceMeeting.count({
      where: { status: { in: ['draft', 'scheduled', 'in_progress'] } },
    }),
    db.governanceMeeting.count({ where: { status: 'completed' } }),
    db.governanceDecision.count(),
    db.governanceDecision.count({ where: { status: 'approved' } }),
    db.resolution.count(),
    db.resolution.count({ where: { status: 'approved' } }),
    db.governanceActionItem.count({
      where: { status: { in: ['open', 'in_progress', 'blocked'] } },
    }),
    db.governanceActionItem.count({ where: { status: 'completed' } }),
    db.governancePolicy.count({ where: { status: 'published' } }),
    db.governancePolicy.count({ where: { status: { in: ['review', 'approval'] } } }),
    db.administrativeRequest.count({
      where: { status: { in: ['submitted', 'assigned', 'under_review'] } },
    }),
    db.administrativeRequest.count({ where: { status: 'completed' } }),
  ]);

  return success({
    leadership: { active: leadershipActive, ended: leadershipEnded },
    committees: { active: committeesActive, inactive: committeesInactive },
    meetings: { scheduled: meetingsScheduled, completed: meetingsCompleted },
    decisions: { total: decisionsTotal, approved: decisionsApproved },
    resolutions: { total: resolutionsTotal, approved: resolutionsApproved },
    actionItems: { open: actionItemsOpen, completed: actionItemsCompleted },
    policies: { published: policiesPublished, inReview: policiesInReview },
    requests: { open: requestsOpen, completed: requestsCompleted },
  });
}
