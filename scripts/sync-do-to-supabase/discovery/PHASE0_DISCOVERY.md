# Phase 0 Discovery — DigitalOcean → Supabase Weekly Sync

Generated: 2026-05-25T23:04:17.070Z

## Executive summary

Read-only inventory of three DigitalOcean Postgres databases and comparison to Supabase mirror state.

### Source databases

| DO database | Role | Supabase target |
|-------------|------|-----------------|
| `campings` | Dec 2024–present OTA warehouse | `hipcamp.*`, `campspot.*`, `bookoutdoors.*` (identical) |
| `hipcamp` | Legacy archive | `hipcamp_public.*` |
| `campspot` | Legacy archive | `campspot_public.*` |

### Key findings

- **Campings total rows (all tables):** 158,132,925
- **Rows changed in last 7 days (updated_at):** 2,917,808
- **Change tracking:** All campings fact tables except `old_data_table` have `created_at` + `updated_at`. Composite PKs on `sites`, `propertys`, `siteseasonals`.
- **7-day delta on large tables is high** — `campspot.sites` ~1.85M, `hipcamp.sites` ~484K. Weekly sync must include incremental upsert on large tables, not skip them.
- **Supabase drift:** 15/19 campings mirror tables have row-count mismatch vs DO; `campspot.sites` is 15.6M in SB vs 107M on DO (~86% gap). One-time `--full --include-large` backfill required.
- **Materialized views on DO:** `campspot.site_monthly_analytics` (~3.4M rows) — used by rate export scripts; not yet mirrored in Supabase.
- **Flat CSV tables (`public.hipcamp` / `public.campspot`):** No export query in this repo; separate Phase 3 transform.

## Recommended weekly sync scope

### Decision: sync scope for `campings` database

| Tier | Tables | Strategy | Notes |
|------|--------|----------|-------|
| **A — Weekly incremental** | All tables with `updated_at` (17 tables) | `WHERE updated_at > watermark` + upsert on PK | Includes large `sites`/`propertys`; ~2.9M rows/week current volume |
| **B — Monthly full replace** | `hipcamp.old_data_table`, `campspot.old_data_table` | Truncate + reload | No `updated_at`; historical aggregates |
| **C — One-time backfill** | Any table where SB row count ≠ DO | `--full --include-large` | Fix existing drift before relying on incremental |
| **D — Defer** | Legacy `hipcamp` / `campspot` DBs | Optional `sync:do:all` | Pre-Dec 2024 archive; not app-critical |
| **E — Phase 3** | `public.hipcamp`, `public.campspot` flat tables | SQL transform from normalized mirror | Powers map / Sage AI / comps today |
| **F — Add to mirror** | `campspot.site_monthly_analytics` (matview) | Snapshot as table on Supabase | Required for rate analytics exports |

### Tier A — Weekly incremental tables

| Table | DO rows | 7-day delta | Supabase rows | Drift | PK |
|-------|---------|-------------|---------------|-------|-----|
| hipcamp.importedsites | 12,291 | 0 | 0 | -12,291 | id |
| hipcamp.imports | 21 | 0 | 37 | 16 | id |
| hipcamp.propertydetails | 39,865 | 27,977 | 53,172 | 13,307 | id |
| hipcamp.propertys | 13,197,138 | 194,525 | 1,450,000 | -11,747,138 | id, scraping_id |
| hipcamp.scrapings | 565 | 7 | 1,055 | 490 | id |
| hipcamp.sitedetails | 130,543 | 73,205 | 118,382 | -12,161 | id |
| hipcamp.sites | 33,444,605 | 483,716 | 2,300,000 | -31,144,605 | id, scraping_id |
| hipcamp.siteseasonals | 1,186,802 | 0 | 1,049,334 | -137,468 | id, scraping_id |
| campspot.propertydetails | 3,578 | 3,199 | 3,325 | -253 | id |
| campspot.propertys | 1,433,496 | 22,360 | 2,188,423 | 754,927 | id, scraping_id |
| campspot.scrapings | 508 | 7 | 941 | 433 | id |
| campspot.sitedetails | 332,871 | 265,248 | 308,246 | -24,625 | id, property_id, is_parent |
| campspot.sites | 107,311,540 | 1,847,564 | 15,659,793 | -91,651,747 | id, scraping_id, is_parent, property_id |
| campspot.siteseasonals | 321,565 | 0 | 292,220 | -29,345 | id, scraping_id, property_id |
| bookoutdoors.propertys | 8,527 | 0 | 8,527 | — | id, scraping_id |
| bookoutdoors.scrapings | 3 | 0 | 3 | — | id |
| bookoutdoors.sites | 48,174 | 0 | 48,174 | — | id, scraping_id |

