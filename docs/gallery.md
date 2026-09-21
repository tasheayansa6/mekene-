# Phase 12 — Church Gallery & Media Library

Authorized staff manage albums, photos, videos, and categories from `/admin/gallery`. The public gallery at `/gallery` shows **published** albums and **published** media only. Official church photographs and videos are **not** invented in code.

This project uses the existing Next.js App Router API (not Django). Models live in Prisma. There is no duplicate `backend/apps/gallery` app and no second file-storage system.

## Architecture

```
Prisma (GalleryCategory, GalleryAlbum, GalleryMediaItem)
  ├── Files        public/uploads/gallery/  (existing Sharp/WebP pipeline)
  ├── Public API   /api/v1/gallery/*
  ├── Admin API    /api/v1/admin/gallery/*
  ├── Admin UI     /admin/gallery/*
  └── Public UI    /gallery, /gallery/[slug], homepage, event, ministry
```

Albums may link to existing `Event` and `Ministry` records. Videos reuse the sermon YouTube/Vimeo allow-list. Sermon videos should be linked, not copied.

## Models

| Model | Notes |
| --- | --- |
| `GalleryCategory` | Configurable types. Seed examples (Worship, Youth, …) are taxonomy only |
| `GalleryAlbum` | Title, slug, description, cover, category, event, ministry, date, status, featured, SEO |
| `GalleryMediaItem` | Photo or video, caption, alt text, photographer, sort order, optional sermon link |
| `GalleryStatus` | `draft`, `review`, `published`, `archived` |

Draft albums never appear in public APIs. Unpublished media never appears even if the album is published. Uploads always start as drafts.

Featured albums are capped at **3**.

## Storage

Photos reuse `src/lib/content/uploads.ts`: MIME type, extension, magic-byte sniffing, max 5MB, min 80×80, converted to WebP. A large (≤1600px) and thumbnail (≤640px) are written under `public/uploads/gallery/` with unguessable names.

Large video binaries are **not** stored in SQLite or the local upload folder. Public videos must use YouTube or Vimeo. Arbitrary HTML is never rendered.

Draft files still live under `public/uploads` like other CMS/event images. Public APIs never return those URLs. Filenames are not guessable, but hiding a URL is not access control.

## API

Public:

- `GET /api/v1/gallery/albums`
- `GET /api/v1/gallery/albums/{slug}`
- `GET /api/v1/gallery/categories`
- `GET /api/v1/gallery/media`

Admin (authenticated, CSRF, `gallery.*` permissions):

- `/api/v1/admin/gallery/albums`
- `/api/v1/admin/gallery/albums/{id}`
- `/api/v1/admin/gallery/albums/{id}/media` (POST add, PUT reorder)
- `/api/v1/admin/gallery/uploads`
- `/api/v1/admin/gallery/categories`
- `/api/v1/admin/gallery/options`

Filters: `search`/`q`, `category`, `ministry`, `event`, `featured`, `type`, `sort=newest|oldest|featured`, `page`.

## Admin routes

- `/admin/gallery` albums table
- `/admin/gallery/albums/create`
- `/admin/gallery/albums/[id]` edit, media upload/reorder, publish, archive
- `/admin/gallery/photos` and `/videos`
- `/admin/gallery/categories`
- `/admin/gallery?status=archived`

Bulk photo upload is limited to 12 files per request. Progress and retry are shown without blocking the rest of the admin UI. Drag-and-drop order is persisted; Move up/Move down remain available.

## Public routes

- `/gallery` featured, latest, search, filters, pagination
- `/gallery/[slug]` photos (lightbox), videos (lazy embed), share, SEO

Homepage gallery is hidden when no published photos exist. Event and ministry pages show “Event Gallery” / “Ministry Gallery” only when published albums exist.

## RBAC

Resource: `gallery`

| Role | Permissions |
| --- | --- |
| Administrator | view, create, update, delete, publish, archive, manage |
| Pastor | view, update, publish, archive (review/publish) |
| Media team | view, create, update, delete (upload/organize; **not** publish) |
| Church leader | view |
| Member | public gallery only |

Existing roles were not given extra gallery rights beyond the matrix above. Members cannot upload.

## Audit

`gallery.album_created`, `album_updated`, `album_published`, `album_archived`, `media_uploaded`, `media_updated`, `media_published`, `media_removed`, `media_reordered`. Binary file contents are never logged.

## Tests

```bash
npx tsx --test src/lib/gallery/*.test.ts
npx tsx scripts/gallery-api-tests.ts   # requires a running server
```

Seed creates categories only. No church photographs or videos are generated.
