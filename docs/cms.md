# Phase 8 — Content Management System

Administrators manage public website content from `/admin/content` without changing source code. The public site reads **published** records from PostgreSQL/SQLite through `/api/v1/content/*` and shared query helpers. Official church news, announcements, and documents are **not** invented in code.

This project uses the existing Next.js App Router API (not Django). Models live in Prisma. There is no duplicate `backend/apps/content` app.

**Phase 25** adds the CMS Center hub (homepage sections, menus, FAQs, testimonials, revisions, redirects, translations). See [cms-center.md](./cms-center.md).

## Architecture

```
Prisma (CmsPage, NewsArticle, Announcement, Resource, ContentCategory, ContentTag)
  ├── Public API   /api/v1/content/*
  ├── Admin API    /api/v1/admin/content/*
  ├── Admin UI     /admin/content/*
  └── Public UI    /news, /announcements, /resources, /pages/[slug], /search, homepage sections
```

Markdown is stored (not raw HTML). Server sanitization strips tags and blocks `javascript:` / `data:` URLs. Public rendering uses `react-markdown` with `skipHtml`.

## Models

| Model | Notes |
| --- | --- |
| `CmsPage` | Flexible pages. Public URL `/pages/[slug]`. Reserved slugs cannot override `/about`, `/contact`, etc. |
| `NewsArticle` | News with optional category and reusable tags |
| `Announcement` | Short message + body, priority, `startAt` / `endAt` |
| `Resource` | Downloadable files or external URL, download count |
| `ContentCategory` | Configurable, scoped to `news` or `resource` |
| `ContentTag` | Reusable tags (news now; other types later) |
| `CmsStatus` | `draft`, `review`, `scheduled`, `published`, `archived` |

`CmsStatus` is separate from ministry `ContentStatus` so scheduled publishing does not leak into church/ministry records.

Expired announcements stay in the database. They are hidden from public lists after `endAt`.

Featured items are capped at **3** per type.

## Workflow

```
Draft → Review → Scheduled/Published → Archived
```

Create never auto-publishes. If `publishAt` is in the future, status becomes `scheduled`. Public APIs call `promoteScheduledContent()` so due items become published without a separate worker. Visibility also checks `publishAt <= now` so a missed promotion still cannot leak early.

Preview is authorized only (`/admin/content/.../preview`). Drafts are never public.

## Permissions

Existing RBAC resource `content`:

- `content.view` / `create` / `update` / `delete` / `publish` / `archive` / `manage`

Members may have `content:view` for future member features but **cannot** open `/admin`. Church leaders can create/update drafts; they cannot publish. Pastors and administrators can publish.

## Public API

- `GET /api/v1/content/pages/`
- `GET /api/v1/content/pages/{slug}/`
- `GET /api/v1/content/news/`
- `GET /api/v1/content/news/{slug}/`
- `GET /api/v1/content/announcements/`
- `GET /api/v1/content/resources/`
- `GET /api/v1/content/resources/{slug}/download`
- `GET /api/v1/content/search?q=`
- `GET /api/v1/content/home/`
- `GET /api/v1/content/categories?scope=`
- `GET /api/v1/content/tags/`

Public search only includes published (or due scheduled) content. Drafts, future scheduled items, and archived items are excluded.

## Admin API

CRUD under `/api/v1/admin/content/{pages,news,announcements,resources,categories,tags}` plus:

- `POST .../bulk` (`publish`, `unpublish`, `archive`, `delete`, `schedule`)
- `POST /api/v1/admin/content/uploads` (`kind=image|resource|thumbnail`)
- `GET /api/v1/admin/content/overview`

Mutations require CSRF and `content:*` permissions. Destructive UI confirms archive. Published church content is archived, not hard-deleted.

## Admin routes

- `/admin/content`
- `/admin/content/pages|news|announcements|resources` (+ `/create`, `/[id]`, `/[id]/preview`)
- `/admin/content/categories`
- `/admin/content/tags`

Legacy `/admin/announcements` and `/admin/resources` redirect into the CMS.

## Public routes

- `/news`, `/news/[slug]`
- `/announcements`
- `/resources`
- `/pages/[slug]` (does not override `/about`, `/contact`, `/ministries`, `/sermons`, `/events`)
- `/search?q=`
- Homepage sections: latest/featured news, featured announcements, featured resources — **hidden when empty**

## SEO and files

Each item supports `seoTitle`, `seoDescription`, and image URLs. Defaults come from title/excerpt. Canonical + Open Graph tags use `createPageMetadata`. Images are optimized to WebP (max 5MB). Resource files: PDF/Word/text, max 15MB, stored under `/uploads/resources/` (not raw filesystem paths). Downloads are rate-limited per IP.

## Audit and events

Writes call `emitContentEvent` → `AuditLog` (`content.published`, `announcement.created`, `category.created`, …). Secrets are stripped. These events are ready for a future notification phase.

## Seed

Categories and tags only. No fake church news or announcements.

## Tests

```
npx tsx --test src/lib/content/*.test.ts
npx tsx scripts/cms-api-tests.ts   # requires a running server
```
