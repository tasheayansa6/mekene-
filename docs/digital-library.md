# Phase 26 — Sermon, Media & Digital Library Platform

Extends Phases 9 and 18. Does **not** duplicate `Sermon`, CMS, gallery, or file storage.

## Architecture

```
Sermon (+ contentType / accessLevel)
  + MediaPlaylist / MediaPlaylistItem
  + Resource (documents)
  + MediaProcessingJob
        ↓
Library hub (/library) + podcast feed + member progress
        ↓
Admin media analytics / health / playlists / jobs / reports
```

## Public library

| Route | Purpose |
|-------|---------|
| `/library` | Featured, latest, popular, studies, devotionals, playlists, categories |
| `/library/sermons` | Sermon library list |
| `/library/sermons/[slug]` | Redirects to canonical `/sermons/[slug]` |
| `/library/series` | Series index |
| `/library/playlists` | Published playlists |
| `/library/playlists/[slug]` | Playlist player (prev/next) |
| `/library/speakers` | Speaker directory |
| `/library/search` | Unified media search (incl. transcripts) |
| `/library/scripture` | Filter by Bible book |
| `/podcast` + `/podcast.xml` | Podcast landing + RSS (public audio with `allowPodcast`) |

Existing `/sermons`, `/bible-study`, `/devotionals`, `/resources` remain canonical content surfaces.

## Players

- `ChurchAudioPlayer` / `AudioPlayer` — play/pause, seek, volume, speed, ±15s, optional progress persistence, play-count ping
- `VideoPlayer` — YouTube/Vimeo allow-list; optional caption tracks for uploaded video

## Member

- `/member/library` — continue watching/listening
- `/member/library/favorites` → bookmarks
- `/member/library/history` — progress + clear
- APIs: `/api/v1/member/library/progress`, `/continue`, `/favorites`

## Admin

| Route | Purpose |
|-------|---------|
| `/admin/media` | Hub |
| `/admin/media/analytics` | Aggregate plays/downloads/popular (no user identities) |
| `/admin/media/health` | Missing files, failed jobs |
| `/admin/media/playlists` | Playlist CRUD |
| `/admin/media/jobs` | Queue + process |
| `/admin/media/reports` | Content reports |

Sermon CRUD stays at `/admin/sermons`. CMS aliases: `/admin/cms/playlists`, `/admin/cms/sermon-series`.

## Processing

`enqueueMediaJob` writes `MediaProcessingJob` with idempotency keys. `processMediaJobs` completes stub types (`metadata_probe`, `thumbnail_stub`) safely — never marks media ready without work.

## Security / privacy

- Transcripts public only when `transcriptStatus=published`
- Downloads respect `allowDownload` + `accessLevel`
- Podcast only includes public + `allowPodcast` + audio
- Progress is per authenticated user only
- Analytics are aggregates only
- Signed download tokens unchanged (`MEDIA_SIGNING_SECRET`)

## Models (new / extended)

- Extended: `Sermon`, `MediaPlaylist`, `MediaProcessingJob`
- New: `MediaPlaybackProgress`, `MediaSubtitle`, `MediaContentReport`

## Tests

```
npm run test:library
npm run test:sermons
npm run test:media:api
```

## Migration

`20260826180000_phase26_digital_library`
