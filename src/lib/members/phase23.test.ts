import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hashMemberCardToken, generateMemberCardToken } from './family-number';
import { canImportMembers, canExportMembers, canMergeMembers } from './access';
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
      id: slug,
      slug,
      name: slug,
      hierarchy: 1,
      isPrivileged: slug === 'admin',
    },
    permissions: permissionsForRole(slug).map((key) => {
      const [resource, action] = key.split(':');
      return { resource, action };
    }),
  };
}

describe('member card tokens', () => {
  it('hashes tokens without storing plaintext', () => {
    const { token, tokenHash } = generateMemberCardToken();
    assert.ok(token.length > 16);
    assert.equal(tokenHash, hashMemberCardToken(token));
    assert.notEqual(token, tokenHash);
  });
});

describe('phase 23 permissions', () => {
  it('allows admin import/export/merge', () => {
    const admin = user('admin');
    assert.equal(canImportMembers(admin), true);
    assert.equal(canExportMembers(admin), true);
    assert.equal(canMergeMembers(admin), true);
  });

  it('denies website members import/export', () => {
    const member = user('member');
    assert.equal(canImportMembers(member), false);
    assert.equal(canExportMembers(member), false);
    assert.equal(canMergeMembers(member), false);
  });
});
