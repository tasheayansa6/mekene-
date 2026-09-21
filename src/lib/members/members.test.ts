import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applicantStatusLabel,
  canTransitionApplication,
  canTransitionMembership,
  isCurrentMember,
  isOpenApplication,
} from './status';
import {
  canApproveMembership,
  canModerateApplications,
  canViewMembers,
  isMinistryLeaderScope,
  memberListWhere,
} from './access';
import { hasPermission, type AuthUser } from '../auth/permissions';
import { permissionsForRole } from '../auth/rbac-matrix';
import { serializeApplicationApplicant } from './serialize';

function user(slug: string): AuthUser {
  return {
    id: `${slug}-1`,
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
      id: slug,
      slug,
      name: slug,
      hierarchy: 1,
      isPrivileged: slug === 'super_admin' || slug === 'admin',
    },
    permissions: permissionsForRole(slug).map((key) => {
      const [resource, action] = key.split(':');
      return { resource, action };
    }),
  };
}

describe('membership status', () => {
  it('keeps applicant labels simple', () => {
    assert.equal(applicantStatusLabel('submitted'), 'Submitted');
    assert.equal(applicantStatusLabel('under_review'), 'Under Review');
    assert.equal(applicantStatusLabel('needs_information'), 'Additional Information Requested');
    assert.equal(applicantStatusLabel('approved'), 'Approved');
    assert.equal(applicantStatusLabel('rejected'), 'Not Approved');
    assert.equal(applicantStatusLabel('archived'), 'Not Approved');
  });

  it('validates application transitions', () => {
    assert.equal(canTransitionApplication('submitted', 'approved'), true);
    assert.equal(canTransitionApplication('submitted', 'needs_information'), true);
    assert.equal(canTransitionApplication('approved', 'rejected'), false);
    assert.equal(canTransitionApplication('needs_information', 'resubmitted'), true);
    assert.equal(canTransitionApplication('resubmitted', 'approved'), true);
  });

  it('validates membership transitions', () => {
    assert.equal(canTransitionMembership('active', 'inactive'), true);
    assert.equal(canTransitionMembership('archived', 'active'), true);
    assert.equal(canTransitionMembership('inactive', 'active'), true);
    assert.equal(canTransitionMembership('suspended', 'active'), true);
    assert.equal(canTransitionMembership('deceased', 'active'), false);
  });

  it('treats approved and active as current membership', () => {
    assert.equal(isCurrentMember('active'), true);
    assert.equal(isCurrentMember('approved'), true);
    assert.equal(isCurrentMember('archived'), false);
    assert.equal(isOpenApplication('submitted'), true);
    assert.equal(isOpenApplication('approved'), false);
  });
});

describe('membership permissions', () => {
  it('does not let website members approve church membership', () => {
    const member = user('member');
    assert.equal(canApproveMembership(member), false);
    assert.equal(canModerateApplications(member), false);
    assert.equal(canViewMembers(member), false);
    assert.equal(hasPermission(member, 'members', 'approve'), false);
  });

  it('lets pastors review applications without granting every staff role', () => {
    assert.equal(canApproveMembership(user('pastor')), true);
    assert.equal(canModerateApplications(user('pastor')), true);
    assert.equal(canViewMembers(user('church_leader')), true);
    assert.equal(canApproveMembership(user('church_leader')), false);
    assert.equal(canModerateApplications(user('media_team')), false);
    assert.equal(canApproveMembership(user('ministry_leader')), false);
  });

  it('scopes ministry leaders to their ministries', () => {
    const leader = user('ministry_leader');
    assert.equal(isMinistryLeaderScope(leader), true);
    assert.deepEqual(memberListWhere(leader), {
      ministries: { some: { ministry: { leaderUserId: leader.id } } },
    });
    assert.deepEqual(memberListWhere(user('admin')), {});
  });
});

describe('applicant serialization', () => {
  it('hides internal review notes', () => {
    const payload = serializeApplicationApplicant({
      id: 'app-1',
      userId: 'user-1',
      memberId: null,
      status: 'needs_information',
      fullName: 'Ada Member',
      preferredContact: '0911',
      preferredLanguage: 'en',
      howHeard: 'Sunday worship service',
      ministryInterests: null,
      applicantNote: 'Hello',
      reviewerMessage: 'Please add a phone number.',
      reviewNotes: 'Internal pastoral note',
      reviewedAt: new Date(),
      submittedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    assert.equal('reviewNotes' in payload, false);
    assert.equal(payload.reviewerMessage, 'Please add a phone number.');
    assert.equal(payload.status, 'Additional Information Requested');
  });

  it('does not expose archived as an applicant status code', () => {
    const payload = serializeApplicationApplicant({
      id: 'app-2',
      userId: 'user-1',
      memberId: null,
      status: 'archived',
      fullName: 'Ada Member',
      preferredContact: null,
      preferredLanguage: 'en',
      howHeard: null,
      ministryInterests: null,
      applicantNote: null,
      reviewerMessage: 'hidden',
      reviewNotes: 'secret',
      reviewedAt: null,
      submittedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    assert.equal(payload.statusCode, 'rejected');
    assert.equal(payload.reviewerMessage, null);
    assert.equal(payload.status, 'Not Approved');
  });
});