### Tier B — Full replace (no updated_at)

- `hipcamp.old_data_table` — 71,031 rows
- `campspot.old_data_table` — 589,802 rows

### Views & materialized views (campings)

| Object | Kind | Rows | In Supabase | Action |
|--------|------|------|-------------|--------|
| hipcamp.latest_sites | matview | 130,543 | no | Copy as table or REFRESH from upstream on Supabase; not a base table on DO |
| hipcamp.property_yearly_analytics | view | 63,783 | no | Create matching view definition on Supabase after base tables sync |
| hipcamp.seasonal_daily_stats_agg | matview | 713,225 | no | Copy as table or REFRESH from upstream on Supabase; not a base table on DO |
| hipcamp.site_monthly_analytics | matview | 2,008,411 | no | Copy as table or REFRESH from upstream on Supabase; not a base table on DO |
| hipcamp.site_yearly_analytics | matview | 264,467 | no | Copy as table or REFRESH from upstream on Supabase; not a base table on DO |
| campspot.daily_occupancy | matview | 98,483,383 | no | Copy as table or REFRESH from upstream on Supabase; not a base table on DO |
| campspot.daily_stats | matview | 86,339,542 | no | Copy as table or REFRESH from upstream on Supabase; not a base table on DO |
| campspot.latest_parents | matview | 25,154 | no | Copy as table or REFRESH from upstream on Supabase; not a base table on DO |
| campspot.latest_sites | matview | 303,352 | no | Copy as table or REFRESH from upstream on Supabase; not a base table on DO |
| campspot.property_yearly_analytics | view | 11,563 | no | Create matching view definition on Supabase after base tables sync |
| campspot.seasonal_daily_stats_agg | matview | 1,933,418 | no | Copy as table or REFRESH from upstream on Supabase; not a base table on DO |
| campspot.site_monthly_analytics | matview | 3,387,028 | no | Copy as table or REFRESH from upstream on Supabase; not a base table on DO |
| campspot.site_yearly_analytics | matview | 803,395 | no | Copy as table or REFRESH from upstream on Supabase; not a base table on DO |

### Tier D — Legacy archive DBs (optional `sync:do:all`)

| Table | DO rows | 7-day delta | In Supabase |
|-------|---------|-------------|-------------|
| hipcamp.public.average → hipcamp_public.average | 18,180,039 | n/a | no |
| hipcamp.public.average_general → hipcamp_public.average_general | 114,036 | n/a | no |
| hipcamp.public.cache → hipcamp_public.cache | 0 | n/a | no |
| hipcamp.public.dates → hipcamp_public.dates | 400 | n/a | no |
| hipcamp.public.listings → hipcamp_public.listings | 5,613,542 | n/a | no |
| hipcamp.public.old_average_data → hipcamp_public.old_average_data | 0 | n/a | no |
| hipcamp.public.password → hipcamp_public.password | 1 | n/a | no |
| hipcamp.public.sites → hipcamp_public.sites | 21,741,590 | n/a | no |
| hipcamp.public.sites_reserve → hipcamp_public.sites_reserve | 0 | n/a | no |
| campspot.public.average → campspot_public.average | 61,552,558 | n/a | no |
| campspot.public.average_general → campspot_public.average_general | 227,511 | n/a | no |
| campspot.public.cache → campspot_public.cache | 42 | n/a | no |
| campspot.public.campsites → campspot_public.campsites | 0 | n/a | no |
| campspot.public.dates → campspot_public.dates | 458 | n/a | no |
| campspot.public.exports → campspot_public.exports | 455 | n/a | no |
| campspot.public.listings → campspot_public.listings | 907,115 | n/a | no |
| campspot.public.old_average_data → campspot_public.old_average_data | 12,990 | n/a | no |
| campspot.public.sites → campspot_public.sites | 59,541,243 | n/a | no |
| campspot.public.spatial_ref_sys → campspot_public.spatial_ref_sys | 8,500 | n/a | no |
| campspot.public.year_prices → campspot_public.year_prices | 50,291 | n/a | no |

