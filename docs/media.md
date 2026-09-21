# Phase 18 — Sermons, Bible Study & Digital Media Library

Extends Phase 9 sermons and Phase 8 CMS resources into one media library. Bible study is a `contentType` on `Sermon`, not a separate table.

**Phase 26** adds the public `/library` hub, playlists UI, playback progress, podcast RSS, media analytics/health, and enhanced players. See [digital-library.md](./digital-library.md).

## Content model

| Field | Purpose |
|-------|---------|
| `contentType` | `sermon`, `bible_study`, `devotion`, `teaching`, `testimony`, `conference`, `special` |
| `accessLevel` | `public`, `members`, `restricted` (enforced on list, detail, downloads) |
| Copyright | `copyrightHolder`, `license`, `sourceAttribution` on sermons and resources |
| Bookmarks | `SermonBookmark` (member-private) |
| Playlists | `MediaPlaylist` / `MediaPlaylistItem` (schema ready) |
| Jobs | `MediaProcessingJob` (queue architecture; workers optional) |

## Public surfaces

- `/sermons`, `/sermons/[slug]`, `/sermons/series/[slug]` (existing)
- `/bible-study` — published items with `contentType=bible_study`
- `/sermons/speakers/[slug]` — published leader speakers (`Leader.slug`)
- Search includes title, description, transcript, speaker, series, scripture

Draft / review / archived / future-scheduled content never appears publicly. Restricted content is never listed for anonymous users.

## Member

- `/member/bookmarks` + `GET/POST /api/v1/member/bookmarks`, `DELETE /api/v1/member/bookmarks/[id]`
- Member-level downloads require auth; optional signed tokens via `createSignedMediaToken`

## Admin

- `/admin/media` — overview metrics (`GET /api/v1/admin/media/overview`)
- Sermon CRUD supports `contentType`, `accessLevel`, copyright fields
- Resources reuse `/admin/content/resources` with access/copyright fields on the model
- Nav “Media” is live (no Coming Soon)

## YouTube / video

- Staff paste approved YouTube/Vimeo URLs only (`parseApprovedVideo`)
- Privacy-enhanced YouTube embeds; no unofficial download/scraping
- `YOUTUBE_API_KEY` is server-only and optional; Phase 18 stores references, not fetched third-party binaries

## Security

- Access levels enforced server-side on public queries and download route
- Rate-limited downloads; path confined to `uploads/sermons/`
- Executable extensions blocked helper: `isBlockedUploadFilename`
- No private credentials in frontend; sanitize HTML/markdown on write paths

## RBAC

Reuses `sermons.*` and `media.*`. Media overview accepts `media.view` or `sermons.view`. Media team retains media + sermon create/update/publish.

## Env

| Variable | Notes |
|----------|--------|
| `MEDIA_SIGNING_SECRET` | Optional; falls back to auth secret for signed downloads |
| `YOUTUBE_API_KEY` | Optional future official API; never expose to client |

## Tests

- Unit: `npm run test:sermons` (includes media signing + YouTube resolve)
- API anon: `npm run test:media:api` (server must be running)
