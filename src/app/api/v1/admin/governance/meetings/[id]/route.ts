import { db } from '@/lib/db';
import { badRequest, forbidden, notFound, success } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { readJson } from '@/lib/auth/http';
import {
  canManageMeeting,
  canViewMeeting,
} from '@/lib/governance/access';
import { evaluateQuorum, isPresentAttendance } from '@/lib/governance/quorum';
import { serializeMeeting } from '@/lib/governance/serialize';
import { isOneOf, MEETING_STATUSES } from '@/lib/governance/status';

async function meetingAccessContext(meetingId: string, userId: string) {
  const meeting = await db.governanceMeeting.findUnique({
    where: { id: meetingId },
    include: {
      committee: true,
      agendaItems: { orderBy: { sortOrder: 'asc' } },
      participants: true,
    },
  });
  if (!meeting) return null;

  const member = await db.member.findFirst({
    where: { userId },
    select: { id: true },
  });

  let isCommitteeMember = false;
  if (meeting.committeeId && member) {
    const cm = await db.committeeMember.findFirst({
      where: {
        committeeId: meeting.committeeId,
        memberId: member.id,
        status: 'active',
      },
      select: { id: true },
    });
    isCommitteeMember = Boolean(cm);
  }

  const isParticipant = meeting.participants.some(
    (p) => p.userId === userId || (member && p.memberId === member.id)
  );

  return { meeting, isCommitteeMember, isParticipant, member };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminRead(request, 'governance', 'view');
  if (!auth.ok) return auth.error;

  const { id } = await context.params;
  const ctx = await meetingAccessContext(id, auth.user.id);
  if (!ctx) return notFound('Meeting');

  if (
    !canViewMeeting(auth.user, ctx.meeting, {
      isParticipant: ctx.isParticipant,
      isCommitteeMember: ctx.isCommitteeMember,
    })
  ) {
    return forbidden();
  }

  const eligible = ctx.meeting.participants.filter((p) => p.isEligible);
  const present = eligible.filter((p) => isPresentAttendance(p.attendance));
  const quorum = evaluateQuorum(
    {
      quorumCount: ctx.meeting.quorumCount ?? ctx.meeting.committee?.quorumCount,
      quorumPercent: ctx.meeting.quorumPercent ?? ctx.meeting.committee?.quorumPercent,
      autoValidateLegal: ctx.meeting.autoValidateLegal,
    },
    eligible.length,
    present.length
  );

  return success({
    ...serializeMeeting(ctx.meeting),
    agenda: ctx.meeting.agendaItems.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      presenterId: item.presenterId,
      priority: item.priority,
      sortOrder: item.sortOrder,
      durationMin: item.durationMin,
      status: item.status,
      attachmentUrl: item.attachmentUrl,
    })),
    participants: ctx.meeting.participants.map((p) => ({
      id: p.id,
      memberId: p.memberId,
      userId: p.userId,
      displayName: p.displayName,
      attendance: p.attendance,
      isEligible: p.isEligible,
      notes: p.notes,
    })),
    quorum,
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminWrite(request, 'governance', 'update');
  if (!auth.ok) return auth.error;

  const { id } = await context.params;
  const meeting = await db.governanceMeeting.findUnique({
    where: { id },
    include: { committee: true },
  });
  if (!meeting) return notFound('Meeting');
  if (!canManageMeeting(auth.user, meeting)) return forbidden();

  const body = (await readJson(request)) as Record<string, unknown> | null;
  if (!body) return badRequest('Invalid body.');

  const data: Record<string, unknown> = {};
  if (typeof body.title === 'string') data.title = body.title.trim();
  if (typeof body.status === 'string' && isOneOf(body.status, MEETING_STATUSES)) {
    data.status = body.status;
  }
  if (typeof body.startsAt === 'string') {
    const startsAt = new Date(body.startsAt);
    if (Number.isNaN(startsAt.getTime())) return badRequest('Invalid startsAt.');
    data.startsAt = startsAt;
  }
  if (typeof body.endsAt === 'string' || body.endsAt === null) {
    data.endsAt = body.endsAt ? new Date(body.endsAt as string) : null;
  }
  if (typeof body.location === 'string' || body.location === null) {
    data.location = body.location;
  }
  if (typeof body.onlineUrl === 'string' || body.onlineUrl === null) {
    data.onlineUrl = body.onlineUrl;
  }
  if (typeof body.chairUserId === 'string' || body.chairUserId === null) {
    data.chairUserId = body.chairUserId;
  }
  if (typeof body.secretaryUserId === 'string' || body.secretaryUserId === null) {
    data.secretaryUserId = body.secretaryUserId;
  }
  if (typeof body.quorumCount === 'number' || body.quorumCount === null) {
    data.quorumCount = body.quorumCount;
  }
  if (typeof body.quorumPercent === 'number' || body.quorumPercent === null) {
    data.quorumPercent = body.quorumPercent;
  }
  if (typeof body.votingMethod === 'string' || body.votingMethod === null) {
    data.votingMethod = body.votingMethod;
  }
  if (typeof body.votingClosed === 'boolean') data.votingClosed = body.votingClosed;

  const updated = await db.governanceMeeting.update({
    where: { id },
    data,
  });

  return success(serializeMeeting(updated), 'Meeting updated.');
}
