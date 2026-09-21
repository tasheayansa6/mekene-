import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { profileCompletion } from './dashboard';
import { shouldNeverCachePath, isPublicShellPath } from './pwa';
import { isSavedKind } from './saved';
import { canViewReceipt } from '@/lib/giving/receipt-access';
import type { AuthUser } from '@/lib/auth/permissions';
import { permissionsForRole } from '@/lib/auth/rbac-matrix';

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
      id: slug,
      slug,
      name: slug,
      hierarchy: 1,
      isPrivileged: slug === 'admin' || slug === 'finance',
    },
    permissions: permissionsForRole(slug).map((key) => {
      const [resource, action] = key.split(':');
      return { resource, action };
    }),
  };
}

describe('member portal profile completion', () => {
  it('counts missing profile fields', () => {
    const empty = profileCompletion({
      hasPhoto: false,
      preferredLanguage: null,
      emergencyContactName: null,
      directoryVisibility: null,
    });
    assert.equal(empty.percent, 0);
    assert.equal(empty.missing.length, 4);

    const full = profileCompletion({
      hasPhoto: true,
      preferredLanguage: 'am',
      emergencyContactName: 'Parent',
      directoryVisibility: 'private',
    });
    assert.equal(full.percent, 100);
    assert.equal(full.missing.length, 0);
  });
});

describe('member portal PWA cache rules', () => {
  it('never caches private member, giving, or API paths', () => {
    assert.equal(shouldNeverCachePath('/member'), true);
    assert.equal(shouldNeverCachePath('/member/giving/receipts'), true);
    assert.equal(shouldNeverCachePath('/api/v1/member/dashboard'), true);
    assert.equal(shouldNeverCachePath('/give/receipt/abc'), true);
    assert.equal(shouldNeverCachePath('/admin/members'), true);
    assert.equal(shouldNeverCachePath('/'), false);
    assert.equal(isPublicShellPath('/offline'), true);
    assert.equal(isPublicShellPath('/member'), false);
  });
});

describe('saved item kinds', () => {
  it('accepts only supported kinds', () => {
    assert.equal(isSavedKind('sermon'), true);
    assert.equal(isSavedKind('page'), true);
    assert.equal(isSavedKind('prayer'), false);
  });
});

describe('receipt object-level access', () => {
  it('blocks other members from viewing a linked receipt', () => {
    const owner = user('member', 'owner-1');
    const other = user('member', 'other-1');
    assert.equal(canViewReceipt({ userId: owner.id }, other), false);
    assert.equal(canViewReceipt({ userId: owner.id }, owner), true);
    assert.equal(canViewReceipt({ userId: owner.id }, null), false);
  });

  it('allows guest receipts by unguessable reference and finance staff', () => {
    assert.equal(canViewReceipt({ userId: null }, null), true);
    assert.equal(canViewReceipt({ userId: 'owner-1' }, user('finance')), true);
  });
});
