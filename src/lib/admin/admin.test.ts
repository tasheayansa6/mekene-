import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { can, canAccessAdminPortal, hasPermission } from '../auth/permissions';
import { permissionsForRole } from '../auth/rbac-matrix';
import type { AuthUser } from '../auth/permissions';
import { canMutateMinistry, canViewMinistry } from './ministry-scope';
import { buildDashboardStats } from './dashboard';
import { describeActivity, parseSafeDetails } from './activity';
import { publicErrorMessage } from './http-error';
import { slugify } from './slug';
import {
  adminNavigation,
  breadcrumbsFromPath,
  filterAdminNavigation,
  filterQuickActions,
  ADMIN_QUICK_ACTIONS,
} from '../../config/admin-nav';

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

describe('admin portal access', () => {
  it('members cannot access the admin dashboard', () => {
    assert.equal(canAccessAdminPortal(user('member')), false);
  });

  it('administrators and ministry leaders can access the portal', () => {
    assert.equal(canAccessAdminPortal(user('admin')), true);
    assert.equal(canAccessAdminPortal(user('ministry_leader')), true);
    assert.equal(canAccessAdminPortal(user('finance')), true);
    assert.equal(canAccessAdminPortal(user('prayer_team')), true);
  });
});

describe('can helper', () => {
  it('parses resource.action keys', () => {
    const admin = user('admin');
    assert.equal(can(admin, 'ministries.update'), true);
    assert.equal(can(admin, 'users:manage'), true);
    assert.equal(can(user('member'), 'users.manage'), false);
    assert.equal(can(null, 'users.view'), false);
  });
});

describe('ministry scope', () => {
  it('ministry leaders cannot mutate unassigned or unrelated ministries', () => {
    const leader = user('ministry_leader');
    assert.equal(canViewMinistry(leader, { id: 'm1', leaderUserId: leader.id }), true);
    assert.equal(canMutateMinistry(leader, { id: 'm1', leaderUserId: leader.id }), true);
    assert.equal(canMutateMinistry(leader, { id: 'm2', leaderUserId: 'other' }), false);
    assert.equal(canMutateMinistry(leader, { id: 'm3', leaderUserId: null }), false);
  });

  it('admins can mutate any ministry they can update', () => {
    const admin = user('admin');
    assert.equal(canMutateMinistry(admin, { id: 'm2', leaderUserId: 'other' }), true);
  });
});

describe('dashboard stats', () => {
  it('uses provided counts and never invents values', () => {
    const stats = buildDashboardStats({
      usersTotal: 4,
      usersActive: 3,
      ministriesTotal: 8,
      ministriesActive: 7,
      leadersTotal: 6,
      leadersActive: 6,
      churchProfile: { status: 'published' },
      locationCount: 1,
      serviceCount: 3,
    });
    assert.equal(stats.users.total, 4);
    assert.equal(stats.ministries.active, 7);
    assert.equal(stats.church.hasProfile, true);
  });
});

describe('activity and errors', () => {
  it('describes known audit events', () => {
    assert.equal(describeActivity({ action: 'register', entity: 'user' }), 'New user registered');
    assert.equal(
      describeActivity({ action: 'update', entity: 'church_profile' }),
      'Church information changed'
    );
  });

  it('strips secrets from audit details', () => {
    const clean = parseSafeDetails(
      JSON.stringify({ name: 'Ada', password: 'secret', token: 'abc' })
    );
    assert.equal(clean?.name, 'Ada');
    assert.equal('password' in (clean || {}), false);
    assert.equal('token' in (clean || {}), false);
  });

  it('hides stack traces from users', () => {
    assert.equal(
      publicErrorMessage(500, 'PrismaClientKnownRequestError at /src/lib/db.ts'),
      'Something went wrong. Please try again.'
    );
    assert.equal(publicErrorMessage(403, 'You do not have permission to perform this action.'), 
      'You do not have permission to perform this action.');
  });
});

describe('navigation', () => {
  it('hides finance from prayer team and users from ministry leaders', () => {
    const prayer = user('prayer_team');
    const items = filterAdminNavigation(adminNavigation, (resource) =>
      hasPermission(prayer, resource, 'view')
    );
    const labels = items.map((item) => item.label);
    assert.equal(labels.includes('Giving'), false);
    assert.equal(labels.includes('Users'), false);
    assert.equal(labels.includes('Dashboard'), true);
    assert.equal(labels.includes('Prayer'), true);
  });

  it('filters quick actions by permission', () => {
    const member = user('member');
    assert.equal(filterQuickActions(ADMIN_QUICK_ACTIONS, (key) => can(member, key)).length, 0);
    const admin = user('admin');
    assert.ok(filterQuickActions(ADMIN_QUICK_ACTIONS, (key) => can(admin, key)).length > 0);
  });

  it('builds accessible breadcrumbs', () => {
    const crumbs = breadcrumbsFromPath('/admin/ministries/create');
    assert.equal(crumbs[0].label, 'Dashboard');
    assert.equal(crumbs.at(-1)?.label, 'Create');
    assert.equal(crumbs.at(-1)?.href, undefined);
  });
});

describe('slugify', () => {
  it('creates URL-safe slugs', () => {
    assert.equal(slugify("Women's Fellowship"), 'womens-fellowship');
  });
});
