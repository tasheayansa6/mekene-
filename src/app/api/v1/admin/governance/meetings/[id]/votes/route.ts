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
import {
  canManageMeeting,
  canViewMeeting,
} from '@/lib/governance/access';
import { emitGovernanceEvent } from '@/lib/governance/events';
import {
  assertVotingOpen,
  evaluateVoteResult,
  tallyVotes,
} from '@/lib/governance/voting';
import { isOneOf, VOTE_CHOICES } from '@/lib/governance/status';

async function loadMeetingForAccess(meetingId: string, userId: string) {
  const meeting = await db.governanceMeeting.findUnique({
    where: { id: meetingId },
    include: { committee: true },
  });
  if (!meeting) return null;

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

  return { meeting, member, participant, isCommitteeMember };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminRead(request, 'governance', 'view');
  if (!auth.ok) return auth.error;

  const { id: meetingId } = await context.params;
  const ctx = await loadMeetingForAccess(meetingId, auth.user.id);
  if (!ctx) return notFound('Meeting');
  if (
    !canViewMeeting(auth.user, ctx.meeting, {
      isParticipant: Boolean(ctx.participant),
      isCommitteeMember: ctx.isCommitteeMember,
    })
  ) {
    return forbidden();
  }

  const url = new URL(request.url);
  const resolutionId = url.searchParams.get('resolutionId') || null;

  const votes = await db.governanceVote.findMany({
    where: {
      meetingId,
      ...(resolutionId ? { resolutionId } : { resolutionId: null }),
    },
  });

  const tally = tallyVotes(votes.map((v) => v.choice));
  const eligibleVoters = await db.meetingParticipant.count({
    where: { meetingId, isEligible: true },
  });
  const result = evaluateVoteResult(ctx.meeting.votingMethod, tally, eligibleVoters);

  return success({
    votingClosed: ctx.meeting.votingClosed,
    votingMethod: ctx.meeting.votingMethod,
    tally,
    result,
    voteCount: votes.length,
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminWrite(request, 'governance', 'update');
  if (!auth.ok) return auth.error;

  const { id: meetingId } = await context.params;
  const ctx = await loadMeetingForAccess(meetingId, auth.user.id);
  if (!ctx) return notFound('Meeting');

  const body = (await readJson(request)) as Record<string, unknown> | null;
  if (!body) return badRequest('Invalid body.');

  if (body.close === true) {
    if (!canManageMeeting(auth.user, ctx.meeting)) return forbidden();
    const updated = await db.governanceMeeting.update({
      where: { id: meetingId },
      data: { votingClosed: true },
    });
    await emitGovernanceEvent({
      type: 'vote_closed',
      actorId: auth.user.id,
      entityId: meetingId,
      request,
    });
    return success({ id: updated.id, votingClosed: true }, 'Voting closed.');
  }

  try {
    assertVotingOpen(ctx.meeting.votingClosed);
  } catch {
    return conflict('Voting is closed.');
  }

  if (
    !canViewMeeting(auth.user, ctx.meeting, {
      isParticipant: Boolean(ctx.participant),
      isCommitteeMember: ctx.isCommitteeMember,
    })
  ) {
    return forbidden();
  }

  if (typeof body.choice !== 'string' || !isOneOf(body.choice, VOTE_CHOICES)) {
    return badRequest('Valid choice is required (approve, reject, abstain).');
  }

  const resolutionId =
    typeof body.resolutionId === 'string' ? body.resolutionId : null;

  const existing = await db.governanceVote.findFirst({
    where: {
      meetingId,
      voterUserId: auth.user.id,
      resolutionId,
    },
  });
  if (existing) return conflict('You have already cast a vote.');

  try {
    const vote = await db.governanceVote.create({
      data: {
        meetingId,
        resolutionId,
        voterUserId: auth.user.id,
        participantId: ctx.participant?.id ?? null,
        choice: body.choice,
        isPrivate: body.isPrivate === true,
      },
    });

    await emitGovernanceEvent({
      type: 'vote_cast',
      actorId: auth.user.id,
      entityId: vote.id,
      request,
      details: { meetingId, resolutionId },
    });

    return success(
      {
        id: vote.id,
        choice: vote.choice,
        meetingId: vote.meetingId,
        resolutionId: vote.resolutionId,
      },
      'Vote recorded.',
      201
    );
  } catch {
    return conflict('You have already cast a vote.');
  }
}
