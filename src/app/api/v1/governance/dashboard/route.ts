import { db } from '@/lib/db';
import { forbidden, success } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorize';
import { canViewGovernance } from '@/lib/governance/access';
import { serializeCommittee, serializeMeeting } from '@/lib/governance/serialize';

export async function GET(request: Request) {
  const auth = await requirePermission(request, 'governance', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewGovernance(auth.user)) return forbidden();

  const member = await db.member.findFirst({
    where: { userId: auth.user.id },
    select: { id: true },
  });

  const now = new Date();

  const chairedCommittees = await db.committee.findMany({
    where: {
      OR: [{ chairUserId: auth.user.id }, { secretaryUserId: auth.user.id }],
      isActive: true,
    },
    include: { _count: { select: { members: true, meetings: true } } },
  });

  const memberedCommittees = member
    ? await db.committee.findMany({
        where: {
          members: { some: { memberId: member.id, status: 'active' } },
          isActive: true,
        },
        include: { _count: { select: { members: true, meetings: true } } },
      })
    : [];

  const committeeIds = [
    ...new Set([
      ...chairedCommittees.map((c) => c.id),
      ...memberedCommittees.map((c) => c.id),
    ]),
  ];

  const meetings = await db.governanceMeeting.findMany({
    where: {
      OR: [
        { chairUserId: auth.user.id },
        { secretaryUserId: auth.user.id },
        ...(committeeIds.length ? [{ committeeId: { in: committeeIds } }] : []),
        {
          participants: {
            some: {
              OR: [
                { userId: auth.user.id },
                ...(member ? [{ memberId: member.id }] : []),
              ],
            },
          },
        },
      ],
      startsAt: { gte: now },
      status: { in: ['scheduled', 'in_progress', 'draft'] },
    },
    orderBy: { startsAt: 'asc' },
    take: 20,
  });

  const openActionItems = await db.governanceActionItem.findMany({
    where: {
      assigneeUserId: auth.user.id,
      status: { in: ['open', 'in_progress', 'blocked'] },
    },
    orderBy: { dueAt: 'asc' },
    take: 20,
  });

  const pendingRequestAssignments = await db.administrativeRequest.count({
    where: {
      assigneeUserId: auth.user.id,
      status: { in: ['assigned', 'under_review'] },
    },
  });

  const pendingDelegations = await db.approvalDelegation.count({
    where: {
      toUserId: auth.user.id,
      isActive: true,
      startAt: { lte: now },
      OR: [{ endAt: null }, { endAt: { gte: now } }],
    },
  });

  const appointments = member
    ? await db.governanceAppointment.findMany({
        where: { memberId: member.id, status: 'active' },
        include: {
          position: { select: { id: true, title: true, termMonths: true } },
        },
        take: 10,
      })
    : [];

  return success({
    appointments: appointments.map((a) => ({
      id: a.id,
      positionTitle: a.position.title,
      startAt: a.startAt.toISOString(),
      endAt: a.endAt?.toISOString() ?? null,
    })),
    committeesChaired: chairedCommittees.map(serializeCommittee),
    committeesMembered: memberedCommittees.map(serializeCommittee),
    upcomingMeetings: meetings.map(serializeMeeting),
    openActionItems: openActionItems.map((item) => ({
      id: item.id,
      title: item.title,
      status: item.status,
      dueAt: item.dueAt?.toISOString() ?? null,
      priority: item.priority,
    })),
    pendingApprovalsCount: pendingDelegations + pendingRequestAssignments,
  });
}
