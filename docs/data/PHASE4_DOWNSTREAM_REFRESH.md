# Phase 4 — Downstream refresh chain

After `public.hipcamp` / `public.campspot` are updated (Phase 3 SQL transform or CSV upload), dependent surfaces must be refreshed:

| Step | What | Consumers |
|------|------|-----------|
| 1 | `REFRESH MATERIALIZED VIEW public.unified_comps` | `/admin/comps`, map geo API, Sage AI comps tools |
| 2 | Invalidate Upstash `admin:comps-unified:facets:v*` | Comps filter dropdowns |
| 3 | Recompute `campspot_rv_overview_cache` | `/admin/rv-industry-overview` charts |

## Commands

| Command | Purpose |
|---------|---------|
| `npm run refresh:downstream` | All three steps |
| `npm run refresh:downstream:dry-run` | Log planned steps only |
| `npm run refresh:unified-comps` | Matview + facets cache only |
| `npm run refresh:rv-overview` | RV overview Postgres cache only |

`npm run transform:flat-sites` runs Phase 4 automatically after a successful rebuild (use `--skip-downstream` to opt out).

### Flags (`refresh:downstream`)

- `--only=unified_comps,facets_cache,rv_overview`
- `--skip-unified-comps` / `--skip-facets-cache` / `--skip-rv-overview`
- `--dry-run`

## Environment

| Variable | Step |
|----------|------|
| `SUPABASE_DB_URL` | `unified_comps` refresh (direct Postgres) |
| `NEXT_PUBLIC_SUPABASE_URL` | RV overview scan |
| `SUPABASE_SECRET_KEY` | RV overview scan (service role) |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Facets cache invalidation (optional) |

## Audit

```sql
SELECT id, started_at, finished_at, status, trigger_source, steps
FROM public.downstream_refresh_runs
ORDER BY started_at DESC
LIMIT 10;
```

Apply DDL once (or let the script create it):

`scripts/migrations/downstream-refresh/01-downstream-refresh-audit.sql`

## Weekly GitHub Action

Workflow: `.github/workflows/weekly-do-sync.yml`

| Input | Behavior |
|-------|----------|
| `flat_transform: true` | Phase 3 rebuild + Phase 4 chained in the same job |
| `downstream_refresh: true` (without flat transform) | Phase 4 only — use after a manual flat rebuild |

Required secrets for Phase 4: `SUPABASE_DB_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and optionally Upstash for facets.

## Vercel / Next.js cache note

The RV overview script updates **Postgres** (`campspot_rv_overview_cache`). Next.js `unstable_cache` tag `rv-industry-overview` is cleared when you:

- POST `/api/admin/rv-industry-overview/refresh-cache` (admin session or `RV_INDUSTRY_OVERVIEW_REFRESH_SECRET`), or
- Redeploy production.

Daily Vercel cron `0 9 * * *` on `/api/cron/refresh-unified-comps` remains a fallback if pg_cron is disabled; weekly ETL should run `refresh:downstream` after data loads so comps stay same-day fresh.

## Full weekly pipeline (target state)

```
sync:do (normalized mirror)
    → transform:flat-sites (matviews + public.hipcamp/campspot)
        → refresh:downstream (unified_comps + facets + rv_overview)
```
