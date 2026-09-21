# Phase 6 — Authentication & Authorization

The church platform uses a **Node.js / Next.js App Router** backend (not Django). Authentication lives under `/api/v1/auth/` and is enforced independently of the frontend.

## Architecture

- HTTP-only session cookies (`bme_session`) with opaque random tokens stored as SHA-256 hashes
- Double-submit CSRF cookie (`bme_csrf`) + `X-CSRF-Token` header on mutating requests
- CORS allow-list from `CORS_ALLOWED_ORIGINS` (never `CORS_ALLOW_ALL_ORIGINS`)
- Passwords hashed with bcryptjs (cost 12)
- Email verification and password reset tokens are hashed, single-use, and expiring
- RBAC: User → Role → Permissions (`resource:action`)
- Security events are written to the existing `AuditLog` table

## Environment

Copy `.env.example` values into a local `.env` (never commit secrets):

- `DATABASE_URL`
- `AUTH_SECRET`
- `APP_URL`
- `CORS_ALLOWED_ORIGINS` / `CSRF_TRUSTED_ORIGINS`
- `EMAIL_BACKEND=console` for development
- `SEED_SUPER_ADMIN_EMAIL` / `SEED_SUPER_ADMIN_PASSWORD`

## Default seeded Super Administrator (development)

- Email: `admin@busamekeneeyasus.org`
- Password: `ChangeMe!Admin1` (override with env vars)

Change this password before any production use.

## API

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/verify-email`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `GET/PATCH /api/v1/auth/me`
- `POST /api/v1/auth/me/avatar`
- `GET /api/v1/auth/csrf`
- Admin: `/api/v1/admin/users`, `/roles`, `/permissions`, `/security-logs`
- Admin dashboard: `/api/v1/admin/dashboard`, `/activity`, `/search`, `/settings`
- Admin content: `/api/v1/admin/leadership`, `/api/v1/admin/ministries`

See `docs/admin-dashboard.md` for Phase 7 administration details.`

## Frontend routes

`/login` `/register` `/verify-email` `/forgot-password` `/reset-password/[token]` `/profile` `/admin/users` `/admin/roles` `/admin/permissions`

Protected: `/profile`, `/admin/*`, `/member/*`

## Email

Development uses the console backend. Verification and reset links are printed to the server log.
