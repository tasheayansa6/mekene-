# Phase 16 — Church Communication & Notification System

Centralized communication for Busa Mekene Eyasus Church. Domain events flow through a communication service into channel providers (in-app, email, Telegram adapter, future social). Announcements reuse the existing CMS `Announcement` model (extended, not duplicated).

**Phase 24** extends this layer (templates, DMs, audience preview, emergency, SMS adapter, webhooks, reports). See [communications-center.md](./communications-center.md).

## Architecture

```
Church Event (membership / giving / attendance / admin send)
        ↓
CommunicationService (sendNotification / enqueueCommunicationJob)
        ↓
Channels: in_app · email · telegram · social (prepared)
        ↓
AppNotification + NotificationDelivery (+ CommunicationJob queue)
```

## Announcements

Extended fields: `category`, `audience`, `ministryId`, `eventId`, `publishToTelegram`, `publishToSocial`.

Public list/detail only for `audience=everyone`, published, within `startAt`/`endAt`.

- Public: `/announcements`, `/announcements/[slug]`
- Admin CMS: `/admin/content/announcements` (also linked from `/admin/communications/announcements`)
- Admin hub: `/admin/communications`

## Notifications

- Model: `AppNotification` (readAt, expiresAt, idempotencyKey)
- Preferences: `NotificationPreference` (transactional always on)
- Member: `/member/notifications`, `/member/settings/notifications`
- Bell: `NotificationBell` in admin + member layouts (60s poll)

## Audience / targeting

`AnnouncementAudience`: everyone | members | ministry | ministry_leaders | staff.

Ministry membership is resolved from existing `MemberMinistry` — never exposed publicly. Bulk everyone/members requires `communications.manage`. Ministry leaders are scoped to ministries they lead.

## Email

`sendTemplatedNotificationEmail` uses church branding and console/SMTP backends. Never includes passwords or payment secrets. Giving receipts notify without amounts in the message body.

## Queue / delivery / retry

`CommunicationJob` + `processCommunicationJobs` with exponential backoff (`communicationBackoffMs`), max attempts, and delivery `idempotencyKey`. Process via `POST /api/v1/admin/communications/jobs/process`.

## Telegram / social

`providers.ts` adapters. Telegram publishes only when credentials exist and “Publish to Telegram” is selected. Social is a stub for official APIs only — no scraping.

## Event reminders

Configurable via `EVENT_REMINDER_OFFSETS_MINUTES` (default `1440,60`). Scheduled on event publish.

## APIs

| Area | Endpoints |
|------|-----------|
| Public | `GET /api/v1/announcements`, `GET /api/v1/announcements/{slug}` |
| Member | `GET /api/v1/notifications`, `POST .../{id}/read`, `POST .../read-all`, `GET|PATCH /api/v1/notification-preferences` |
| Admin | overview, send, delivery, jobs, jobs/process |

## RBAC

Resource `communications`: view, create, update, publish, moderate (templates), assign (send/schedule), manage (bulk + integrations).

## Security

RBAC server-side, CSRF on writes, rate limits on send/process, URL sanitization (`javascript:` blocked), secrets stripped from audit/notification payloads, scheduled content not public early, expired (`endAt`) hidden from active lists.

## Env

```
# TELEGRAM_BOT_TOKEN=
# TELEGRAM_CHAT_ID=
# EVENT_REMINDER_OFFSETS_MINUTES=1440,60
```

## Tests

```
npm run test:communications
npm run test:communications:api
```
