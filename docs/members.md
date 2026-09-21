# Phase 13 — Church Membership & Member Management

A website account is **not** church membership. Registration creates a `User`. Approved membership creates a `Member` record after staff review.

This project uses the existing Next.js App Router API (not Django). The existing `User` model is reused. There is no second authentication system.

## Architecture

```
User (website account)
  └── Member (church membership profile, created on approval)
        ├── Household (optional)
        ├── MemberMinistry
        └── MembershipApplication (history)
```

Applications can exist before a `Member` row exists.

## Status

**Applications (internal):** submitted → under_review / needs_information / approved / rejected / archived. Applicants may resubmit after information is requested.

**Applicant-facing labels:** Submitted, Under Review, Additional Information Requested, Approved, Not Approved.

**Membership:** approved, active, inactive, transferred, archived. Status changes are validated and require permission.

## Privacy

- Default directory visibility is **private**.
- There is **no public member directory**.
- Applicants never receive internal `reviewNotes`.
- Households are admin-only.
- Identity is taken from the session, never from a client-supplied user id.

## Routes

**Member:** `/membership/apply`, `/member`, `/member/profile`, `/member/membership`, `/member/ministries`, `/member/prayer`

**Admin:** `/admin/members`, `/admin/members/applications`, `/admin/members/applications/[id]`, `/admin/members/[id]`, `/admin/members/households`

## Permissions

`members.view`, `members.create`, `members.update`, `members.archive`, `members.approve`, `members.moderate`, `members.manage`

Website `member` role has none of these. Approval does not grant administrator permissions.

## Notification hooks

Events are written to the audit log only:

- `membership.application_submitted`
- `membership.information_requested`
- `membership.application_approved`
- `membership.application_rejected`
- `membership.status_changed`

Email, Telegram, and in-app delivery are not implemented in this phase.

## Export

`GET /api/v1/admin/members/export` requires `members.manage` and currently returns 403. Broad export is not enabled.
