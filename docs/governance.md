# Phase 34 — Church Administration & Governance

Configurable church governance on top of existing Member, User, LeadershipPosition, Ministry, Event, VolunteerTask, notifications, and audit systems. Does **not** rebuild those domains. Software permissions are **not** equated with pastoral/elder authority — workflows are configurable.

## Architecture

```
Church
 └─ LeadershipPosition (existing public directory + termMonths/responsibilities)
     └─ GovernanceAppointment (Member-linked history; never hard-delete)
 └─ Ministry (existing) ← optional link
     └─ Committee → CommitteeMember → Meetings → Agenda / Minutes / Votes
         └─ Decisions / Resolutions → GovernanceActionItem → VolunteerTask
 └─ GovernancePolicy → PolicyVersion → PolicyAcknowledgement
 └─ GovernanceDocument (default: restricted)
 └─ AdministrativeRequest → notes (public vs internal)
 └─ ApprovalWorkflow / Step / Action / Delegation
```

## Organization

Hierarchy is configurable: Church → Leadership → Department/Ministry → Committee → Team (teams reuse Phase 21 `MinistryTeam`). Committees optionally link to a ministry; quorum count/percent are per-committee.

## Leadership

- Positions reuse `LeadershipPosition` (custom titles; examples only in UI docs).
- Appointments link `Member` + position + start/end + status (`active`/`ended`/`replaced`).
- Terms: `termMonths` null = indefinite; reminders via settings keys / 30–60–90 day windows in `appointmentsExpiringWithin`.
- History: `/admin/governance/leadership/history` (authorized only).

## Committees & meetings

Meetings may link `eventId` for calendar reuse. Agenda lock requires override after lock. Minutes workflow: draft → secretary_review → chair_review → approved → locked; amendments create new versions (no silent edit of approved records). Quorum evaluation never invents legal validity unless `autoValidateLegal` is set.

## Resolutions & voting

Resolution numbers via configurable `YEAR-NUMBER` (`nextResolutionNumber`). Votes: approve/reject/abstain; methods simple_majority / two_thirds / unanimous / custom. Duplicate votes blocked by unique constraint; closed voting rejected server-side.

## Action items → tasks

`GovernanceActionItem.volunteerTaskId` links to existing `VolunteerTask` (no second task system).

## Policies & documents

Policy versions are immutable once published. Acknowledgements store user + version + timestamp. Documents default to `restricted`; access checked server-side.

## Administrative requests

`/member/requests` — configurable `AdminRequestCategory`. Workflow: submitted → assigned → under_review → approved/rejected → completed. Internal notes never returned to requesters.

## Approval engine

Sequential/parallel steps via `ApprovalWorkflow`. Delegation cannot exceed permissions the delegator holds or configured scope.

## RBAC mapping

| Spec | Implementation |
|------|----------------|
| governance.* | `governance:view/create/update/delete/approve/assign/manage/export` |
| leadership.* | existing `leadership:*` + appointments under governance |
| committees/meetings/decisions/resolutions/policies/requests/tasks/documents/reports | mapped onto `governance:*` + object-level committee/meeting/request checks |

Frontend checks are never authoritative.

## Routes

Admin: `/admin/governance`, `/admin/governance/leadership/history`, `/admin/governance/reports`  
Leadership portal: `/leadership`  
Committee: `/committee/[id]`  
Member requests: `/member/requests`

APIs under `/api/v1/admin/governance/*`, `/api/v1/governance/*`, `/api/v1/member/requests/*`.

## Privacy

Private by default. Public site must not expose minutes, internal decisions, notes, or restricted documents.