## Full inventory — campings database

| Schema | Table | Rows | PK | updated_at | 7d delta | max(updated_at) | SB exists | SB rows | Recommendation |
|--------|-------|------|----|------------|----------|-----------------|-----------|---------|----------------|
| hipcamp | importedsites | 12,291 | id | yes | 0 | 2025-12-12 | yes | 0 | incremental |
| hipcamp | imports | 21 | id | yes | 0 | 2026-04-07 | yes | 37 | incremental |
| hipcamp | old_data_table | 71,031 | — | no | n/a | — | yes | 71,031 | full |
| hipcamp | propertydetails | 39,865 | id | yes | 27,977 | 2026-05-25 | yes | 53,172 | incremental |
| hipcamp | propertys | 13,197,138 | id, scraping_id | yes | 194,525 | 2026-05-25 | yes | 1,450,000 | incremental |
| hipcamp | scrapings | 565 | id | yes | 7 | 2026-05-25 | yes | 1,055 | incremental |
| hipcamp | sitedetails | 130,543 | id | yes | 73,205 | 2026-05-25 | yes | 118,382 | incremental |
| hipcamp | sites | 33,444,605 | id, scraping_id | yes | 483,716 | 2026-05-25 | yes | 2,300,000 | incremental |
| hipcamp | siteseasonals | 1,186,802 | id, scraping_id | yes | 0 | 2026-05-01 | yes | 1,049,334 | incremental |
| campspot | old_data_table | 589,802 | — | no | n/a | — | yes | 1,123,250 | full |
| campspot | propertydetails | 3,578 | id | yes | 3,199 | 2026-05-25 | yes | 3,325 | incremental |
| campspot | propertys | 1,433,496 | id, scraping_id | yes | 22,360 | 2026-05-25 | yes | 2,188,423 | incremental |
| campspot | scrapings | 508 | id | yes | 7 | 2026-05-25 | yes | 941 | incremental |
| campspot | sitedetails | 332,871 | id, property_id, is_parent | yes | 265,248 | 2026-05-25 | yes | 308,246 | incremental |
| campspot | sites | 107,311,540 | id, scraping_id, is_parent, property_id | yes | 1,847,564 | 2026-05-25 | yes | 15,659,793 | incremental |
| campspot | siteseasonals | 321,565 | id, scraping_id, property_id | yes | 0 | 2026-05-02 | yes | 292,220 | incremental |
| bookoutdoors | propertys | 8,527 | id, scraping_id | yes | 0 | 2024-10-17 | yes | 8,527 | incremental |
| bookoutdoors | scrapings | 3 | id | yes | 0 | 2024-10-17 | yes | 3 | incremental |
| bookoutdoors | sites | 48,174 | id, scraping_id | yes | 0 | 2024-10-17 | yes | 48,174 | incremental |

## Gaps & decisions

1. **`old_data_table`** — No `updated_at`; monthly full replace only.
2. **Large-table 7-day deltas are not small** — `campspot.sites` ~1.85M/week. Default sync must run incremental on large tables; `--exclude-large` is for dry runs only.
3. **Initial backfill** — Supabase mirror is partial (~15M / 107M campspot sites). Run `npm run sync:do -- --full --include-large` once before weekly schedule.
4. **Stale rows in Supabase** — Some tables (e.g. `hipcamp.scrapings`) have *more* rows in SB than DO → prior imports without upsert cleanup; backfill with truncate or `--full`.
5. **`site_monthly_analytics`** — Materialized view on DO (3.4M rows); add to sync as table snapshot.
6. **Legacy DBs** — 167M+ rows combined; no `updated_at` on most tables; defer unless historical research needed.
7. **Flat CSV export** — Not generated in-repo; Phase 3 must reverse-engineer from `propertydetails` + `sitedetails` + seasonals/analytics joins.
8. **Downstream** — After sync: refresh `unified_comps` matview + RV overview cache.

## Phase 1 actions (approved scope)

1. One-time full backfill: `npm run sync:do -- --databases=campings --full --include-large`
2. Change default weekly job to incremental **including** large tables (remove `--exclude-large` from GitHub Actions).
3. Add `site_monthly_analytics` matview snapshot to sync pipeline.
4. Chain downstream refresh after successful weekly run.