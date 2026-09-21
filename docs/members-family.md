# Phase 23 — Church Member & Family Management

Extends Phase 13 membership and Phase 19 pastoral documents. **Reuses** `Member`, `Household`, `MembershipApplication`, profile-change requests, and documents. Does **not** create a second people system.

## Architecture

```
User
 └── Member (BME-M-######)
      ├── MembershipType (configurable)
      ├── Household / Family (BME-F-######)
      ├── MembershipStatusHistory
      ├── BaptismRecord / ConfirmationRecord
      ├── MembershipTransfer
      ├── MemberCard (hashed token)
      └── integrations: ministries, volunteers, events, attendance, giving (privacy-gated)
```

## Status lifecycle

`visitor` → application → `approved`/`active` → `inactive` / `transferred` / `suspended` / `deceased` / `archived`

Reactivation from `archived`/`inactive`/`suspended` is audited. Members are never deleted for inactivity.

## Family

`Household` is the family unit. New households receive `familyReference` (`BME-F-000001`). Relationships remain on `HouseholdMembership`.

## Directory privacy

`/members` + `GET /api/v1/members/directory` show only opted-in profiles (`directoryVisibility` public or members_only). Never phone, private email, address, giving, or attendance.

## Member card

Tokens are random; only SHA-256 hashes are stored. Verification returns name, membership number, and status only.

## Import / export / merge

- Import: upload → validate → preview (duplicates flagged) → confirm
- Export: audited CSV (no emergency contacts / baptism notes)
- Merge: preview + confirm; source archived; financial FKs re-pointed, never deleted

## Admin routes

`/admin/members`, `/applications`, `/households`, `/types`, `/import`, `/merge`, `/verify`, `/reports`

## Member routes

`/join` → `/membership/apply`, `/member/profile`, `/member/family`, `/member/card`, `/members` (directory)

## Permissions

Existing `members:*` plus `members:import` and `members:export`. Baptism/confirmation require moderate/manage (or pastoral moderate).

## Migration

`20260826120000_phase23_member_family`

## Tests

```bash
npm run test:members
```
