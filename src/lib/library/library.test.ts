import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildJobIdempotencyKey } from './jobs';
import { isValidSubtitleFormat, subtitleFormatFromFilename } from './hash';
import { filterPodcastEligibleSermons } from './rss';
import { isPublicPlaylist } from './playlists';
import { assertProgressOwner } from './progress';

describe('podcast RSS eligibility', () => {
  it('includes only public sermons with allowPodcast and audioUrl', () => {
    const rows = [
      { accessLevel: 'public', allowPodcast: true, audioUrl: '/uploads/sermons/a.mp3' },
      { accessLevel: 'members', allowPodcast: true, audioUrl: '/uploads/sermons/b.mp3' },
      { accessLevel: 'public', allowPodcast: false, audioUrl: '/uploads/sermons/c.mp3' },
      { accessLevel: 'public', allowPodcast: true, audioUrl: null },
      { accessLevel: 'restricted', allowPodcast: true, audioUrl: '/uploads/sermons/d.mp3' },
    ];
    const eligible = filterPodcastEligibleSermons(rows);
    assert.equal(eligible.length, 1);
    assert.equal(eligible[0]?.audioUrl, '/uploads/sermons/a.mp3');
  });
});

describe('playback progress isolation', () => {
  it('allows access only for the owning user', () => {
    assert.equal(assertProgressOwner('user-a', 'user-a'), true);
    assert.equal(assertProgressOwner('user-a', 'user-b'), false);
  });
});

describe('playlist public gate', () => {
  it('requires published status and isPublic', () => {
    assert.equal(isPublicPlaylist({ status: 'published', isPublic: true }), true);
    assert.equal(isPublicPlaylist({ status: 'draft', isPublic: true }), false);
    assert.equal(isPublicPlaylist({ status: 'published', isPublic: false }), false);
  });
});

describe('media job idempotency key', () => {
  it('is stable for the same target', () => {
    const a = buildJobIdempotencyKey({
      type: 'metadata_probe',
      targetKind: 'sermon',
      targetId: 'abc',
    });
    const b = buildJobIdempotencyKey({
      type: 'metadata_probe',
      targetKind: 'sermon',
      targetId: 'abc',
    });
    assert.equal(a, b);
    assert.equal(a, 'metadata_probe:sermon:abc');
  });
});

describe('subtitle format validation', () => {
  it('accepts vtt and srt only', () => {
    assert.equal(isValidSubtitleFormat('vtt'), true);
    assert.equal(isValidSubtitleFormat('srt'), true);
    assert.equal(isValidSubtitleFormat('VTT'), true);
    assert.equal(isValidSubtitleFormat('ass'), false);
    assert.equal(isValidSubtitleFormat('txt'), false);
  });

  it('reads format from filename extension', () => {
    assert.equal(subtitleFormatFromFilename('sermon-en.vtt'), 'vtt');
    assert.equal(subtitleFormatFromFilename('sermon-en.srt'), 'srt');
    assert.equal(subtitleFormatFromFilename('sermon-en.ass'), null);
  });
});
