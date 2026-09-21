import { db } from '@/lib/db';
import { forbidden, success, validationError } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import { canViewPastoral, caseListWhere, followUpListWhere, visitListWhere } from '@/lib/pastoral/access';
import { logPastoralAccess } from '@/lib/pastoral/audit';
import { formatZodErrors, pastoralReportsQuerySchema } from '@/lib/pastoral/validation';
import { caseStatusLabel, priorityLabel, visitStatusLabel } from '@/lib/pastoral/status';

/**
 * Aggregates only — never returns note content or case summaries.
 */
export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'pastoral', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewPastoral(auth.user)) return forbidden();

  const url = new URL(request.url);
  const parsed = pastoralReportsQuerySchema.safeParse({
    from: url.searchParams.get('from') || undefined,
    to: url.searchParams.get('to') || undefined,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const to = parsed.data.to ? new Date(parsed.data.to) : new Date();
  const from = parsed.data.from
    ? new Date(parsed.data.from)
    : new Date(to.getTime() - 90 * 24 * 60 * 60_000);

  const caseScope = {
    AND: [caseListWhere(auth.user), { openedAt: { gte: from, lte: to } }],
  };
  const visitScope = {
    AND: [visitListWhere(auth.user), { scheduledAt: { gte: from, lte: to } }],
  };
  const followUpScope = {
    AND: [followUpListWhere(auth.user), { createdAt: { gte: from, lte: to } }],
  };

  const [cases, visits, followUps] = await Promise.all([
    db.pastoralCareCase.findMany({
      where: caseScope,
      select: { status: true, priority: true, categoryId: true },
    }),
    db.pastoralVisit.findMany({
      where: visitScope,
      select: { status: true },
    }),
    db.pastoralFollowUp.findMany({
      where: followUpScope,
      select: { status: true },
    }),
  ]);

  const byStatus = new Map<string, number>();
  const byPriority = new Map<string, number>();
  for (const row of cases) {
    byStatus.set(row.status, (byStatus.get(row.status) || 0) + 1);
    byPriority.set(row.priority, (byPriority.get(row.priority) || 0) + 1);
  }

  const visitByStatus = new Map<string, number>();
  for (const row of visits) {
    visitByStatus.set(row.status, (visitByStatus.get(row.status) || 0) + 1);
  }

  const followUpByStatus = new Map<string, number>();
  for (const row of followUps) {
    followUpByStatus.set(row.status, (followUpByStatus.get(row.status) || 0) + 1);
  }

  await logPastoralAccess({
    actorId: auth.user.id,
    resource: 'pastoral_reports',
    action: 'view',
    request,
  });

  return success({
    range: { from: from.toISOString(), to: to.toISOString() },
    totals: {
      cases: cases.length,
      visits: visits.length,
      followUps: followUps.length,
    },
    casesByStatus: [...byStatus.entries()].map(([status, count]) => ({
      status,
      label: caseStatusLabel(status),
      count,
    })),
    casesByPriority: [...byPriority.entries()].map(([priority, count]) => ({
      priority,
      label: priorityLabel(priority),
      count,
    })),
    visitsByStatus: [...visitByStatus.entries()].map(([status, count]) => ({
      status,
      label: visitStatusLabel(status),
      count,
    })),
    followUpsByStatus: [...followUpByStatus.entries()].map(([status, count]) => ({
      status,
      count,
    })),
  });
}
