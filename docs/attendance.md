# Phase 14 — Church Attendance & Check-in

Attendance is privacy-conscious and permission-controlled. A website account is not enough to check in — an **approved/active church member** record is required for self and QR check-in.

This project uses the existing Next.js App Router API (not Django). The foundation `Attendance` stub was replaced with sessions and records linked to existing `Member`, `Event`, and `Ministry` models.

## Architecture

```
AttendanceSeries (optional recurring template)
  └── AttendanceSession (draft → scheduled → open → closed → archived)
        ├── AttendanceRecord (unique per member/session)
        ├── AttendanceCorrection (audited changes with reason)
        └── AttendanceQrToken (short-lived, hashed, session-specific)
```

## Session workflow

Draft → Scheduled → Open → Closed → Archived.

Only **open** sessions accept normal check-ins (self/QR), and only inside a time window around start/end.

People are **not** auto-marked absent for missing check-ins.

## Check-in methods

`manual` · `self` · `admin` · `qr` · `imported`

QR tokens:

- Expire
- Are hashed at rest
- Are session-specific
- Do **not** contain member IDs, passwords, or account tokens
- Require an authenticated member to complete check-in

## Routes

**Member:** `/member/check-in`, `/member/attendance`, `/check-in`

**Admin:** `/admin/attendance`, `/admin/attendance/sessions`, `/admin/attendance/sessions/[id]`, `/admin/attendance/check-in`, `/admin/attendance/reports`, `/admin/attendance/members/[id]`

## Permissions

`attendance.view` · `create` · `update` · `moderate` (correct) · `archive` · `assign` (QR) · `manage` (includes export)

Website `member` role has none of these. Self check-in uses authenticated membership ownership, not admin permissions.

## Privacy

- No public individual attendance
- Member history is own-records only
- Admin lists show names/membership numbers, not phone/email
- Reports use aggregated charts

## API

**Member:** `GET /api/v1/attendance/my`, `GET /api/v1/attendance/sessions/active`, `POST /api/v1/attendance/check-in`, `POST /api/v1/attendance/check-in/qr`

**Admin:** sessions CRUD/status, records create/correct/delete, overview, reports, export CSV, options, member history

## Notification hooks

Audit events only (no email/Telegram delivery yet): session created/opened/closed, record created/corrected/removed, QR generated, export, check-in.
