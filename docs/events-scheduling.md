# Phase 22 — Events, Services & Advanced Scheduling

Extends Phases 10 (events), 17 (registration/waitlist), 14 (attendance QR), and 21 (volunteer assignments). **Does not duplicate** Event, registration, attendance, or volunteer systems.

## Architecture

```
Event (extended)
  ├── EventCategory (configurable types)
  ├── EventLocation (venues: capacity, facilities)
  ├── RecurringEventRule (optional advanced recurrence metadata)
  ├── ServiceProgram → ServiceProgramItem (order of worship)
  ├── BookableResource → ResourceReservation
  ├── EventRegistration (Phase 17)
  ├── ServiceAssignment (Phase 21 volunteers)
  ├── AttendanceSession (Phase 14 check-in)
  └── EventChangeHistory
```

## Venues

`EventLocation` is the venue model (name, slug, capacity, facilities, coordinates). Server-side conflict detection runs on create/update via `validateEventScheduling`:

- Overlapping events at the same venue → error
- Event capacity > venue capacity → error unless `allowOverVenueCapacity`

`GET /api/v1/admin/events/{id}/conflicts` previews conflicts.

## Worship services

- `isWorshipService`, `serviceLabel` on Event
- `ServiceProgram` + `ServiceProgramItem` with reorder API
- Public program when `ServiceProgram.isPublic` and event is published/public

## Resources

- `BookableResource` — equipment/rooms (separate from CMS downloads)
- `ResourceReservation` — quantity + time window with overlap checks

Admin: `/admin/events/{id}/resources`, `/api/v1/admin/resources`

## Registration & check-in

Reuses Phase 17 registration/waitlist. Phase 22 adds:

- `POST /api/v1/admin/events/{id}/check-in` — reference-based check-in → `attended`
- Duplicate check-ins rejected

QR check-in continues via linked `AttendanceSession` (Phase 14).

## Change history

`EventChangeHistory` tracks schedule, venue, capacity, status, organizer, and worship fields on PATCH.

## Admin UI

| Route | Purpose |
|-------|---------|
| `/admin/events/{id}` | Overview (multi-section form) |
| `/admin/events/{id}/program` | Service program builder |
| `/admin/events/{id}/resources` | Resource reservations |
| `/admin/events/{id}/registrations` | Registration management |
| `/admin/events/{id}/check-in` | Staff check-in |
| `/admin/events/{id}/history` | Change log |

## APIs

| Endpoint | Description |
|----------|-------------|
| `GET/PATCH .../program` | Program meta |
| `POST .../program/items` | Add item |
| `PATCH/DELETE .../program/items/{id}` | Edit/remove item |
| `POST .../program/reorder` | Transactional reorder |
| `GET/POST .../resources` | List/reserve resources |
| `GET .../history` | Change history |
| `GET .../conflicts` | Venue/capacity preview |
| `POST .../check-in` | Registration check-in |

## RBAC

Existing `events:*` permissions. Check-in requires `events.assign`. Resource catalog admin requires `events.manage`.

Object-level: ministry leaders scoped to their ministry events (unchanged from Phase 10).

## Privacy

- Private/draft events never in public APIs
- Attendee lists admin-only
- Public program only when explicitly `isPublic`
- Check-in tokens use registration references, not PII in QR payloads

## Tests

```bash
npm run test:events
npm run test:events:api
```

## Migration

`20260821320000_phase22_events_scheduling`
