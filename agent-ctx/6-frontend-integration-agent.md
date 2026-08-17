# Task 6: Frontend API Consumption for Church Information

## Summary
Updated frontend components to consume church profile data from the public API endpoint `GET /api/v1/church/profile`, replacing hardcoded data with dynamic API-driven content while maintaining graceful degradation.

## Files Created
- `src/lib/church-api.ts` — Types, fetcher, and helper functions
- `src/hooks/use-church-profile.ts` — TanStack Query hook (5-min cache)
- `src/components/sections/ServiceTimesSection.tsx` — Client component for service times
- `src/components/layout/FooterDynamicData.tsx` — Client components for footer social links and service times

## Files Updated
- `src/app/page.tsx` — Service Times section now uses API
- `src/app/about/page.tsx` — All content sections now use API (server component)
- `src/components/layout/Footer.tsx` — Social links and service times from API
- `src/components/sections/LocationSection.tsx` — Contact info from API
- `src/components/layout/Navbar.tsx` — Subtitle corrected to "Ethiopian Evangelical Church"

## Key Design Decisions
1. **About page stays server component** — fetches directly with `headers()` for absolute URL
2. **Homepage/Footer use client components** — TanStack Query hooks for real-time data
3. **Graceful degradation** — every API-driven section falls back to `churchConfig` data
4. **Skeleton loading** — ServiceTimesSection shows 4 card placeholders while loading
5. **Time formatting** — `formatTimeRange()` converts 24h "HH:MM" to "h:mm AM/PM"
6. **Beliefs parsing** — `parseBeliefs()` splits double-newline-separated text into accordion items

## Lint Status
- ESLint: clean (0 errors)