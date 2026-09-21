import { db } from '@/lib/db';
import { forbidden, notFound, success } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import {
  canManageNotes,
  canViewPastoral,
  caseListWhere,
  followUpListWhere,
  visitListWhere,
} from '@/lib/pastoral/access';
import { logPastoralAccess } from '@/lib/pastoral/audit';
import {
  pastoralCaseListInclude,
  serializeCase,
  serializeFollowUp,
  serializeNote,
  serializeVisit,
} from '@/lib/pastoral/serialize';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminRead(request, 'pastoral', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewPastoral(auth.user)) return forbidden();

  const { id: memberId } = await context.params;
  const member = await db.member.findUnique({
    where: { id: memberId },
    select: { id: true },
  });
  if (!member) return notFound('Member');

  const [cases, visits, followUps] = await Promise.all([
    db.pastoralCareCase.findMany({
      where: { AND: [caseListWhere(auth.user), { memberId }] },
      include: pastoralCaseListInclude,
      orderBy: { updatedAt: 'desc' },
      take: 50,
    }),
    db.pastoralVisit.findMany({
      where: { AND: [visitListWhere(auth.user), { memberId }] },
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
      orderBy: { scheduledAt: 'desc' },
      take: 50,
    }),
    db.pastoralFollowUp.findMany({
      where: { AND: [followUpListWhere(auth.user), { memberId }] },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 50,
    }),
  ]);

  let notes: ReturnType<typeof serializeNote>[] = [];
  if (canManageNotes(auth.user) && cases.length) {
    const noteRows = await db.pastoralCareNote.findMany({
      where: { caseId: { in: cases.map((c) => c.id) } },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { author: { select: { id: true, firstName: true, lastName: true } } },
    });
    notes = noteRows.map(serializeNote);
  }

  await logPastoralAccess({
    actorId: auth.user.id,
    resource: 'member_care',
    resourceId: memberId,
    action: 'view',
    request,
  });

  return success({
    memberId,
    cases: cases.map((row) => serializeCase(row)),
    visits: visits.map(serializeVisit),
    followUps: followUps.map(serializeFollowUp),
    notes,
  });
}
