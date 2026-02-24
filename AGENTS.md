# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Sage Outdoor Advisory Resources Platform — a Next.js 14 (App Router) web application for the outdoor hospitality industry. Single-package project (not a monorepo). See `README.md` for full details.

### Key commands

| Task | Command |
|------|---------|
| Dev server | `npm run dev` (port 3001) |
| Lint | `npm run lint` |
| Test | `npm test` |
| Build | `npm run build` |

### Environment variables

A `.env.local` file is required. The app uses placeholder fallbacks for Supabase at build/dev time (see `lib/supabase.ts`), so the dev server starts without real credentials. For full functionality (database queries, map data, auth), real Supabase and Google Maps API keys are needed.

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

Optional: `REDIS_URL`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`

### Gotchas

- The dev server runs on **port 3001** (not the default 3000).
- The app uses `next-intl` for i18n — all routes are prefixed with a locale (e.g., `/en/`, `/es/`). The root `/` redirects to `/en`.
- The `map-page-performance.test.ts` test fails in environments without a real Supabase connection and `fetch` global. This is a known pre-existing issue; the other 44 tests pass.
- ESLint is configured via `next/core-web-vitals`; `npm run lint` runs Next.js's built-in ESLint integration.
- Node.js v22+ is required (project uses npm as package manager with `package-lock.json`).
