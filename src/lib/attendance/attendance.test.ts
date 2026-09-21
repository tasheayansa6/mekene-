import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  canTransitionSession,
  isSessionAcceptingCheckIns,
  sessionStatusLabel,
} from './status';
import {
  canCorrectAttendance,
  canExportAttendance,
  canManageQr,
  canViewAttendance,
  isAttendanceMinistryScope,
  sessionListWhere,
} from './access';
import { hasPermission, type AuthUser } from '../auth/permissions';
import { permissionsForRole } from '../auth/rbac-matrix';

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

describe('attendance session status', () => {
  it('validates session transitions', () => {
    assert.equal(canTransitionSession('draft', 'scheduled'), true);
    assert.equal(canTransitionSession('scheduled', 'open'), true);
    assert.equal(canTransitionSession('open', 'closed'), true);
    assert.equal(canTransitionSession('closed', 'open'), true);
    assert.equal(canTransitionSession('archived', 'open'), false);
    assert.equal(sessionStatusLabel('open'), 'Open');
  });

  it('only open sessions accept check-ins within the time window', () => {
    const now = new Date('2026-08-21T10:00:00.000Z');
    const open = {
      status: 'open',
      startsAt: new Date('2026-08-21T09:30:00.000Z'),
      endsAt: new Date('2026-08-21T11:00:00.000Z'),
      allowSelfCheckIn: true,
    };
    assert.equal(isSessionAcceptingCheckIns(open, now, { requireSelfFlag: true }), true);
    assert.equal(
      isSessionAcceptingCheckIns({ ...open, status: 'closed' }, now, { requireSelfFlag: true }),
      false
    );
    assert.equal(
      isSessionAcceptingCheckIns({ ...open, allowSelfCheckIn: false }, now, {
        requireSelfFlag: true,
      }),
      false
    );
  });
});

describe('attendance permissions', () => {
  it('does not give website members attendance admin access', () => {
    const member = user('member');
    assert.equal(canViewAttendance(member), false);
    assert.equal(canCorrectAttendance(member), false);
    assert.equal(canManageQr(member), false);
    assert.equal(canExportAttendance(member), false);
    assert.equal(hasPermission(member, 'attendance', 'create'), false);
  });

  it('gives pastors correction and QR permissions without exporting by default', () => {
    const pastor = user('pastor');
    assert.equal(canViewAttendance(pastor), true);
    assert.equal(canCorrectAttendance(pastor), true);
    assert.equal(canManageQr(pastor), true);
    assert.equal(canExportAttendance(pastor), false);
  });

  it('scopes ministry leaders to their ministries', () => {
    const leader = user('ministry_leader');
    assert.equal(isAttendanceMinistryScope(leader), true);
    assert.deepEqual(sessionListWhere(leader), {
      ministry: { leaderUserId: leader.id },
    });
    assert.deepEqual(sessionListWhere(user('admin')), {});
  });
});
