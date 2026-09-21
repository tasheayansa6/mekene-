import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isAnnouncementActive,
  isPubliclyVisible,
  isScheduledDue,
  RESERVED_PAGE_SLUGS,
  resolveStatusOnSave,
} from './status';
import { sanitizeMarkdown, isSafePublicUrl } from './sanitize';
import { allowedWriteStatus } from './access';
import { can, canAccessAdminPortal, hasPermission } from '../auth/permissions';
import { permissionsForRole } from '../auth/rbac-matrix';
import type { AuthUser } from '../auth/permissions';
import { slugify } from '../admin/slug';

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

describe('CMS visibility', () => {
  it('hides drafts, review, and archived content', () => {
    const now = new Date('2026-08-20T12:00:00Z');
    assert.equal(isPubliclyVisible({ status: 'draft', publishAt: null }, now), false);
    assert.equal(isPubliclyVisible({ status: 'review', publishAt: null }, now), false);
    assert.equal(isPubliclyVisible({ status: 'archived', publishAt: now }, now), false);
  });

  it('shows published content and due scheduled content', () => {
    const now = new Date('2026-08-20T12:00:00Z');
    assert.equal(isPubliclyVisible({ status: 'published', publishAt: null }, now), true);
    assert.equal(
      isPubliclyVisible({ status: 'scheduled', publishAt: new Date('2026-08-20T11:00:00Z') }, now),
      true
    );
    assert.equal(
      isPubliclyVisible({ status: 'scheduled', publishAt: new Date('2026-08-20T13:00:00Z') }, now),
      false
    );
  });

  it('does not show published content before publishAt', () => {
    const now = new Date('2026-08-20T12:00:00Z');
    assert.equal(
      isPubliclyVisible({ status: 'published', publishAt: new Date('2026-08-21T00:00:00Z') }, now),
      false
    );
  });

  it('expires announcements without deleting them', () => {
    const now = new Date('2026-08-20T12:00:00Z');
    const base = {
      status: 'published',
      publishAt: null,
      startAt: new Date('2026-08-01T00:00:00Z'),
      endAt: new Date('2026-08-19T00:00:00Z'),
    };
    assert.equal(isAnnouncementActive(base, now), false);
    assert.equal(isAnnouncementActive({ ...base, endAt: new Date('2026-08-21T00:00:00Z') }, now), true);
  });

  it('marks scheduled content as due at publishAt', () => {
    const now = new Date('2026-08-20T12:00:00Z');
    assert.equal(
      isScheduledDue({ status: 'scheduled', publishAt: new Date('2026-08-20T12:00:00Z') }, now),
      true
    );
  });
});

describe('CMS publishing workflow', () => {
  it('does not auto-publish when status is omitted', () => {
    const resolved = resolveStatusOnSave({});
    assert.equal(resolved.status, 'draft');
    assert.equal(resolved.publishedAt, null);
  });

  it('converts future published items to scheduled', () => {
    const now = new Date('2026-08-20T12:00:00Z');
    const resolved = resolveStatusOnSave({
      status: 'published',
      publishAt: new Date('2026-08-21T12:00:00Z'),
      now,
    });
    assert.equal(resolved.status, 'scheduled');
  });
});

describe('CMS security', () => {
  it('strips HTML and unsafe URLs from markdown', () => {
    const clean = sanitizeMarkdown('<script>alert(1)</script>Hello [x](javascript:alert(1))');
    assert.equal(clean.includes('<script>'), false);
    assert.equal(clean.includes('javascript:'), false);
    assert.equal(clean.includes('Hello'), true);
  });

  it('rejects javascript URLs', () => {
    assert.equal(isSafePublicUrl('javascript:alert(1)'), false);
    assert.equal(isSafePublicUrl('/uploads/content/photo.webp'), true);
    assert.equal(isSafePublicUrl('https://example.com/a.jpg'), true);
  });

  it('blocks reserved page slugs', () => {
    assert.equal(RESERVED_PAGE_SLUGS.has('about'), true);
    assert.equal(RESERVED_PAGE_SLUGS.has('admin'), true);
    assert.equal(RESERVED_PAGE_SLUGS.has('church-history'), false);
  });

  it('creates URL-friendly unique slug bases', () => {
    assert.equal(slugify('Youth Program!'), 'youth-program');
  });

  it('members cannot access the admin portal or publish', () => {
    const member = user('member');
    assert.equal(canAccessAdminPortal(member), false);
    assert.equal(hasPermission(member, 'content', 'create'), false);
    assert.equal(hasPermission(member, 'content', 'publish'), false);
    assert.equal(allowedWriteStatus(member, 'published'), 'draft');
  });

  it('church leaders can create but not publish', () => {
    const leader = user('church_leader');
    assert.equal(hasPermission(leader, 'content', 'create'), true);
    assert.equal(hasPermission(leader, 'content', 'publish'), false);
    assert.equal(allowedWriteStatus(leader, 'published'), 'draft');
  });

  it('pastors and admins can publish', () => {
    assert.equal(hasPermission(user('pastor'), 'content', 'publish'), true);
    assert.equal(hasPermission(user('admin'), 'content', 'publish'), true);
    assert.equal(allowedWriteStatus(user('admin'), 'published'), 'published');
  });

  it('members have content view for public reading helpers only', () => {
    assert.equal(can(user('member'), 'content.view'), true);
    assert.equal(canAccessAdminPortal(user('member')), false);
  });
});
