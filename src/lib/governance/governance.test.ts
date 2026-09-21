import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { permissionsForRole } from '@/lib/auth/rbac-matrix';
import type { AuthUser } from '@/lib/auth/permissions';
import {
  canAccessDocument,
  canAccessOwnRequest,
  canManageCommittee,
  canViewCommittee,
  canViewGovernance,
  canViewInternalRequestNotes,
  isGlobalGovernanceAdmin,
} from './access';
import { evaluateQuorum, isPresentAttendance } from './quorum';
import {
  assertVotingOpen,
  evaluateVoteResult,
  tallyVotes,
} from './voting';
import {
  assertMinutesEditable,
  assertPolicyVersionEditable,
  canTransitionMinutes,
  canTransitionPolicy,
  canTransitionRequest,
  minutesAreImmutable,
  policyVersionIsImmutable,
} from './workflow';
import { appointmentsExpiringWithin, computeTermEnd, slugify } from './write';
import { GOVERNANCE_GENERIC_NOTIFY } from './events';

function user(slug: string, id = `${slug}-1`): AuthUser {
  return {
    id,
    email: `${slug}@example.com`,
    firstName: 'Test',
    lastName: 'User',
    phone: null,
    profileImage: null,
    status: 'active',
    isVerified: true,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    role: {
      id: `role-${slug}`,
      slug,
      name: slug,
      hierarchy: 10,
      isPrivileged: slug === 'admin' || slug === 'super_admin',
    },
    permissions: permissionsForRole(slug).map((key) => {
      const [resource, action] = key.split(':');
      return { resource, action };
    }),
  };
}

describe('governance RBAC', () => {
  it('maps governance permissions for admin and pastor', () => {
    assert.ok(permissionsForRole('admin').includes('governance:manage'));
    assert.ok(permissionsForRole('pastor').includes('governance:approve'));
    assert.ok(permissionsForRole('church_leader').includes('governance:view'));
    assert.equal(permissionsForRole('member').includes('governance:view'), false);
  });

  it('grants view helpers correctly', () => {
    assert.equal(canViewGovernance(user('admin')), true);
    assert.equal(canViewGovernance(user('pastor')), true);
    assert.equal(canViewGovernance(user('member')), false);
    assert.equal(isGlobalGovernanceAdmin(user('admin')), true);
    assert.equal(isGlobalGovernanceAdmin(user('church_leader')), false);
  });
});

describe('object-level committee authorization', () => {
  const committeeA = { id: 'a', chairUserId: 'chair-a', secretaryUserId: null };
  const committeeB = { id: 'b', chairUserId: 'chair-b', secretaryUserId: null };

  it('committee A member cannot view committee B', () => {
    const member = user('member', 'm1');
    assert.equal(canViewCommittee(member, committeeA, { isActiveMember: true }), true);
    assert.equal(canViewCommittee(member, committeeB, { isActiveMember: false }), false);
  });

  it('chair can manage own committee only', () => {
    const chair = user('church_leader', 'chair-a');
    assert.equal(canManageCommittee(chair, committeeA), true);
    assert.equal(canManageCommittee(chair, committeeB), false);
  });

  it('admin can manage any committee', () => {
    assert.equal(canManageCommittee(user('admin'), committeeB), true);
  });
});

describe('request privacy', () => {
  it('requester can access own request only', () => {
    const u = user('member', 'u1');
    assert.equal(canAccessOwnRequest(u, 'u1', 'mem-1', 'mem-1'), true);
    assert.equal(canAccessOwnRequest(u, 'u2', 'mem-2', 'mem-1'), false);
  });

  it('internal notes require admin governance rights', () => {
    assert.equal(canViewInternalRequestNotes(user('member')), false);
    assert.equal(canViewInternalRequestNotes(user('admin')), true);
  });
});

