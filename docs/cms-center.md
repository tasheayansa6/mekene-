# Phase 25 — Church Content Management System (CMS Center)

Extends Phase 8 CMS. Does **not** duplicate pages, news, announcements, resources, sermons, gallery, media, events, or ministries.

## Architecture

```
Existing content modules (Phase 8–18)
        ↓
CMS Center hub (/admin/cms) + Phase 25 models
        ↓
Public site (homepage sections, menus, FAQ, testimonials, devotionals)
```

Canonical content editing remains under `/admin/content/*`, `/admin/sermons/*`, `/admin/gallery/*`, `/admin/media`, `/admin/church/*`.

## New models

| Model | Purpose |
|-------|---------|
| `CmsHomepageSection` | Enable/reorder/configure homepage sections (references existing content) |
| `ContentRevision` | Version snapshots for CMS entities |
| `ContentRedirect` | Old slug → new slug (301) |
| `ContentTranslation` | en / om / am translations with review status |
| `CmsFaq` | FAQ accordion content |
| `CmsTestimonial` | Public only if published **and** `permissionGranted` |
| `CmsMenu` / `CmsMenuItem` | Main, footer, mobile navigation |

`CmsPage` extended: `visibility`, `language`, `expiresAt`.

## Publishing workflow (reused)

```
Draft → Review → Scheduled/Published → Archived
```

Scheduled promotion via `promoteScheduledContent()`. Expired pages (`expiresAt`) leave public listings. Preview remains auth-only.

## Admin routes

| Path | Notes |
|------|-------|
| `/admin/cms` | Dashboard hub |
| `/admin/cms/homepage` | Section builder |
| `/admin/cms/faqs` | FAQ management |
| `/admin/cms/menus` | Navigation |
| `/admin/cms/testimonials` | Testimonials |
| `/admin/cms/review` | Review queue |
| `/admin/cms/calendar` | Scheduled publications |
| `/admin/cms/pages` → `/admin/content/pages` | Alias |
| `/admin/cms/sermons` → `/admin/sermons` | Alias |

## Public routes

| Path | Notes |
|------|-------|
| `/faq` | Published FAQs |
| `/downloads` | Redirects to `/resources` |
| `/testimonials` | Permission-granted only |
| `/devotionals` | Sermons with `contentType=devotion` |
| `/pages` | Published CMS pages index |
| `/pages/[slug]` | + slug redirects |

## APIs

Admin: `/api/v1/admin/cms/{homepage,faqs,testimonials,menus,overview,calendar,review-queue,revisions,translations}`

Public: `/api/v1/content/{faqs,testimonials,menus/[location],homepage}` + search includes FAQs.

## RBAC

Existing `content:*` (view, create, update, delete, publish, archive, manage). No new resource — CMS center uses the same permission set.

## Multilingual

Languages: `en`, `om` (Afaan Oromo), `am` (Amharic). Translations require publish status; fallback to original language when missing.

## Security

- Menu hrefs sanitized (no `javascript:`)
- Rich/markdown sanitization unchanged
- Private/draft never public
- Testimonials need explicit permission
- Revisions restore returns snapshot; apply through authorized PATCH
- Anonymous CMS admin APIs return 401

## Tests

```
npm run test:cms
npm run test:cms:api
```

## Migration

`20260826160000_phase25_cms_center`
