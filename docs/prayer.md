# Phase 11 — Prayer Request & Prayer Ministry

Authorized visitors and members can submit prayer requests. Privacy is enforced on the server. This project uses the existing Next.js App Router API (not Django). Models live in Prisma. There is no duplicate `backend/apps/prayer` app.

## Architecture

```
Prisma (PrayerRequest, PrayerCategory, PrayerNote, PrayerInteraction)
  ├── Public API   /api/v1/prayer/*
  ├── Admin API    /api/v1/admin/prayer/*
  ├── Admin UI     /admin/prayer/*
  ├── Member UI    /member/prayer, /member/prayer/[id]
  └── Public UI    /prayer, /prayer/request, /prayer/[id]
```

Frontend hiding is not security. Private and unapproved requests are filtered in the API.

## Models

| Model | Notes |
| --- | --- |
| `PrayerRequest` | Title, content, requester (`userId` or optional guest fields), anonymous flag, visibility, status, category, assignment, public approval timestamps, prayed count, optional requester-visible update |
| `PrayerCategory` | Configurable labels (Health, Family, … are seed examples only) |
| `PrayerNote` | Internal prayer-team notes. Never public. Never shown to the requester |
| `PrayerInteraction` | “I prayed” acknowledgements keyed by a hashed actor token |

Default visibility is **private**. Selecting public still requires moderator approval (`publicApproved`) before the request can appear on `/prayer`.

## Privacy model

- Private requests never appear in public APIs or public pages.
- A public URL or known ID does not reveal a private or unapproved record (404).
- Members can list and open only rows where `userId` matches the session. The client cannot supply another `user_id`.
- Anonymous public display never includes identity. Moderators and administrators with `prayer.moderate` or `prayer.manage` may see internal identity when reviewing.
- Internal notes never appear in public or member serializers.
- Audit logs record action, request id, and status — not prayer content, notes, emails, or tokens.
- Public prayer pages send `noindex` unless Settings → “Allow search engines to index public prayer pages” is enabled. Individual requests are not added to the sitemap.

## Status workflow

```
Submitted (New)
    → Under Review
    → Assigned
    → Praying
    → Answered
    → Archived
```

Requests can be rejected or archived without passing through every state. Answered is never automatic.

Member-facing labels: Received, Being Reviewed, Prayer Team Assigned, Being Prayed For, Answered, Archived, Closed.

## API

### Public

- `GET /api/v1/prayer/options` — categories, guest-submission flag, privacy notice
- `GET /api/v1/prayer/public` — approved public requests only
- `GET /api/v1/prayer/public/{id}` — 404 unless approved public
- `POST /api/v1/prayer/public/{id}/pray` — CSRF; one acknowledgement per hashed actor
- `POST /api/v1/prayer/requests` — create (guest if enabled, or signed-in user)

### Member

- `GET /api/v1/prayer/my`
- `GET /api/v1/prayer/my/{id}`

### Admin (admin portal + `prayer.*` permission)

- `GET /api/v1/admin/prayer`
- `GET /api/v1/admin/prayer/{id}`
- `PATCH /api/v1/admin/prayer/{id}`
- `POST /api/v1/admin/prayer/{id}/assign`
- `POST /api/v1/admin/prayer/{id}/approve`
- `POST /api/v1/admin/prayer/{id}/reject`
- `POST /api/v1/admin/prayer/{id}/review`
- `POST /api/v1/admin/prayer/{id}/archive`
- `POST /api/v1/admin/prayer/{id}/notes`
- `DELETE /api/v1/admin/prayer/{id}` — super administrator, `{ confirm: true }` only

## RBAC

| Role | Prayer access |
| --- | --- |
| Member | `prayer:create` (own submissions via session; no admin queue) |
| Prayer team | `view`, `create`, `update` |
| Church leader | `view` |
| Pastor | `view`, `create`, `update`, `moderate`, `assign`, `archive` |
| Administrator | includes `manage` plus moderate/assign/archive |
| Finance / media | none |

Admin prayer routes also require `canAccessAdminPortal`. Members with `prayer:create` cannot list the queue.

## Rate limiting and CAPTCHA

- Submit: 5 per user per hour, 8 per IP per hour
- “I prayed”: unique `(requestId, actorHash)` plus 30 posts per IP per hour
- Honeypot field `website` is accepted and discarded
- CAPTCHA is optional via `PRAYER_CAPTCHA_PROVIDER`, `PRAYER_CAPTCHA_SECRET`, and `NEXT_PUBLIC_PRAYER_CAPTCHA_SITE_KEY`. If unset, verification is skipped

## Notifications

Hooks are recorded for later consumers: `prayer_request.created`, `.assigned`, `.approved`, `.status_changed`. Optional receipt email (no request body) if Settings enables it.

## Data retention

Archive is the supported close-out. Permanent deletion is restricted to Super Administrator with confirmation. `prayer_retention_days` can be stored for a future policy; nothing is auto-deleted in this phase.

## Tests

- `src/lib/prayer/prayer.test.ts`
- `scripts/prayer-api-tests.ts` (anonymous API checks against a running server)