describe('document access defaults restricted', () => {
  it('blocks non-admin from restricted docs', () => {
    assert.equal(
      canAccessDocument(user('member'), { accessLevel: 'restricted' }, { isMember: true }),
      false
    );
    assert.equal(
      canAccessDocument(user('admin'), { accessLevel: 'restricted' }),
      true
    );
  });

  it('committee-only requires membership', () => {
    assert.equal(
      canAccessDocument(
        user('member'),
        { accessLevel: 'committee_only', committeeId: 'c1' },
        { isCommitteeMember: false }
      ),
      false
    );
    assert.equal(
      canAccessDocument(
        user('member'),
        { accessLevel: 'committee_only', committeeId: 'c1' },
        { isCommitteeMember: true }
      ),
      true
    );
  });
});

describe('quorum configuration', () => {
  it('uses count rule without hard-coding percentage', () => {
    const snap = evaluateQuorum({ quorumCount: 5 }, 10, 5);
    assert.equal(snap.quorumReached, true);
    assert.equal(snap.requiredCount, 5);
  });

  it('uses percent when count absent', () => {
    const snap = evaluateQuorum({ quorumPercent: 50 }, 10, 4);
    assert.equal(snap.requiredCount, 5);
    assert.equal(snap.quorumReached, false);
  });

  it('returns null when no rule configured', () => {
    const snap = evaluateQuorum({}, 10, 9);
    assert.equal(snap.quorumReached, null);
  });

  it('treats late as present', () => {
    assert.equal(isPresentAttendance('late'), true);
    assert.equal(isPresentAttendance('absent'), false);
  });
});

describe('voting security rules', () => {
  it('tallies choices', () => {
    const t = tallyVotes(['approve', 'approve', 'reject', 'abstain']);
    assert.equal(t.approve, 2);
    assert.equal(t.reject, 1);
    assert.equal(t.abstain, 1);
    assert.equal(t.castingVotes, 3);
  });

  it('evaluates simple majority and two-thirds', () => {
    const majority = tallyVotes(['approve', 'approve', 'reject']);
    assert.equal(evaluateVoteResult('simple_majority', majority, 3), true);
    const short = tallyVotes(['approve', 'reject', 'reject']);
    assert.equal(evaluateVoteResult('two_thirds', short, 3), false);
    assert.equal(evaluateVoteResult('custom', majority), null);
  });

  it('blocks voting after closure', () => {
    assert.throws(() => assertVotingOpen(true), /VOTING_CLOSED/);
    assert.doesNotThrow(() => assertVotingOpen(false));
  });
});

describe('workflow immutability', () => {
  it('minutes transitions and locking', () => {
    assert.equal(canTransitionMinutes('draft', 'secretary_review'), true);
    assert.equal(canTransitionMinutes('draft', 'approved'), false);
    assert.equal(minutesAreImmutable('locked'), true);
    assert.throws(() => assertMinutesEditable('approved'), /MINUTES_LOCKED/);
  });

  it('policy versions cannot be silently overwritten when published', () => {
    assert.equal(policyVersionIsImmutable('published'), true);
    assert.throws(() => assertPolicyVersionEditable('published'), /POLICY_VERSION_LOCKED/);
    assert.equal(canTransitionPolicy('draft', 'review'), true);
    assert.equal(canTransitionPolicy('published', 'draft'), false);
  });

  it('request transitions are server-validated', () => {
    assert.equal(canTransitionRequest('submitted', 'assigned'), true);
    assert.equal(canTransitionRequest('completed', 'submitted'), false);
  });
});

describe('terms and notifications', () => {
  it('computes configurable term end', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    assert.equal(computeTermEnd(start, null), null);
    const end = computeTermEnd(start, 12);
    assert.ok(end);
    assert.equal(end!.getFullYear(), 2027);
  });

  it('detects expiring appointments within reminder windows', () => {
    const now = new Date('2026-08-01T00:00:00Z');
    const end = new Date('2026-08-20T00:00:00Z');
    assert.equal(appointmentsExpiringWithin(end, now, 30), true);
    assert.equal(appointmentsExpiringWithin(end, now, 10), false);
  });

  it('uses generic notification copy', () => {
    assert.match(GOVERNANCE_GENERIC_NOTIFY, /governance/i);
  });

  it('slugifies names', () => {
    assert.equal(slugify('Finance Committee'), 'finance-committee');
  });
});
