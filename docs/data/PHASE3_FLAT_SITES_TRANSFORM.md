# Phase 3 — Flat table SQL transform

Replaces manual DigitalOcean web UI CSV export + `upload-hipcamp-csv.ts` / `upload-campspot-csv.ts` with an automated rebuild of `public.hipcamp` and `public.campspot` from the normalized mirror (`hipcamp.*`, `campspot.*`).

**Decision:** Option B in [DO_SUPABASE_SYNC_DECISIONS.md](./DO_SUPABASE_SYNC_DECISIONS.md) — SQL transform from normalized mirror + matview snapshots.

## Pipeline

```
DigitalOcean campings DB
        │
        ├── sync:do (weekly) → hipcamp.* / campspot.* base tables
        │
        └── matviews (read-only snapshot)
                    │
                    ▼
        transform:flat-sites
                    │
                    ├── sync matviews → site_monthly_analytics, latest_sites
                    ├── SQL INSERT → public.campspot / public.hipcamp
                    └── audit → public.flat_transform_runs
```

## Prerequisites

1. **One-time backfill** of normalized mirror (if counts lag DO):
   ```bash
   npm run sync:do:full
   ```
2. Env in `.env.local`: `SUPABASE_DB_URL`, `DIGITALOCEAN_DB_*` (same as `sync:do`).
3. Optional: apply helper/audit DDL once in Supabase SQL editor (or let the script apply them):
   - `scripts/migrations/flat-sites-transform/00-helper-functions.sql`
   - `scripts/migrations/flat-sites-transform/03-flat-transform-audit.sql`

## Commands

| Command | Purpose |
|---------|---------|
| `npm run transform:flat-sites` | Matview snapshot + full rebuild both flat tables |
| `npm run transform:flat-sites -- --only=campspot` | Campspot only |
| `npm run transform:flat-sites -- --skip-matviews` | Skip DO matview pull (use existing snapshots) |
| `npm run transform:flat-sites:dry-run` | Preflight + matview dry-run counts |
| `npm run sync:do:matviews` | Matview snapshot only |

## What gets populated

| Area | Source |
|------|--------|
| Property / site identity | `latest_sites`, `propertydetails`, parent `sitedetails` |
| 2024–2026 rates & occupancy | `site_monthly_analytics` (same rules as `export-campspot-sites-rates.ts`: occupancy > 5% for rates, placeholder rates blanked) |
| High/low months | Monthly analytics pivots |
| Seasonal weekday/weekend | `siteseasonals.seasonal_rates` JSON |
| Geo | `propertydetails.coordinates` → `lat` / `lon` text (+ generated `lat_num` / `lon_num`) |
| Core amenities | JSON on `sitedetails` / `latest_sites` / Hipcamp `core_amenities` |

Remaining flat columns (extended activity/terrain flags) are left `NULL` until mapped; app-critical fields used by `unified_comps` are covered.

## Weekly ops (recommended)

1. GitHub Action: `npm run sync:do` (normalized incremental).
2. Same window or after: `npm run transform:flat-sites` (or add to workflow when validated).
3. `npm run refresh:downstream` (runs automatically after `transform:flat-sites`; see [PHASE4_DOWNSTREAM_REFRESH.md](./PHASE4_DOWNSTREAM_REFRESH.md)).

## Validation

Compare row counts and spot-check rates vs previous CSV-backed tables:

```sql
SELECT count(*) FROM public.campspot;
SELECT count(*) FROM public.hipcamp;

SELECT property_name, occupancy_rate_2025, avg_retail_daily_rate_2025, pool, lat, lon
FROM public.campspot
WHERE occupancy_rate_2025 IS NOT NULL
LIMIT 20;
```

Audit history:

```sql
SELECT * FROM public.flat_transform_runs ORDER BY started_at DESC LIMIT 10;
```

## Files

- `scripts/flat-sites-transform/run-flat-transform.ts` — orchestrator
- `scripts/sync-do-to-supabase/matview-snapshot.ts` — DO matview → Supabase table
- `scripts/migrations/flat-sites-transform/*.sql` — helpers + rebuild SQL
