import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isAllowedFacebookVideoUrl,
  resolveStreamConfig,
  sanitizeEmbedUrl,
} from './providers';
import {
  canPublicView,
  deriveDisplayStatus,
  isPubliclyLive,
} from './status';
import { ALLOWED_REACTIONS, isAllowedReaction } from './reactions';
import { isDuplicateChatMessage, CHAT_DUPLICATE_WINDOW_MS } from './chat';
import { parseApprovedVideo } from '@/lib/sermons/video';

describe('live embed sanitize', () => {
  it('blocks javascript and data URLs', () => {
    assert.equal(sanitizeEmbedUrl('javascript:alert(1)'), null);
    assert.equal(sanitizeEmbedUrl('data:text/html,hello'), null);
  });

  it('allows approved embed hosts', () => {
    const url = sanitizeEmbedUrl('https://www.youtube-nocookie.com/embed/abc123');
    assert.equal(url?.startsWith('https://www.youtube-nocookie.com/embed/abc123'), true);
  });

  it('rejects unknown embed hosts', () => {
    assert.equal(sanitizeEmbedUrl('https://evil.example/embed/abc'), null);
  });
});

describe('resolveStreamConfig', () => {
  it('builds youtube live embed with autoplay', () => {
    const result = resolveStreamConfig({
      provider: 'youtube',
      streamUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.match(result.embedUrl, /autoplay=1/);
      assert.equal(result.providerVideoId, 'dQw4w9WgXcQ');
    }
  });

  it('parses youtube /live/ URLs', () => {
    const parsed = parseApprovedVideo('https://www.youtube.com/live/abc123XYZ_-');
    assert.equal(parsed?.id, 'abc123XYZ_-');
  });

  it('builds facebook plugin embed from public URL', () => {
    const url = 'https://www.facebook.com/watch/?v=123456789';
    assert.equal(isAllowedFacebookVideoUrl(url), true);
    const result = resolveStreamConfig({ provider: 'facebook', streamUrl: url });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.match(result.embedUrl, /^https:\/\/www\.facebook\.com\/plugins\/video\.php\?href=/);
    }
  });
});

describe('live status display rules', () => {
  it('shows starting_soon within 15 minutes without changing DB status', () => {
    const now = new Date('2026-08-26T10:00:00Z');
    const session = {
      status: 'scheduled' as const,
      scheduledStartAt: new Date('2026-08-26T10:10:00Z'),
    };
    assert.equal(deriveDisplayStatus(session, now), 'starting_soon');
    assert.equal(session.status, 'scheduled');
  });

  it('never treats scheduled sessions as publicly live', () => {
    assert.equal(isPubliclyLive({ status: 'scheduled' }), false);
    assert.equal(isPubliclyLive({ status: 'live' }), true);
  });
});

describe('live visibility', () => {
  it('allows public sessions for guests', () => {
    assert.equal(canPublicView({ visibility: 'public', status: 'scheduled' }, null), true);
  });

  it('requires auth for members-only sessions', () => {
    assert.equal(canPublicView({ visibility: 'members', status: 'scheduled' }, null), false);
    assert.equal(
      canPublicView(
        { visibility: 'members', status: 'scheduled' },
        {
          id: 'u1',
          email: 'a@b.com',
          firstName: 'A',
          lastName: 'B',
          phone: null,
          profileImage: null,
          status: 'active',
          isVerified: true,
          lastLoginAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          role: { id: 'r1', slug: 'member', name: 'Member', hierarchy: 50, isPrivileged: false },
          permissions: [],
        }
      ),
      true
    );
  });

  it('hides cancelled sessions', () => {
    assert.equal(canPublicView({ visibility: 'public', status: 'cancelled' }, null), false);
  });
});

describe('reaction allowlist', () => {
  it('accepts only approved emoji', () => {
    for (const emoji of ALLOWED_REACTIONS) {
      assert.equal(isAllowedReaction(emoji), true);
    }
    assert.equal(isAllowedReaction('🔥'), false);
  });
});

describe('chat duplicate logic', () => {
  it('blocks identical messages within 30 seconds', () => {
    const now = new Date('2026-08-26T10:00:00Z');
    const previous = {
      body: 'Amen!',
      createdAt: new Date(now.getTime() - 10_000),
    };
    assert.equal(isDuplicateChatMessage(previous, 'Amen!', now), true);
    assert.equal(isDuplicateChatMessage(previous, 'Hello', now), false);
    assert.equal(
      isDuplicateChatMessage(
        { body: 'Amen!', createdAt: new Date(now.getTime() - CHAT_DUPLICATE_WINDOW_MS - 1) },
        'Amen!',
        now
      ),
      false
    );
  });
});
