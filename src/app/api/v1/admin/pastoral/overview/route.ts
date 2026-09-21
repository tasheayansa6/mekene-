import { db } from '@/lib/db';
import { forbidden, success } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import { canViewPastoral, caseListWhere, followUpListWhere, visitListWhere } from '@/lib/pastoral/access';
import { logPastoralAccess } from '@/lib/pastoral/audit';
import { serializeCase, serializeFollowUp, serializeVisit } from '@/lib/pastoral/serialize';
import { pastoralCaseListInclude } from '@/lib/pastoral/serialize';
import { OPEN_CASE_STATUSES } from '@/lib/pastoral/status';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'pastoral', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewPastoral(auth.user)) return forbidden();

  const caseScope = caseListWhere(auth.user);
  const visitScope = visitListWhere(auth.user);
  const followUpScope = followUpListWhere(auth.user);
  const now = new Date();

  const [
    openCases,
    highPriority,
    upcomingVisits,
    overdueFollowUps,
    recentCases,
    nextVisits,
    dueFollowUps,
  ] = await Promise.all([
    db.pastoralCareCase.count({
      where: { AND: [caseScope, { status: { in: [...OPEN_CASE_STATUSES] } }] },
    }),
    db.pastoralCareCase.count({
      where: { AND: [caseScope, { priority: 'high', status: { in: [...OPEN_CASE_STATUSES] } }] },
    }),
    db.pastoralVisit.count({
      where: {
        AND: [
          visitScope,
          { status: { in: ['scheduled', 'confirmed'] }, scheduledAt: { gte: now } },
        ],
      },
    }),
    db.pastoralFollowUp.count({
      where: {
        AND: [
          followUpScope,
          {
            status: { in: ['pending', 'in_progress'] },
            dueDate: { lt: now },
          },
        ],
      },
    }),
    db.pastoralCareCase.findMany({
      where: caseScope,
      include: pastoralCaseListInclude,
      orderBy: { updatedAt: 'desc' },
      take: 8,
    }),
    db.pastoralVisit.findMany({
      where: {
        AND: [
          visitScope,
          { status: { in: ['scheduled', 'confirmed'] }, scheduledAt: { gte: now } },
        ],
      },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        member: {
          select: {
            id: true,
            membershipNumber: true,
            displayName: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 8,
    }),
    db.pastoralFollowUp.findMany({
      where: {
        AND: [
          followUpScope,
          { status: { in: ['pending', 'in_progress'] } },
        ],
      },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 8,
    }),
  ]);

  await logPastoralAccess({
    actorId: auth.user.id,
    resource: 'pastoral_overview',
    action: 'view',
    request,
  });

  return success({
    counts: {
      openCases,
      highPriority,
      upcomingVisits,
      overdueFollowUps,
    },
    recentCases: recentCases.map((row) => serializeCase(row)),
    nextVisits: nextVisits.map(serializeVisit),
    dueFollowUps: dueFollowUps.map(serializeFollowUp),
  });
}
