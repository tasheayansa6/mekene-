# Phase 24 — Church Communication, Messaging & Notification Center

Extends Phase 16. Does **not** duplicate `AppNotification`, `CommunicationJob`, `NotificationDelivery`, CMS `Announcement`, RBAC, or audit logging.

## Architecture

```
Audience → CommunicationJob / Announcement → ChannelAdapter → Delivery → Status → Analytics
```

Channels (adapters in `src/lib/communications/providers.ts`):

| Channel | Activation |
|---------|------------|
| In-app | Always |
| Email | Application mailer |
| Telegram | `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` (Bot API `sendMessage`) |
| SMS | `SMS_PROVIDER_API_KEY` + `SMS_FROM` (+ `SMS_PROVIDER_URL` for HTTP) |
| Social | Stub — official APIs only |
| Push | Not wired (no device-token store yet) |

Unconfigured channels never report fake success.

## Notifications

- Model: `AppNotification` + preferences (`telegramEnabled`, `smsEnabled`)
- Member: `/member/notifications`, alias `/notifications`
- APIs: `/api/v1/notifications/*` and `/api/v1/member/notifications/*`
- Bell polls every 60s (no per-page DB fan-out)

## Announcements

Reuse CMS announcements (draft → review → scheduled/published → expired/archived). Public `/announcements` only for `audience=everyone` published within window.

## Audience

`everyone | members | ministry | ministry_leaders | staff | volunteers | event_registrants` (+ optional `householdId` filter). Preview returns **counts only** (no emails/phones/Telegram IDs).

## Broadcasts & queue

`POST /api/v1/admin/communications/send` → `CommunicationJob` → `processCommunicationJobs`. Idempotency keys on jobs and deliveries. Weekly recurrence bounded by `recurrenceUntil` (follow-up jobs, max 52 pattern). Emergency requires manage + confirm text `SEND EMERGENCY`.

## Templates

`CommunicationTemplate` with allowlisted `{{member_name}}`, `{{event_name}}`, `{{event_date}}`, `{{event_time}}`, `{{venue}}`, `{{church_name}}`, `{{ministry_name}}`. No code execution.

## Direct messaging

Support conversations (member ↔ staff). Not an open social network. Object-level: participants only. Staff inbox `/admin/messages`; member `/member/messages`. Reports → moderate queue.

## Webhooks

`POST /api/v1/webhooks/{email|sms|telegram}` — require `*_WEBHOOK_SECRET`; timing-safe compare; idempotent delivery updates by `providerReference`.

## Admin routes

| Path | Purpose |
|------|---------|
| `/admin/communications` | Dashboard |
| `/admin/communications/send` | Composer + audience preview |
| `/admin/communications/templates` | Templates |
| `/admin/communications/reports` | Aggregates |
| `/admin/communications/emergency` | Elevated broadcast |
| `/admin/communications/[id]` | Job detail |
| `/admin/communications/delivery` | Delivery log |
| `/admin/messages` | Staff inbox |

## RBAC (existing resource)

`communications`: view, create, update, publish, moderate (templates/reports), assign (send/schedule), manage (bulk, emergency, integrations).

## Env

```
# TELEGRAM_BOT_TOKEN=
# TELEGRAM_CHAT_ID=
# SMS_PROVIDER_API_KEY=
# SMS_FROM=
# SMS_PROVIDER_URL=
# EMAIL_WEBHOOK_SECRET=
# SMS_WEBHOOK_SECRET=
# TELEGRAM_WEBHOOK_SECRET=
```

## Tests

```
npm run test:communications
npm run test:communications:api
```
