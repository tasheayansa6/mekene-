# Phase 17 — Church Events Registration, Calendar & Waitlist

Extends the Phase 10 Events system. Reuses Attendance (Phase 14) and Communications (Phase 16). Does **not** create a second attendance system.

## Architecture

```
Event
  ↓
EventRegistration (capacity / waitlist)
  ↓
AttendanceSession (existing, eventId FK)
  ↓
AttendanceRecord
```

## Registration

Model: `EventRegistration` with unique `reference` (`BME-EVT-000001`), statuses:
`registered | waitlisted | confirmed | cancelled | attended | no_show`

- Member register: `POST /api/v1/events/{slug}/register` (auth identity — never trust client userId)
- Cancel: `POST /api/v1/events/{slug}/cancel-registration` (soft cancel)
- Capacity checked inside a DB transaction; waitlist when full + `waitlistEnabled`
- Promotion on cancellation is auditable and notifies via CommunicationService

## Event extensions

`waitlistEnabled`, `allowGuestRegistration`, `registrationAccess` (`public|members|ministry|invitation`),
`locationVisibility` (`public|members|private`), `isHybrid`, `seriesParentId`, `reminderOffsetsMinutes`

Lifecycle status remains Phase 10 enums; registration open/closed/ongoing are **derived** from deadlines, capacity, and times (server-side).

## Calendar

- Public: `/calendar` + existing `/events?view=month` + `GET /api/v1/events/calendar`
- Admin: `/admin/events/calendar`
- Recurrence: existing `expandOccurrences` / series parent link

## Attendance

Link sessions with `eventId`. QR check-in uses Phase 14 tokens unchanged.

## Notifications

Uses Phase 16: registration confirmed/cancelled, waitlist promotion, configurable reminders via `reminderOffsetsMinutes` / `EVENT_REMINDER_OFFSETS_MINUTES`.

## APIs

| Area | Endpoints |
|------|-----------|
| Public | events list/detail/calendar (existing) |
| Member | `/events/my`, `/events/registrations`, register/cancel |
| Admin | `.../events/{id}/registrations`, `.../registrations/{id}`, reports, export CSV |

## RBAC

`events.assign` → manage registrations / invitations  
`events.moderate` → capacity  
`events.manage` → export + full control  

## Privacy

- Private meeting links hidden from public serializers when `locationVisibility` is private/members
- Members see only their registrations
- Exports audited; no unnecessary PII

## Tests

```
npx tsx --test src/lib/events/registration.test.ts
npm run test:events
npm run test:events:registration:api
```
