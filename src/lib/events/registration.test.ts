import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  parseReminderOffsets,
  registrationWindowOpen,
  findLocationConflicts,
} from './registration';
import { canManageRegistrations, canExportEvents } from './registration-access';
import type { AuthUser } from '@/lib/auth/permissions';

function user(slug: string, permissions: Array<{ resource: string; action: string }>): AuthUser {
  return {
    id: 'u1',
    email: 't@example.com',
    firstName: 'T',
    lastName: 'U',
    phone: null,
    profileImage: null,
    status: 'active',
    isVerified: true,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    role: { id: 'r1', slug, name: slug, hierarchy: 10, isPrivileged: false },
    permissions,
  };
}

describe('event registration window', () => {
  it('blocks cancelled events', () => {
    const result = registrationWindowOpen({
      status: 'cancelled',
      registrationRequired: true,
      registrationDeadline: null,
      startAt: new Date(Date.now() + 86_400_000),
      endAt: new Date(Date.now() + 90_000_000),
    });
    assert.equal(result.open, false);
    assert.equal(result.reason, 'cancelled');
  });

  it('blocks after deadline using server time', () => {
    const result = registrationWindowOpen({
      status: 'published',
      registrationRequired: true,
      registrationDeadline: new Date(Date.now() - 1000),
      startAt: new Date(Date.now() + 86_400_000),
      endAt: new Date(Date.now() + 90_000_000),
    });
    assert.equal(result.open, false);
    assert.equal(result.reason, 'deadline');
  });

  it('reports registration not required', () => {
    const result = registrationWindowOpen({
      status: 'published',
      registrationRequired: false,
      registrationDeadline: null,
      startAt: new Date(Date.now() + 86_400_000),
      endAt: new Date(Date.now() + 90_000_000),
    });
    assert.equal(result.open, false);
  });
});

describe('reminder offsets', () => {
  it('parses configurable offsets', () => {
    assert.deepEqual(parseReminderOffsets('10080,1440,60'), [10080, 1440, 60]);
  });
});

describe('registration permissions', () => {
  it('denies members from managing registrations or exporting', () => {
    const member = user('member', [{ resource: 'events', action: 'view' }]);
    assert.equal(canManageRegistrations(member), false);
    assert.equal(canExportEvents(member), false);
  });

  it('allows staff with assign/manage', () => {
    const staff = user('admin', [{ resource: 'events', action: 'assign' }]);
    assert.equal(canManageRegistrations(staff), true);
  });
});

describe('conflict helper', () => {
  it('returns empty when no location', async () => {
    const rows = await findLocationConflicts({
      locationId: null,
      startAt: new Date(),
      endAt: new Date(Date.now() + 3600_000),
    });
    assert.deepEqual(rows, []);
  });
});
