import { db } from '@/lib/db';
import {
  badRequest,
  conflict,
  forbidden,
  notFound,
  success,
} from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { readJson } from '@/lib/auth/http';
import { canManageMeeting, canViewMeeting } from '@/lib/governance/access';
import { emitGovernanceEvent } from '@/lib/governance/events';
import {
  assertMinutesEditable,
  canTransitionMinutes,
} from '@/lib/governance/workflow';

async function canAccessMeeting(meetingId: string, userId: string, user: Parameters<typeof canViewMeeting>[0]) {
  const meeting = await db.governanceMeeting.findUnique({
    where: { id: meetingId },
    include: { committee: true },
  });
  if (!meeting) return { meeting: null as null, allowed: false };

  const member = await db.member.findFirst({
    where: { userId },
    select: { id: true },
  });
  let isCommitteeMember = false;
  if (meeting.committeeId && member) {
    isCommitteeMember = Boolean(
      await db.committeeMember.findFirst({
        where: {
          committeeId: meeting.committeeId,
          memberId: member.id,
          status: 'active',
        },
        select: { id: true },
      })
    );
  }
  const participant = await db.meetingParticipant.findFirst({
    where: {
      meetingId,
      OR: [{ userId }, ...(member ? [{ memberId: member.id }] : [])],
    },
  });

  const allowed = canViewMeeting(user, meeting, {
    isParticipant: Boolean(participant),
    isCommitteeMember,
  });
  return { meeting, allowed };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminRead(request, 'governance', 'view');
  if (!auth.ok) return auth.error;

  const { id: meetingId } = await context.params;
  const { meeting, allowed } = await canAccessMeeting(meetingId, auth.user.id, auth.user);
  if (!meeting) return notFound('Meeting');
  if (!allowed) return forbidden();

  const latest = await db.meetingMinute.findFirst({
    where: { meetingId },
    orderBy: { version: 'desc' },
  });

  return success(
    latest
      ? {
          id: latest.id,
          meetingId: latest.meetingId,
          version: latest.version,
          summary: latest.summary,
          discussionNotes: latest.discussionNotes,
          status: latest.status,
          authorId: latest.authorId,
          approvedAt: latest.approvedAt?.toISOString() ?? null,
          lockedAt: latest.lockedAt?.toISOString() ?? null,
          amendmentOfId: latest.amendmentOfId,
        }
      : null
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminWrite(request, 'governance', 'update');
  if (!auth.ok) return auth.error;

  const { id: meetingId } = await context.params;
  const meeting = await db.governanceMeeting.findUnique({
    where: { id: meetingId },
    include: { committee: true },
  });
  if (!meeting) return notFound('Meeting');
  if (!canManageMeeting(auth.user, meeting)) return forbidden();

  const body = (await readJson(request)) as Record<string, unknown> | null;
  if (!body) return badRequest('Invalid body.');

  const latest = await db.meetingMinute.findFirst({
    where: { meetingId },
    orderBy: { version: 'desc' },
  });

  const summary = typeof body.summary === 'string' ? body.summary : null;
  const discussionNotes =
    typeof body.discussionNotes === 'string' ? body.discussionNotes : null;

  if (body.amendment === true || body.createAmendment === true) {
    if (!latest) return badRequest('No minutes to amend.');
    const created = await db.meetingMinute.create({
      data: {
        meetingId,
        version: latest.version + 1,
        summary: summary ?? latest.summary,
        discussionNotes: discussionNotes ?? latest.discussionNotes,
        status: 'amendment_pending',
        authorId: auth.user.id,
        amendmentOfId: latest.id,
      },
    });
    return success(created, 'Amendment draft created.', 201);
  }

  if (latest) {
    try {
      assertMinutesEditable(latest.status);
    } catch {
      return conflict('Minutes are immutable. Create an amendment instead.');
    }
    const updated = await db.meetingMinute.update({
      where: { id: latest.id },
      data: {
        ...(summary !== null ? { summary } : {}),
        ...(discussionNotes !== null ? { discussionNotes } : {}),
        authorId: auth.user.id,
      },
    });
    return success(updated, 'Minutes draft updated.');
  }

  const created = await db.meetingMinute.create({
    data: {
      meetingId,
      version: 1,
      summary,
      discussionNotes,
      status: 'draft',
      authorId: auth.user.id,
    },
  });
  return success(created, 'Minutes draft created.', 201);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminWrite(request, 'governance', 'update');
  if (!auth.ok) return auth.error;

  const { id: meetingId } = await context.params;
  const meeting = await db.governanceMeeting.findUnique({
    where: { id: meetingId },
    include: { committee: true },
  });
  if (!meeting) return notFound('Meeting');
  if (!canManageMeeting(auth.user, meeting)) return forbidden();

  const body = (await readJson(request)) as Record<string, unknown> | null;
  if (!body || typeof body.status !== 'string') {
    return badRequest('status is required.');
  }

  const latest = await db.meetingMinute.findFirst({
    where: { meetingId },
    orderBy: { version: 'desc' },
  });
  if (!latest) return notFound('Minutes');

  if (!canTransitionMinutes(latest.status, body.status)) {
    return badRequest(`Cannot transition minutes from ${latest.status} to ${body.status}.`);
  }

  const data: {
    status: never;
    approvedAt?: Date;
    lockedAt?: Date;
  } = { status: body.status as never };

  if (body.status === 'approved') data.approvedAt = new Date();
  if (body.status === 'locked') data.lockedAt = new Date();

  const updated = await db.meetingMinute.update({
    where: { id: latest.id },
    data,
  });

  if (body.status === 'approved') {
    await emitGovernanceEvent({
      type: 'minutes_approved',
      actorId: auth.user.id,
      entityId: updated.id,
      request,
    });
  }
  if (body.status === 'locked') {
    await emitGovernanceEvent({
      type: 'minutes_locked',
      actorId: auth.user.id,
      entityId: updated.id,
      request,
    });
  }

  return success(updated, 'Minutes status updated.');
}
