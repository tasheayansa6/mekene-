# Phase 19 — Church Membership & Pastoral Care Management

Extends Phase 13 membership and Phase 11 prayer. Pastoral care is **private by default**.

## Architecture

```
User → Member → Household / HouseholdMembership
              → MemberMinistry (existing)
              → PastoralCareCase → Notes / Visits / FollowUps
              → MemberProfileChangeRequest
              → MemberDocument / MemberAdminNote
```

Prayer requests remain on the Phase 11 `PrayerRequest` model (not duplicated).

## Member identifiers

Format: `BME-M-000001` via `nextMembershipNumber()` (configurable prefix; not used for auth).

## Membership lifecycle

Statuses: `approved`, `active`, `inactive`, `visitor`, `transferred`, `archived`.

History: existing `MembershipStatusHistory` (never hard-deletes status trail).

Directory visibility: `private` (default), `members_only`, `staff_only`, `public`.

## Profile change requests

Protected fields (emergency contact, address, baptism, DOB, gender) cannot be patched directly by members.

Flow: `POST /api/v1/members/me/profile-changes` → staff approve/reject under `/admin/members/profile-changes`.

## Household

- `Household` + `HouseholdMembership` (relationship: parent/child/spouse/guardian/other)
- Member portal: `/member/household` (own household only)

## Pastoral care

| Model | Purpose |
|-------|---------|
| `PastoralCareCase` | Private care case |
| `PastoralCareNote` | Confidential notes (`pastoral:moderate` or `manage`) |
| `PastoralVisit` | Scheduled visits |
| `PastoralFollowUp` | Tasks |
| `PastoralAssignmentHistory` | Assignment trail |
| `PastoralAccessLog` | Access audit **without** note content |

### Case status

`open` → `in_progress` → `on_hold` → `resolved` → `closed`

### Object-level authorization

Users without `pastoral:manage` only see cases they created or are assigned to. Unauthorized IDs resolve as not found.

### Notifications

Generic copy only (e.g. “You have an update from the church care team.”). Never include note text or private summaries.

## RBAC

Resource: `pastoral` — `view`, `create`, `update`, `assign`, `moderate` (notes), `manage`, `archive`.

| Role | Pastoral |
|------|----------|
| `pastor`, `pastoral_care` | Full including notes |
| `admin` | view/create/update/assign — **not** notes (`moderate`) |
| `super_admin` | all |
| Members / ministry leaders | none |

## Admin routes

- `/admin/pastoral-care` — dashboard
- `/admin/pastoral-care/my-work`
- `/admin/pastoral-care/cases`, `/cases/[id]`
- `/admin/pastoral-care/visits`
- `/admin/pastoral-care/reports`
- `/admin/members/[id]/care`
- `/admin/members/profile-changes`

## Member routes

- `/member/profile` (+ change requests)
- `/member/household`
- `/member/membership`, `/member/prayer` (existing)
- `/member/care` — member care dashboard (cases/visits/follow-ups without note content)
- `/care` — public pastoral care landing
- `/care/request` — authenticated care request form
- `/care/appointments` → redirects to `/member/care`

## Phase 30 — Prayer, Counseling & Pastoral Care (extension)

Adds member-facing care request flow and appointment booking on top of Phase 19 cases/visits.

| Model | Purpose |
|-------|---------|
| `CareAvailability` | Pastor weekly availability slots for appointments |

### Member care APIs

- `GET/POST /api/v1/member/care` — dashboard + create care request (summary stored for staff only)
- `GET/POST /api/v1/member/care/appointments` — list/book visits from availability
- `PATCH /api/v1/member/care/appointments/[id]` — cancel own appointment
- `GET/POST /api/v1/admin/pastoral/availability` — manage caregiver slots
- `GET /api/v1/public/care/info` — public categories + active availability (no private data)

Member serializers never include case summaries or pastoral notes. Notifications stay generic.

## APIs (selected)

- `GET/POST /api/v1/admin/pastoral/cases`
- `GET/PATCH /api/v1/admin/pastoral/cases/[id]`
- `GET/POST /api/v1/admin/pastoral/cases/[id]/notes`
- `GET/POST /api/v1/admin/pastoral/visits`
- `GET/POST /api/v1/admin/pastoral/followups`
- `GET /api/v1/admin/pastoral/overview|reports`
- `GET /api/v1/admin/members/[id]/care`
- Member: `/api/v1/members/me/profile-changes`, `/api/v1/members/me/household`
- Member care: `/api/v1/member/care`, `/api/v1/member/care/appointments`

## Documents

Stored under `public/uploads/members/`; downloads require auth + permission; signed short-lived tokens supported.

## Tests

- `npm run test:pastoral`
- `npm run test:pastoral:api` (server running)
