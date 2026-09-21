import type { VoteChoice, VotingMethod } from '@prisma/client';

export type VoteTally = {
  approve: number;
  reject: number;
  abstain: number;
  total: number;
  castingVotes: number;
};

export function tallyVotes(choices: Array<VoteChoice | string>): VoteTally {
  const tally: VoteTally = { approve: 0, reject: 0, abstain: 0, total: 0, castingVotes: 0 };
  for (const c of choices) {
    tally.total += 1;
    if (c === 'approve') {
      tally.approve += 1;
      tally.castingVotes += 1;
    } else if (c === 'reject') {
      tally.reject += 1;
      tally.castingVotes += 1;
    } else if (c === 'abstain') {
      tally.abstain += 1;
    }
  }
  return tally;
}

/**
 * Evaluate whether a vote passes under a configured method.
 * Custom rules return null (church must interpret).
 */
export function evaluateVoteResult(
  method: VotingMethod | string | null | undefined,
  tally: VoteTally,
  eligibleVoters?: number
): boolean | null {
  if (!method) return null;
  const base = eligibleVoters != null && eligibleVoters > 0 ? eligibleVoters : tally.castingVotes;
  if (base <= 0 && method !== 'unanimous') return false;

  switch (method) {
    case 'simple_majority':
      return tally.approve > tally.reject && tally.approve > base / 2;
    case 'two_thirds':
      return tally.approve >= Math.ceil((base * 2) / 3);
    case 'unanimous':
      return tally.reject === 0 && tally.approve > 0 && tally.abstain === 0
        ? true
        : tally.reject === 0 && tally.approve > 0;
    case 'custom':
      return null;
    default:
      return null;
  }
}

export function assertVotingOpen(votingClosed: boolean): void {
  if (votingClosed) throw new Error('VOTING_CLOSED');
}
