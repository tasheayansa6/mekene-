# Phase 10 — Church Events & Calendar Management

Authorized staff manage church events, categories, locations, and publishing from `/admin/events`. The public calendar at `/events` shows **published** records (and cancelled events, clearly marked). Official church events are **not** invented in code.

This project uses the existing Next.js App Router API (not Django). Models live in Prisma. There is no duplicate `backend/apps/events` app.

## Architecture

```
Prisma (Event, EventCategory, EventLocation)
  ├── Public API   /api/v1/events/*
  ├── Admin API    /api/v1/admin/events/*
  ├── Admin UI     /admin/events/*
  └── Public UI    /events, /events/[slug], /events/past, homepage
```

Organizers reuse `Leader` when the organizer is a church leader. Ministry association reuses `Ministry`. Guest organizers use `organizerName`.

Featured images use `public/uploads/events/` through the existing media pipeline (JPEG/PNG/WebP, converted to WebP, max 5MB).

## Models

| Model | Notes |
| --- | --- |
| `Event` | Title, slug, description, category, ministry, organizer, location, schedule, recurrence, registration link, status, featured, SEO |
| `EventCategory` | Configurable types (Sunday Service, Bible Study, … are seed examples only) |
| `EventLocation` | Reusable venues. Coordinates and map URL are optional |
| `EventStatus` | `draft`, `review`, `scheduled`, `published`, `cancelled`, `completed`, `archived` |
| `EventRecurrence` | `none`, `daily`, `weekly`, `monthly` plus interval and optional until date |

Datetimes are stored as UTC instants. Each event also stores an IANA `timezone` (default: church setting `Africa/Addis_Ababa`). Display uses `Intl` with that zone. Offsets are never added or subtracted in frontend code.

Cancelled events remain public with a **CANCELLED** label. They are not deleted. Archived events stay in admin records only.

Featured events are capped at **3**.

## Recurrence

A simple expander covers daily/weekly/monthly intervals inside a calendar window (max 60 occurrences, ~93-day query window). This is not a full RRULE engine. `.ics` files may include a matching `RRULE`.

## Workflow

```
Draft → Review → Scheduled/Published → Cancelled / Completed / Archived
```

Create never auto-publishes. Preview is authorized only (`/admin/events/[id]/preview`).

## Permissions

RBAC resource `events`:

- `events.view` / `create` / `update` / `delete` / `publish` / `archive` / `cancel` / `manage`

Media Team does **not** receive event management permissions. Ministry leaders may create/update drafts for their assigned ministry only. Members cannot manage events.

## Public API

- `GET /api/v1/events/` (`search`/`q`, `category`, `ministry`, `location`, `online`, `upcoming`, `when`, `featured`, `from`, `to`, `sort`, `page`)
- `GET /api/v1/events/{slug}/`
- `GET /api/v1/events/{slug}/ics/` (optional `?format=google`)
- `GET /api/v1/events/categories/`
- `GET /api/v1/events/locations/`
- `GET /api/v1/events/calendar/?from=&to=`

Meeting URLs are omitted from list and ICS responses. Public detail may show a meeting link for published online events.

## Admin API

CRUD under `/api/v1/admin/events`, plus categories, locations, bulk actions, uploads (`kind=image`), and options (categories/locations/ministries/leaders/default timezone).

## Notification hooks (prepared only)

`event.created`, `event.updated`, `event.cancelled`, `event.published`, `event.starting_soon`

These are audit/event types for a later notifications phase. Email, Telegram, and push are not sent in Phase 10.

## Tests

```bash
npx tsx --test src/lib/events/*.test.ts
APP_URL=http://localhost:3000 npx tsx scripts/events-api-tests.ts
```
