import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { validatePasswordPolicy } from './password';
import { generateToken, hashToken, isExpired } from './tokens';
import { timingSafeEqual } from './csrf';
import {
  canAssignRole,
  canChangeStatus,
  canManageUser,
  canAccessAdminPortal,
  hasPermission,
} from './permissions';
import { resetRateLimitStore, rateLimitLogin } from './rate-limit';
import { serializeUser } from './serialize';
import { permissionsForRole } from './rbac-matrix';
import type { AuthUser } from './permissions';

function user(
  partial: Partial<AuthUser> & { slug: string; permissions?: AuthUser['permissions'] }
): AuthUser {
  return {
    id: partial.id || 'user-1',
    email: partial.email || 'a@b.c',
    firstName: 'Ada',
    lastName: 'Member',
    phone: null,
    profileImage: null,
    status: 'active',
    isVerified: true,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    role: {
      id: 'role-1',
      slug: partial.slug,
      name: partial.slug,
      hierarchy: 10,
      isPrivileged: false,
    },
    permissions: partial.permissions || [],
  };
}

function perms(slug: string) {
  return permissionsForRole(slug).map((key) => {
    const [resource, action] = key.split(':');
    return { resource, action };
  });
}

describe('password policy', () => {
  it('rejects short and common passwords', () => {
    assert.equal(validatePasswordPolicy('short').ok, false);
    assert.equal(validatePasswordPolicy('password123').ok, false);
    assert.equal(validatePasswordPolicy('StrongerPass!9').ok, true);
  });

  it('rejects passwords containing the email local part', () => {
    assert.equal(
      validatePasswordPolicy('martha99xx', { email: 'martha@example.com' }).ok,
      false
    );
  });
});

describe('tokens', () => {
  it('hashes are deterministic and not reversible', () => {
    const token = generateToken();
    assert.notEqual(hashToken(token), token);
    assert.equal(hashToken(token), hashToken(token));
  });

  it('expiry helper', () => {
    assert.equal(isExpired(new Date(Date.now() - 1000)), true);
    assert.equal(isExpired(new Date(Date.now() + 60_000)), false);
  });
});

describe('csrf compare', () => {
  it('timingSafeEqual', () => {
    assert.equal(timingSafeEqual('abc', 'abc'), true);
    assert.equal(timingSafeEqual('abc', 'abd'), false);
    assert.equal(timingSafeEqual('abc', 'ab'), false);
  });
});

describe('rbac', () => {
  it('member cannot access finance or users', () => {
    const member = user({ slug: 'member', permissions: perms('member') });
    assert.equal(hasPermission(member, 'finance', 'view'), false);
    assert.equal(hasPermission(member, 'users', 'manage'), false);
    assert.equal(hasPermission(member, 'profile', 'update'), true);
    assert.equal(hasPermission(member, 'prayer', 'create'), true);
    assert.equal(hasPermission(member, 'prayer', 'view'), false);
  });

  it('prayer team cannot access finance', () => {
    const prayer = user({ slug: 'prayer_team', permissions: perms('prayer_team') });
    assert.equal(hasPermission(prayer, 'prayer', 'view'), true);
    assert.equal(hasPermission(prayer, 'prayer', 'moderate'), false);
    assert.equal(hasPermission(prayer, 'finance', 'view'), false);
    assert.equal(hasPermission(prayer, 'settings', 'manage'), false);
  });

  it('finance cannot access prayer', () => {
    const finance = user({ slug: 'finance', permissions: perms('finance') });
    assert.equal(hasPermission(finance, 'finance', 'view'), true);
    assert.equal(hasPermission(finance, 'prayer', 'view'), false);
  });

  it('ministry leader cannot manage users or finance', () => {
    const leader = user({
      slug: 'ministry_leader',
      permissions: perms('ministry_leader'),
    });
    assert.equal(hasPermission(leader, 'ministries', 'update'), true);
    assert.equal(hasPermission(leader, 'users', 'manage'), false);
    assert.equal(hasPermission(leader, 'finance', 'view'), false);
    assert.equal(hasPermission(leader, 'settings', 'manage'), false);
  });

  it('members cannot access the admin portal even with content permissions', () => {
    const member = user({ slug: 'member', permissions: perms('member') });
    assert.equal(canAccessAdminPortal(member), false);
  });

  it('admins cannot assign super_admin', () => {
    const admin = user({ slug: 'admin' });
    assert.equal(canAssignRole(admin, 'super_admin'), false);
    assert.equal(canAssignRole(admin, 'admin'), false);
    assert.equal(canAssignRole(admin, 'finance'), true);
    assert.equal(canAssignRole(admin, 'member'), true);
  });

  it('admins cannot manage super admins', () => {
    const admin = user({ id: 'admin-1', slug: 'admin' });
    assert.equal(canManageUser(admin, { id: 'super-1', roleSlug: 'super_admin' }), false);
    assert.equal(canManageUser(admin, { id: 'member-1', roleSlug: 'member' }), true);
  });

  it('users cannot change their own status', () => {
    const admin = user({ id: 'admin-1', slug: 'admin' });
    assert.equal(canChangeStatus(admin, 'admin-1'), false);
    assert.equal(canChangeStatus(admin, 'other'), true);
  });
});

describe('serialize', () => {
  it('never includes password fields', () => {
    const safe = serializeUser(
      user({ slug: 'member', permissions: [{ resource: 'profile', action: 'view' }] })
    );
    const raw = JSON.stringify(safe);
    assert.equal(raw.includes('password'), false);
    assert.equal(raw.includes('token'), false);
    assert.equal(safe.email, 'a@b.c');
  });
});

describe('rate limit', () => {
  beforeEach(() => resetRateLimitStore());

  it('locks after repeated login attempts', () => {
    for (let i = 0; i < 5; i += 1) {
      assert.equal(rateLimitLogin('test@example.com', '1.1.1.1').allowed, true);
    }
    const blocked = rateLimitLogin('test@example.com', '1.1.1.1');
    assert.equal(blocked.allowed, false);
    assert.ok(blocked.retryAfterSeconds > 0);
  });
});
