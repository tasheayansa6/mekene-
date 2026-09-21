import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isPubliclyVisible } from '../content/status';
import { formatScriptureLabel, parseApprovedVideo } from './video';
import {
  allowedSermonStatus,
  canArchiveSermon,
  canDeleteSermon,
  canPublishSermon,
  RESERVED_SERMON_SLUGS,
} from './access';
import { relatedSermonScore, formatPlayerTime, sermonJsonLd } from './player';
import { can, hasPermission } from '../auth/permissions';
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

describe('sermon visibility', () => {
  it('hides drafts, review, and archived sermons', () => {
    const now = new Date('2026-08-20T12:00:00Z');
    assert.equal(isPubliclyVisible({ status: 'draft', publishAt: null }, now), false);
    assert.equal(isPubliclyVisible({ status: 'review', publishAt: null }, now), false);
    assert.equal(isPubliclyVisible({ status: 'archived', publishAt: now }, now), false);
  });

  it('hides scheduled sermons until publishAt', () => {
    const now = new Date('2026-08-20T12:00:00Z');
    assert.equal(
      isPubliclyVisible({ status: 'scheduled', publishAt: new Date('2026-08-20T13:00:00Z') }, now),
      false
    );
    assert.equal(
      isPubliclyVisible({ status: 'scheduled', publishAt: new Date('2026-08-20T11:00:00Z') }, now),
      true
    );
  });
});

describe('video URL allow-list', () => {
  it('accepts YouTube and Vimeo URLs', () => {
    const youtube = parseApprovedVideo('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    assert.equal(youtube?.provider, 'youtube');
    assert.equal(youtube?.embedUrl.startsWith('https://www.youtube-nocookie.com/embed/'), true);
    const vimeo = parseApprovedVideo('https://vimeo.com/123456789');
    assert.equal(vimeo?.provider, 'vimeo');
    assert.equal(vimeo?.embedUrl, 'https://player.vimeo.com/video/123456789');
  });

  it('rejects javascript and unknown hosts', () => {
    assert.equal(parseApprovedVideo('javascript:alert(1)'), null);
    assert.equal(parseApprovedVideo('https://evil.example/embed/abc'), null);
    assert.equal(parseApprovedVideo('<iframe src="https://youtube.com"></iframe>'), null);
  });
});

describe('scripture labels', () => {
  it('formats book, chapter, and verse ranges', () => {
    assert.equal(formatScriptureLabel({ book: 'John', chapter: 3, verseStart: 16 }), 'John 3:16');
    assert.equal(
      formatScriptureLabel({ book: 'Psalm', chapter: 23, verseStart: 1, verseEnd: 6 }),
      'Psalm 23:1-6'
    );
    assert.equal(formatScriptureLabel({ book: 'Romans', chapter: 8 }), 'Romans 8');
  });
});

describe('permissions', () => {
  it('does not let members publish sermons', () => {
    const member = user('member');
    assert.equal(canPublishSermon(member), false);
    assert.equal(allowedSermonStatus(member, 'published'), 'draft');
    assert.equal(hasPermission(member, 'sermons', 'create'), false);
  });

  it('lets media team manage sermon media but not archive', () => {
    const media = user('media_team');
    assert.equal(can(media, 'sermons.create'), true);
    assert.equal(can(media, 'sermons.update'), true);
    assert.equal(canPublishSermon(media), true);
    assert.equal(canArchiveSermon(media), false);
    assert.equal(canDeleteSermon(media), false);
  });

  it('gives church leaders sermon view only', () => {
    const leader = user('church_leader');
    assert.equal(can(leader, 'sermons.view'), true);
    assert.equal(can(leader, 'sermons.create'), false);
    assert.equal(canPublishSermon(leader), false);
  });
});

describe('related sermons and players', () => {
  it('ranks same series ahead of speaker and category', () => {
    const current = { seriesId: 's1', speakerId: 'p1', categoryId: 'c1' };
    assert.equal(relatedSermonScore(current, { seriesId: 's1', speakerId: 'x', categoryId: 'y' }), 0);
    assert.equal(relatedSermonScore(current, { seriesId: 'x', speakerId: 'p1', categoryId: 'y' }), 1);
    assert.equal(relatedSermonScore(current, { seriesId: 'x', speakerId: 'y', categoryId: 'c1' }), 2);
  });

  it('formats player time and omits empty media from JSON-LD', () => {
    assert.equal(formatPlayerTime(65), '1:05');
    assert.equal(formatPlayerTime(Number.NaN), '0:00');
    const json = sermonJsonLd({
      title: 'Demo',
      url: 'https://example.org/sermons/demo',
      sermonDate: '2026-08-20T00:00:00.000Z',
    });
    assert.equal(json.associatedMedia, undefined);
  });

  it('reserves public sermon slugs', () => {
    assert.equal(RESERVED_SERMON_SLUGS.has('series'), true);
    assert.equal(RESERVED_SERMON_SLUGS.has('create'), true);
  });
});

describe('media security', () => {
  it('signs and verifies short-lived download tokens', async () => {
    const { createSignedMediaToken, verifySignedMediaToken, isBlockedUploadFilename } =
      await import('./media-security');
    const signed = createSignedMediaToken({
      path: 'uploads/sermons/demo.mp3',
      userId: 'user-1',
      ttlSeconds: 120,
    });
    const ok = verifySignedMediaToken(signed.token, 'uploads/sermons/demo.mp3');
    assert.equal(ok.ok, true);
    const bad = verifySignedMediaToken(signed.token, 'uploads/sermons/other.mp3');
    assert.equal(bad.ok, false);
    assert.equal(isBlockedUploadFilename('notes.exe'), true);
    assert.equal(isBlockedUploadFilename('notes.pdf'), false);
  });
});

describe('youtube provider architecture', () => {
  it('resolves approved embeds without scraping', async () => {
    const { resolveExternalVideo, getYoutubeProviderConfig } = await import('./youtube');
    const embed = resolveExternalVideo('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    assert.equal(embed?.provider, 'youtube');
    assert.equal(typeof getYoutubeProviderConfig().configured, 'boolean');
  });
});
