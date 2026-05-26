# DigitalOcean → Supabase weekly sync

Read-only pull from DigitalOcean Postgres into **identical schemas and table names** in Supabase (`sage-outdoor-advisory`).

## Safety

- **DigitalOcean is never modified.** Every DO connection uses `BEGIN READ ONLY` transactions.
- Write SQL (`INSERT`, `UPDATE`, `DELETE`, etc.) is rejected by the client library before execution on DO.
- Only Supabase receives writes (`INSERT … ON CONFLICT DO UPDATE`).

## Source databases (same host)

| Database   | Role                         | Supabase target                          |
|-----------|------------------------------|------------------------------------------|
| `campings` | Dec 2024–present OTA warehouse | `hipcamp.*`, `campspot.*`, `bookoutdoors.*` (identical) |
| `hipcamp`  | Legacy archive DB            | `hipcamp_public.*` (same table names; `public` on DO cannot map to Supabase `public`) |
| `campspot` | Legacy archive DB            | `campspot_public.*`                      |

Legacy standalone DBs use `{database}_public` because their tables live in PostgreSQL `public`, which conflicts with Supabase app tables. Table **names** inside those schemas match DigitalOcean exactly.

## Environment

Add to `.env.local` (never commit):

```bash
DIGITALOCEAN_DB_HOST=146.190.212.63
DIGITALOCEAN_DB_PORT=5432
DIGITALOCEAN_DB_USER=rou
DIGITALOCEAN_DB_PASSWORD=...

# Primary sync target (Dec 2024–present)
LEGACY_CAMPING_DB_NAME=campings

SUPABASE_DB_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

`LEGACY_CAMPING_*` aliases are still supported for older scripts.

## Commands

```bash
# Phase 0 discovery (read-only inventory + 7-day deltas)
npm run sync:do:discover

# Weekly default: campings, incremental upsert, includes sites/propertys
npm run sync:do

# Skip large tables
npm run sync:do -- --no-large

# All three databases (legacy archives)
npm run sync:do -- --databases=campings,hipcamp,campspot

# Initial backfill (full scan + upsert)
npm run sync:do:full

# Monthly snapshot tables (old_data_table)
npm run sync:do -- --replace-snapshots

# Specific tables only
npm run sync:do -- --tables=scrapings,propertydetails

# Continue after a single table failure
npm run sync:do -- --continue-on-error

# Preview without writing to Supabase
npm run sync:do -- --dry-run
```

## Large tables (excluded by default)

- `hipcamp.sites`, `hipcamp.propertys`
- `campspot.sites`, `campspot.propertys`
- Legacy `hipcamp_public.average`, `campspot_public.average`, etc.

Use `--include-large` for initial backfill; expect long runtimes.

## Watermarks & audit

- `public.do_sync_watermarks` — last successful sync time per source table
- `public.do_sync_runs` — run history, row counts, errors

## Weekly schedule

GitHub Actions workflow: `.github/workflows/weekly-do-sync.yml` (Mondays 08:00 UTC).

Required GitHub secrets: `DIGITALOCEAN_DB_PASSWORD`, `SUPABASE_DB_URL`.

**Monitoring:** `public.do_sync_runs` and `public.do_sync_watermarks` only (no Slack in v1). See `docs/data/DO_SUPABASE_SYNC_DECISIONS.md`.

**Flat app tables (`public.hipcamp` / `public.campspot`):** Not updated by `sync:do`. They come from manual CSV export on the DO web UI + `upload-hipcamp-csv.ts` / `upload-campspot-csv.ts` until Phase 3.

## Related scripts

**Do not use** `migrate:legacy-export` / `migrate:legacy-import` for ongoing sync — those commands are deprecated and exit with instructions to use `sync:do`.

One-off schema DDL only: `npm run migrate:legacy-schema`  
Emergency CSV path: `ALLOW_LEGACY_CSV_MIGRATION=1 npm run migrate:legacy:csv-export` (see `scripts/migrate-legacy-to-supabase/README.md`)
