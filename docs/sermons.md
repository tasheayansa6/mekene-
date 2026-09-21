# Phase 9 — Sermon Management & Public Sermon Library

Authorized staff manage sermons, series, categories, speakers, media, and publishing from `/admin/sermons`. The public library at `/sermons` shows **published** records only. Official church sermons are **not** invented in code.

This project uses the existing Next.js App Router API (not Django). Models live in Prisma. There is no duplicate `backend/apps/sermons` app.

## Architecture

```
Prisma (Sermon, SermonSeries, SermonCategory, SermonScripture)
  ├── Public API   /api/v1/sermons/*
  ├── Admin API    /api/v1/admin/sermons/*
  ├── Admin UI     /admin/sermons/*
  └── Public UI    /sermons, /sermons/[slug], /sermons/series/[slug], homepage
```

Speakers reuse `Leader` when the speaker is a church leader. Guest speakers use `speakerName` so people records are not duplicated.

Video is **YouTube/Vimeo only**. Large video files are not stored on the application server. Audio, notes, and thumbnails use `public/uploads/sermons/` (not PostgreSQL).

## Models

| Model | Notes |
| --- | --- |
| `Sermon` | Title, slug, description, speaker, series, category, date, media, transcript, CMS status, featured, SEO |
| `SermonSeries` | Reusable series with its own publish status |
| `SermonCategory` | Configurable labels (Sunday Service, Bible Study, … are seed examples only) |
| `SermonScripture` | Book, chapter, start/end verse, display order. No Bible text is stored automatically |
| `CmsStatus` | `draft`, `review`, `scheduled`, `published`, `archived` |

Only published sermons (and due scheduled items after promotion) appear publicly. Featured sermons are capped at **3**.

## Workflow

```
Draft → Review → Scheduled/Published → Archived
```

Create never auto-publishes. Preview is authorized only (`/admin/sermons/[id]/preview`).

## Permissions

RBAC resource `sermons`:

- `sermons.view` / `create` / `update` / `delete` / `publish` / `archive` / `manage`

Media Team can create/update sermon media and publish if granted `sermons:publish`. Archive and delete remain separate. Members cannot manage or publish sermons.

## Public API

- `GET /api/v1/sermons/` (`search`/`q`, `speaker`, `series`, `category`, `featured`, `from`, `to`, `sort`, `page`)
- `GET /api/v1/sermons/{slug}/`
- `GET /api/v1/sermons/{slug}/download?kind=audio|notes`
- `GET /api/v1/sermons/series/`
- `GET /api/v1/sermons/series/{slug}/`
- `GET /api/v1/sermons/categories/`

Category pages use `/sermons?category={slug}` instead of a duplicate route.

## Admin API

CRUD under `/api/v1/admin/sermons`, plus series, categories, bulk actions, uploads (`kind=image|audio|notes`), and options (speakers/series/categories for forms).

## Media rules

- Audio: MP3 / M4A / WAV, max 40MB, MIME + extension + file signature
- Notes: PDF / Word / text, max 15MB
- Images: JPEG / PNG / WebP, converted to WebP, max 5MB
- Video: approved YouTube/Vimeo URLs only; embeds use `youtube-nocookie` / `player.vimeo.com`
- Downloads go through the public download endpoint; storage paths stay under `/uploads/sermons/`

## Tests

```bash
npx tsx --test src/lib/sermons/*.test.ts
APP_URL=http://localhost:3000 npx tsx scripts/sermons-api-tests.ts
```
