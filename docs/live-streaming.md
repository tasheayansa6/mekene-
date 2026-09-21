# Live Streaming (Phase 27)

Live worship streaming for Busa Mekene Eyasus Church — public viewing pages, interactive participation, and admin session management.

## Architecture

- **Data model:** `LiveSession` records link to worship `Event` rows and optionally to a `Sermon` recording after the stream ends.
- **Embed security:** Stream URLs are resolved server-side via `src/lib/live/providers.ts`. Only HTTPS embeds from approved hosts (YouTube nocookie, Vimeo, Facebook) are rendered in the UI.
- **Real-time updates:** Chat, reactions, and viewer counts use **HTTP polling**, not WebSockets. Public chat polls every 5 seconds while live; presence heartbeats every 60 seconds.
- **Visibility:** Sessions support `public`, `members`, and `private` visibility. Private prayer requests are never exposed on public session detail APIs.

## Public routes

| Route | Description |
|-------|-------------|
| `/live` | Live hub — current stream CTA + upcoming cards |
| `/live/upcoming` | Full upcoming stream list |
| `/live/[slug]` | Stream player, program sidebar, chat, prayer, attendance, reactions |
| `/services` | Weekly schedule + upcoming worship with live badges |
| `/services/[slug]` | Worship event detail with linked live session |

Homepage shows `LiveNowBanner` when a confirmed live session exists (`status === live`).

## Public API (`/api/v1/live/*`)

| Endpoint | Method | Auth | Notes |
|----------|--------|------|-------|
| `/live` | GET | Optional | `{ liveNow, upcoming }` |
| `/live/upcoming` | GET | Optional | Upcoming sessions |
| `/live/[slug]` | GET | Optional | Full session detail |
| `/live/[slug]/chat` | GET/POST | POST requires auth | Rate-limited |
| `/live/[slug]/prayer` | POST | Optional | Private by default |
| `/live/[slug]/attendance` | POST | Optional | One check-in per visitor/user |
| `/live/[slug]/react` | POST | Optional | ❤️ 🙏 Amen |
| `/live/[slug]/presence` | POST | Optional | Viewer heartbeat |
| `/live/[slug]/polls` | GET | Optional | Active poll results |

## Admin API (`/api/v1/admin/live/*`)

Requires admin portal access plus **events** permissions:

- **View:** `events.view` or `events.manage` or `events.moderate` (also `media.manage` for read)
- **Manage sessions:** `events.manage` or `events.moderate`
- **Moderate chat:** `events.moderate` or `events.manage`
- **Manage live prayer:** `prayer.moderate` / `prayer.manage` or `events.manage`

Key admin actions: activate, pause, end, cancel, program cursor, chat moderation, polls, announcements, recording association, reminders, session report.

## UI components (`src/components/live/`)

- `LiveStreamPlayer` — safe iframe embed with offline/ended states
- `LiveCountdown` — scheduled start countdown
- `LiveStatusBadge` — status pill
- `LiveChatPanel` — polled chat (5s)
- `LivePrayerForm` — prayer submission with privacy toggle
- `LiveAttendanceButton` — one-time check-in
- `LiveReactionsBar` — reactions + presence heartbeat
- `LiveProgramSidebar` — order of service + announcements
- `LiveNowBanner` — homepage live strip

## Admin UI

| Route | Purpose |
|-------|---------|
| `/admin/live` | Dashboard + session list |
| `/admin/live/create` | Create session from event |
| `/admin/live/[id]` | Session control center (tabs) |
| `/admin/live/analytics` | Aggregate metrics |

## Privacy & security

- Admin live endpoints return **401** for anonymous callers.
- Private live prayer requests are excluded from public session payloads.
- Chat posting requires authentication and CSRF protection.
- Embed URLs are never passed through unsanitized; unknown hosts are rejected.
- Visitor keys (cookie) support anonymous attendance/reactions when not signed in.

## Testing

```bash
APP_URL=http://localhost:3000 npx tsx scripts/live-api-tests.ts
```

Runs anonymous security checks (admin 401, visibility, rate-limit friendly endpoints).
