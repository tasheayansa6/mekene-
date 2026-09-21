# Phase 21 + Phase 33 — Volunteers & Church Workforce

Extends Phase 21 staff/volunteer foundations. Does **not** rebuild people, ministries, events, notifications, or learning systems. Phase 31 Education LMS is not present; training reuses Phase 21 `TrainingProgram` / `TrainingSession` / `TrainingEnrollment`.

## Architecture

```
Member (existing)
 └─ VolunteerProfile / Application / Skills / Qualifications
 └─ Ministry → Department → Team → TeamMember
 └─ VolunteerRole + MinistryRequirement
 └─ ServiceAssignment (Event) → Substitution / Attendance / Hours
 └─ TrainingEnrollment (Phase 21)
 └─ Availability + Exceptions / Requests / Onboarding
```

## Volunteer statuses

Configurable: interested, applicant, pending_review, approved, active, temporarily_unavailable, inactive, suspended, archived, former.

## Assignment engine

Server-side `eligibility.ts` validates:

- Active volunteer status
- Required skills / training (including expiry)
- Team membership when required
- Availability + leave windows
- Frequency caps
- Duplicate role on same event
- Schedule overlaps (`conflicts.ts`)

`allowConflicts` only skips calendar overlap — never training/skill/age gates.

Recommendations (`recommendations.ts`) explain matches only; humans must assign.

## Substitution

Volunteer requests replacement → leader picks eligible substitute → original assignment `replaced`, new assignment created, both notified with generic copy.

## Hours & attendance

Hours come from check-in/out or scheduled window after validated attendance. Volunteers cannot edit hours (`VOLUNTEER_CANNOT_EDIT_HOURS`). Leaders correct via `VolunteerHourCorrection` (audited).

## Privacy

- Availability: owner + authorized scheduler/leader only
- Applications: applicant + authorized reviewers; `reviewNotes` never to members
- Service history: owner + authorized leaders/admins
- Notifications: generic volunteering copy only

## RBAC mapping

Fine-grained Phase 33 names map onto existing permissions:

| Spec | Implementation |
|------|----------------|
| volunteers.view / manage | `volunteers:view` / `volunteers:manage` |
| volunteer_applications.* | `volunteers:view` / `volunteers:approve` |
| volunteer_teams / assignments / attendance / substitution | `ministries:assign` + object-level team/ministry |
| volunteer_reports.view | `volunteers:view` |
| volunteer_availability.* | owner or `volunteers:view` + scope |

Object-level: ministry leader (`Ministry.leaderUserId`), team leader / assistant (`MinistryTeam.leaderUserId` / `assistantLeaderUserId`). Never trust client IDs alone.

`volunteer_coordinator` is included in admin portal roles.

## Routes

Member:

- `/member/volunteering` (+ apply, availability, assignments, calendar, history)
- `/volunteer/apply` (auth → same application flow)

Leader:

- `/leader/volunteers` (scoped dashboard, announcements, substitutions)

Admin:

- `/admin/volunteers` (+ applications, schedule, roles, reports)
- Existing `/admin/ministry/{teams,assignments,rosters,training,reports}`

## APIs (selected)

- `/api/v1/members/me/volunteering/*` and aliases under `/api/v1/member/volunteering/*`
- `/api/v1/volunteering/applications`, `.../assignments/{id}/{confirm,decline,replacement}`
- `/api/v1/leader/volunteers/*`
- `/api/v1/admin/volunteers/{roles,requirements,departments,onboarding,skills,schedule,reports,overview}`
- Assignment check-in / hours: `/api/v1/admin/ministry/assignments/{id}/{check-in,check-out,hours}`

## Tests

- `npm run test:volunteers`
- `npm run test:volunteers:api` (server running)

## Migration

`prisma/migrations/20260830180000_phase33_volunteer_workforce`
