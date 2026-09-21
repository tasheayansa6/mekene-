# Phase 29 — Member Portal & Mobile Experience

Extends existing `/member/*` on Authentication → Member → church systems. Does not rebuild events, giving, prayer, live, notifications, or RBAC.

## Architecture

```
Authentication
  → Member
    → Member Portal
      → Services / Events / Ministries / Giving / Sermons / Prayer / Notifications / Family / Attendance / Settings
```

Every protected resource requires authentication + authorization + object-level checks. Middleware cookie checks are not sufficient; APIs use `requireAuth` and owner filters.

## Dashboard

`GET /api/v1/member/dashboard` returns one payload for `/member`: welcome by first name, profile completion, live now, next service, events, announcements (with read state), giving summary, prayer, ministries, notifications, saved sermons.

## Reused systems

| Area | Existing |
|------|----------|
| Profile / photo | `/member/profile`, `/api/v1/members/me`, `/api/v1/auth/me/avatar` |
| Family | `/member/family` + `/api/v1/members/me/family` |
| Notifications | Phase 24 `/member/notifications` |
| Services / live | Phase 22/27 `/api/v1/services`, `/live/[slug]` |
| Events / registration | Phase 10/17 |
| Attendance | Phase 14 `/attendance/my` |
| Ministries | Phase 13/21 |
| Giving / receipts / recurring | Phase 15/28 |
| Sermons / media | Phase 9/18/26 |
| Prayer | Phase 11 `/prayer/my` |
| Messaging | Phase 24 |

## Phase 29 additions

| Model | Purpose |
|-------|---------|
| `AnnouncementRead` | Per-user read receipts for announcements |
| `SavedItem` | Generic saved sermons/resources/events/pages |
| `MemberDevice` | Hashed push/device tokens only |

## Privacy

- Member routes are `noindex` and `Cache-Control: private, no-store`.
- Directory defaults to private; never returns phone, address, giving, or attendance.
- Receipts: guest gifts use the unguessable reference; member-linked gifts require the owner or finance permission.
- Service worker caches the public shell (`/`, `/offline`, static assets) only. It never caches `/member`, `/api`, receipts, messages, or prayer.

## Member routes

| Route | Role |
|-------|------|
| `/member` | Dashboard |
| `/member/announcements` | Announcements + mark read |
| `/member/services` | Service times + live |
| `/member/events`, `/member/events/[slug]` | Registrations + event detail |
| `/member/calendar` | Month calendar + ICS |
| `/member/giving/receipts`, `/member/giving/recurring` | Receipts / schedules alias |
| `/member/sermons`, `/member/saved`, `/member/media` | Library |
| `/member/directory` | Privacy-safe directory |
| `/member/settings`, `/member/settings/security` | Preferences + password/sessions |
| `/member/onboarding` | Optional setup checklist |
| `/offline` | Public PWA fallback |

## APIs

- `GET /api/v1/member/dashboard`
- `GET /api/v1/member/announcements` · `POST /api/v1/member/announcements/{id}/read`
- `GET|POST /api/v1/member/saved` · `DELETE /api/v1/member/saved/{id}`
- `GET /api/v1/member/giving/receipts`
- `GET /api/v1/member/sermons`
- `GET /api/v1/member/calendar`
- `GET /api/v1/member/export`
- `POST /api/v1/member/account/delete-request`
- `GET|POST /api/v1/member/devices`
- `POST /api/v1/auth/me/password`
- `GET /api/v1/auth/me/sessions` · `POST /api/v1/auth/me/sessions/revoke-others`

## PWA / push

Manifest: `/manifest.webmanifest`. Service worker: `/sw.js`. Push is prepared (`MemberDevice` hashed tokens) and is inactive until a provider (VAPID/FCM) is configured. Deep links are the existing HTTPS routes.

## Security tests

`npm run test:member-portal` and `npm run test:member-portal:api` (anonymous 401/CSRF/IDOR).
