import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isGalleryPubliclyVisible, publicGalleryWhere, resolveGalleryStatusOnSave } from './status';
import {
  allowedGalleryStatus,
  canArchiveGallery,
  canDeleteGallery,
  canPublishGallery,
  canUploadGallery,
  isMeaninglessAlt,
  RESERVED_ALBUM_SLUGS,
} from './access';
import { parseApprovedVideo } from '../sermons/video';
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

describe('gallery visibility', () => {
  it('hides draft, review, and archived albums from the public', () => {
    assert.equal(isGalleryPubliclyVisible({ status: 'draft' }), false);
    assert.equal(isGalleryPubliclyVisible({ status: 'review' }), false);
    assert.equal(isGalleryPubliclyVisible({ status: 'archived' }), false);
    assert.equal(isGalleryPubliclyVisible({ status: 'published' }), true);
    assert.equal(
      isGalleryPubliclyVisible({ status: 'published', publishAt: new Date(Date.now() + 60_000) }),
      false
    );
  });

  it('public queries only include published albums', () => {
    const where = publicGalleryWhere();
    assert.equal(where.status, 'published');
  });
});

describe('gallery alt text and video URLs', () => {
  it('rejects filename-like alt text', () => {
    assert.equal(isMeaninglessAlt('IMG_1234.jpg'), true);
    assert.equal(isMeaninglessAlt('photo.png'), true);
    assert.equal(isMeaninglessAlt('Choir during Sunday worship'), false);
  });

  it('allows only approved video hosts', () => {
    assert.ok(parseApprovedVideo('https://www.youtube.com/watch?v=dQw4w9WgXcQ'));
    assert.ok(parseApprovedVideo('https://vimeo.com/123456789'));
    assert.equal(parseApprovedVideo('https://evil.example/video/1'), null);
    assert.equal(parseApprovedVideo('<iframe src="https://youtube.com"></iframe>'), null);
  });
});

describe('gallery permissions', () => {
  it('does not let members or anonymous users manage gallery content', () => {
    const member = user('member');
    assert.equal(hasPermission(member, 'gallery', 'view'), false);
    assert.equal(canUploadGallery(member), false);
    assert.equal(canPublishGallery(member), false);
  });

  it('lets media team upload and organize but not publish', () => {
    const media = user('media_team');
    assert.equal(canUploadGallery(media), true);
    assert.equal(canDeleteGallery(media), true);
    assert.equal(canPublishGallery(media), false);
    assert.equal(canArchiveGallery(media), false);
    assert.equal(allowedGalleryStatus(media, 'published'), 'draft');
  });

  it('lets pastors review and publish without creating albums by default', () => {
    const pastor = user('pastor');
    assert.equal(hasPermission(pastor, 'gallery', 'create'), false);
    assert.equal(canPublishGallery(pastor), true);
    assert.equal(canArchiveGallery(pastor), true);
    assert.equal(allowedGalleryStatus(pastor, 'published'), 'published');
  });

  it('gives administrators full gallery management', () => {
    const admin = user('admin');
    assert.equal(hasPermission(admin, 'gallery', 'manage'), true);
    assert.equal(canPublishGallery(admin), true);
    assert.equal(canDeleteGallery(admin), true);
  });

  it('reserves public route slugs', () => {
    assert.equal(RESERVED_ALBUM_SLUGS.has('create'), true);
    assert.equal(RESERVED_ALBUM_SLUGS.has('photos'), true);
  });

  it('does not auto-publish on save without publish permission', () => {
    const media = user('media_team');
    const resolved = resolveGalleryStatusOnSave({
      status: allowedGalleryStatus(media, 'published'),
    });
    assert.equal(resolved.status, 'draft');
  });
});
