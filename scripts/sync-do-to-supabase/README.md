# DigitalOcean → Supabase weekly sync

Read-only pull from DigitalOcean Postgres into **identical schemas and table names** in Supabase (`sage-outdoor-advisory`).

## Condensed sync policy (Phase 1)

**DigitalOcean `campings` is the system of record for raw scrape history.** Supabase does **not** maintain full `sites` / `propertys` history parity — that would fill disk as scrapers run daily.

| Weekly (default) | Emergency only |
|------------------|----------------|
| Dimensions: `scrapings`, `propertydetails`, `sitedetails`, … (`--no-large`) | `npm run sync:do:full` / `--include-large` |
| Matview snapshots: `latest_sites`, `site_monthly_analytics`, `site_yearly_analytics` | Full fact-table backfill |

- Launchd (`run-local-sync.sh`) always passes `--databases=campings --no-large`, then `sync:do:matviews`.
- Bare `npm run sync:do` defaults to **campings** + **skip large tables**.
- Set `SYNC_INCLUDE_LARGE_DEFAULT=1` or pass `--include-large` only when intentionally pulling history.
- Legacy `hipcamp_public` / `campspot_public` are a **frozen** 2023–early‑2025 archive (one-time transfer); not part of weekly sync.
- Flat app tables (`public.hipcamp` / `public.campspot`) remain a separate path (Phase 2+: `transform:flat-sites`).

## Legacy archives (`hipcamp` / `campspot` DBs → `*_public`)

One-time transfer of the ~90 GB pre-2025 standalone databases. **Not** part of the weekly `campings` sync.

| Phase | Command | What it does |
|-------|---------|--------------|
| Small/medium tables | `npm run sync:do:legacy-small` | Upserts `dates`, `average_general`, etc.; skips `listings`/`average`/`sites` |
| Create empty xlarge tables | `npm run sync:do:legacy-schema` | `CREATE SCHEMA/TABLE` only for all legacy tables (incl. large) |
| Bulk COPY xlarge | `npm run sync:do:legacy-bulk -- hipcamp all` then `… campspot all` | Streams `listings` → `average` → `sites` via `psql \\COPY` |
| RLS | Run [`04-legacy-public-rls.sql`](./04-legacy-public-rls.sql) in SQL Editor | Authenticated read policies |

Always run from a DO allowlisted IP. Use direct `SUPABASE_DB_URL` (`:5432`), not the pooler. Skips `password` and `spatial_ref_sys`. Logs under `~/Library/Logs/sage-do-sync/`.

---

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

# Prefer direct :5432 for bulk sync (not transaction pooler :6543)
SUPABASE_DB_URL=postgresql://postgres.[ref]:[password]@db.[ref].supabase.co:5432/postgres
```

`LEGACY_CAMPING_*` aliases are still supported for older scripts.

## Commands

```bash
# Phase 0 discovery (read-only inventory + 7-day deltas)
npm run sync:do:discover

# Weekly default: campings dimensions only (skips sites/propertys)
npm run sync:do

# Explicit skip (same as default)
npm run sync:do -- --no-large

# Emergency: include large fact tables
npm run sync:do -- --include-large

# Matview snapshots (latest_sites, monthly + yearly analytics)
npm run sync:do:matviews

# All three databases (legacy archives) — still skips large unless --include-large
npm run sync:do -- --databases=campings,hipcamp,campspot

# Emergency full history backfill (rare)
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

Use `--include-large` or `npm run sync:do:full` only for intentional backfills; expect long runtimes and large disk use.

## Watermarks & audit

- `public.do_sync_watermarks` — last successful sync time per source table
- `public.do_sync_runs` — run history, row counts, errors

## Weekly schedule

Local launchd (allowlisted IP): `~/Library/LaunchAgents/com.sage.do-supabase-sync.plist` → `run-local-sync.sh` (Mondays 09:00 local).

GitHub Actions workflow: `.github/workflows/weekly-do-sync.yml` — manual dispatch only (GH-hosted runners cannot reach DO); defaults to `--no-large`.

Required secrets (if using Actions from a whitelisted runner): `DIGITALOCEAN_DB_PASSWORD`, `SUPABASE_DB_URL`.

**Monitoring:** `public.do_sync_runs` and `public.do_sync_watermarks` only (no Slack in v1). See `docs/data/DO_SUPABASE_SYNC_DECISIONS.md`.

**Flat app tables (`public.hipcamp` / `public.campspot`):** Not updated by `sync:do`. Manual CSV or Phase 3 `transform:flat-sites`.

## Related scripts

**Do not use** `migrate:legacy-export` / `migrate:legacy-import` for ongoing sync — those commands are deprecated and exit with instructions to use `sync:do`.

One-off schema DDL only: `npm run migrate:legacy-schema`  
Emergency CSV path: `ALLOW_LEGACY_CSV_MIGRATION=1 npm run migrate:legacy:csv-export` (see `scripts/migrate-legacy-to-supabase/README.md`)
