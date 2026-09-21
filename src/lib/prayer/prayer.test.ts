import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  adminStatusLabel,
  isPubliclyListable,
  memberStatusLabel,
} from './status';
import {
  allowedTeamStatus,
  canArchivePrayer,
  canAssignPrayer,
  canManagePrayerCategories,
  canModeratePrayer,
  canPermanentlyDeletePrayer,
  canSeeRequesterIdentity,
  canViewPrayerAdmin,
} from './access';
import { serializePublicPrayer, serializeMemberPrayer } from './serialize';
import { PRAYER_HOOK_TYPES } from './hooks';
import { captchaRequired } from './captcha';
import { prayerActorHash } from './actor';
import { rateLimitKey, resetRateLimitStore } from '../auth/rate-limit';
import { canAccessAdminPortal, hasPermission } from '../auth/permissions';
import { permissionsForRole } from '../auth/rbac-matrix';
import type { AuthUser } from '../auth/permissions';

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
      id: 'role-1',
      slug,
      name: slug,
      hierarchy: 10,
      isPrivileged: false,
    },
    permissions: permissionsForRole(slug).map((key) => {
      const [resource, action] = key.split(':');
      return { resource, action };
    }),
  };
}

describe('prayer privacy', () => {
  it('does not list private or unapproved public requests', () => {
    assert.equal(
      isPubliclyListable({ visibility: 'private', publicApproved: false, status: 'new' }),
      false
    );
    assert.equal(
      isPubliclyListable({ visibility: 'public', publicApproved: false, status: 'new' }),
      false
    );
    assert.equal(
      isPubliclyListable({ visibility: 'public', publicApproved: true, status: 'rejected' }),
      false
    );
    assert.equal(
      isPubliclyListable({ visibility: 'public', publicApproved: true, status: 'praying' }),
      true
    );
  });

  it('uses member-facing status labels', () => {
    assert.equal(memberStatusLabel('new'), 'Received');
    assert.equal(memberStatusLabel('under_review'), 'Being Reviewed');
    assert.equal(memberStatusLabel('assigned'), 'Prayer Team Assigned');
    assert.equal(memberStatusLabel('praying'), 'Being Prayed For');
    assert.equal(adminStatusLabel('under_review'), 'Under Review');
  });

  it('public serializer omits identity and internal fields', () => {
    const publicRow = serializePublicPrayer({
      id: 'p1',
      title: 'This is a development test prayer request.',
      content: 'This is a development test prayer request.',
      prayedCount: 2,
      createdAt: new Date('2026-08-21T00:00:00.000Z'),
      category: { id: 'c1', name: 'Other', slug: 'other' },
    });
    assert.equal('email' in publicRow, false);
    assert.equal('guestEmail' in publicRow, false);
    assert.equal('assignedTo' in publicRow, false);
    assert.equal('notes' in publicRow, false);
    assert.equal('userId' in publicRow, false);
    assert.equal(publicRow.title, 'This is a development test prayer request.');
  });

  it('member serializer never includes internal notes', () => {
    const row = serializeMemberPrayer({
      id: 'p1',
      title: 'This is a development test prayer request.',
      content: 'This is a development test prayer request.',
      isAnonymous: true,
      visibility: 'private',
      status: 'praying',
      publicApproved: false,
      requesterMessage: 'We are praying with you.',
      createdAt: new Date(),
      updatedAt: new Date(),
      category: null,
    });
    assert.equal('notes' in row, false);
    assert.equal(row.statusLabel, 'Being Prayed For');
    assert.equal(row.requesterMessage, 'We are praying with you.');
  });
});

describe('prayer rbac', () => {
  it('members cannot view the admin prayer queue', () => {
    const member = user('member');
    assert.equal(hasPermission(member, 'prayer', 'create'), true);
    assert.equal(hasPermission(member, 'prayer', 'view'), false);
    assert.equal(canAccessAdminPortal(member), false);
    assert.equal(canViewPrayerAdmin(member), false);
  });

  it('prayer team can update but not moderate or assign', () => {
    const prayer = user('prayer_team');
    assert.equal(canViewPrayerAdmin(prayer), true);
    assert.equal(canModeratePrayer(prayer), false);
    assert.equal(canAssignPrayer(prayer), false);
    assert.equal(canArchivePrayer(prayer), false);
    assert.equal(canSeeRequesterIdentity(prayer), false);
    assert.equal(allowedTeamStatus(prayer, 'praying'), 'praying');
    assert.equal(allowedTeamStatus(prayer, 'rejected'), null);
    assert.equal(hasPermission(prayer, 'finance', 'view'), false);
  });

  it('finance cannot access prayer', () => {
    const finance = user('finance');
    assert.equal(hasPermission(finance, 'prayer', 'view'), false);
    assert.equal(canViewPrayerAdmin(finance), false);
  });

  it('pastors can moderate and assign', () => {
    const pastor = user('pastor');
    assert.equal(canModeratePrayer(pastor), true);
    assert.equal(canAssignPrayer(pastor), true);
    assert.equal(canArchivePrayer(pastor), true);
    assert.equal(canSeeRequesterIdentity(pastor), true);
    assert.equal(canManagePrayerCategories(pastor), true);
  });

  it('only super administrators can permanently delete', () => {
    assert.equal(canPermanentlyDeletePrayer(user('admin')), false);
    assert.equal(canPermanentlyDeletePrayer(user('super_admin')), true);
  });
});

describe('prayer rate limiting and captcha', () => {
  it('limits repeated submit attempts', () => {
    resetRateLimitStore();
    for (let i = 0; i < 5; i += 1) {
      assert.equal(rateLimitKey('prayer:submit:ip:9.9.9.9', 5, 60_000).allowed, true);
    }
    assert.equal(rateLimitKey('prayer:submit:ip:9.9.9.9', 5, 60_000).allowed, false);
  });

  it('does not require captcha without configuration', () => {
    assert.equal(captchaRequired(), false);
  });

  it('hashes actor tokens without storing the raw identifier', () => {
    const hash = prayerActorHash('req1', 'actor-token');
    assert.equal(hash.includes('actor-token'), false);
    assert.equal(hash.length, 64);
  });
});

describe('prayer hooks', () => {
  it('prepares notification event names without implementing delivery', () => {
    assert.ok(PRAYER_HOOK_TYPES.includes('prayer_request.created'));
    assert.ok(PRAYER_HOOK_TYPES.includes('prayer_request.assigned'));
    assert.ok(PRAYER_HOOK_TYPES.includes('prayer_request.approved'));
    assert.ok(PRAYER_HOOK_TYPES.includes('prayer_request.status_changed'));
  });
});
