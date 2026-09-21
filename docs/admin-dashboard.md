# Phase 7 — Church Administration Dashboard

The administration UI lives at `/admin` and is protected by session cookies plus RBAC. Backend APIs independently enforce the same permissions.

## Architecture

```
AdminLayout (AuthGuard + sidebar + header)
  ├── AdminSidebar (role-aware, grouped, coming-soon items disabled)
  ├── AdminHeader (toggle, breadcrumbs, search, notifications placeholder, profile menu)
  └── Pages (dashboard, church, leadership, ministries, users, settings, profile, audit)
```

Frontend `can("resource.action")` only hides controls. Every mutating route still calls `requirePermission` and CSRF validation.

## Routes

Functional:

- `/admin`
- `/admin/church`, `/admin/church/services`, `/admin/church/locations`, `/admin/church/social-links`
- `/admin/leadership`, `/admin/leadership/create`, `/admin/leadership/[id]`, `/admin/leadership/positions`
- `/admin/ministries`, `/admin/ministries/create`, `/admin/ministries/[id]`, `/admin/ministries/categories`
- `/admin/users`, `/admin/users/[id]`, `/admin/roles`, `/admin/permissions`
- `/admin/settings`, `/admin/profile`, `/admin/audit`, `/admin/help`

Coming Soon shells:

- Sermons, Events, Prayer, Media, Gallery, Members, Attendance, Giving, Notifications, Reports

## APIs

New:

- `GET /api/v1/admin/dashboard/`
- `GET /api/v1/admin/activity/`
- `GET /api/v1/admin/search/?q=`
- `GET/PATCH /api/v1/admin/settings/`
- `GET /api/v1/public/status/`
- Leadership and ministry CRUD under `/api/v1/admin/leadership/` and `/api/v1/admin/ministries/`
- `POST /api/v1/admin/users/` (create user)

Reused:

- Church admin APIs from Phase 4
- Users, roles, permissions, security-logs from Phase 6
- `GET/PATCH /api/v1/auth/me` for the admin profile

## Permissions

`ADMIN_PORTAL_ROLES` may open `/admin`. The **member** role is excluded even if it has content view/create permissions.

Ministry leaders may update only ministries where `leaderUserId` matches their account.

Users cannot change their own role. Administrators cannot assign Super Administrator.

## Dashboard statistics

Counts come from aggregate queries: users, active users, ministries, leaders, church profile/location/service totals. Events, sermons, prayer, and notifications are shown as Coming Soon (no fake numbers).

Recent activity is read from `AuditLog`.

## Maintenance mode

Stored in `ChurchSetting.maintenance_mode` (default `false`). Public visitors see a maintenance page; `/admin` and authentication routes remain available.

## Settings

Editable by Super Administrators: timezone, default language, maintenance mode. Site name, description, and contact email remain on `ChurchProfile`.
