# Legacy Campings DB → Supabase (CSV path — deprecated)

> **Ongoing sync:** use [`sync:do`](../sync-do-to-supabase/README.md) instead.  
> Direct SQL from DigitalOcean (read-only) → Supabase upsert. No CSV files.

```bash
npm run sync:do          # weekly incremental
npm run sync:do:full     # full backfill
```

The commands `migrate:legacy`, `migrate:legacy-export`, and `migrate:legacy-import` now **print a deprecation message and exit**. They do not run the CSV pipeline unless you set `ALLOW_LEGACY_CSV_MIGRATION=1` and use the `migrate:legacy:csv-*` scripts.

---

## What still lives here

| Script | Purpose |
|--------|---------|
| `export-legacy-schema.ts` / `npm run migrate:legacy-schema` | One-off DDL from DO → `schema-hipcamp.sql`, `schema-campspot.sql` |
| `01-enable-postgis.sql`, `02-create-public-views.sql`, `03-create-rls-policies.sql` | Supabase setup SQL |
| `export-data.ts` / `import-data.ts` | **Deprecated** CSV export/import (escape hatch only) |

## Escape hatch (CSV, not recommended)

```bash
ALLOW_LEGACY_CSV_MIGRATION=1 npm run migrate:legacy:csv-export
ALLOW_LEGACY_CSV_MIGRATION=1 npm run migrate:legacy:csv-import
```

Or the full old orchestrator:

```bash
ALLOW_LEGACY_CSV_MIGRATION=1 npm run migrate:legacy:csv
```

## Why CSV was replaced

- Extra disk step (`data/*.csv`), no incremental watermarks
- Blind `INSERT` on import (duplicates vs `sync:do` upsert)
- Large tables excluded by default

`sync:do` uses the same schemas (`hipcamp`, `campspot`, `bookoutdoors`) with incremental `updated_at` sync and composite-key upserts.

## Prerequisites (schema one-off)

1. PostGIS: `01-enable-postgis.sql` in Supabase SQL Editor  
2. `.env.local`: `SUPABASE_DB_URL`, `DIGITALOCEAN_DB_*` / `LEGACY_CAMPING_DB_*`

## File structure

```
scripts/migrate-legacy-to-supabase/
├── deprecated-csv.ts            # Blocks migrate:legacy-* unless env override
├── export-legacy-schema.ts      # Still supported
├── export-data.ts               # CSV export (escape hatch)
├── import-data.ts               # CSV import (escape hatch)
├── run-migration.ts             # CSV orchestrator (escape hatch)
├── 01-enable-postgis.sql
├── 02-create-public-views.sql
├── 03-create-rls-policies.sql
└── data/                        # gitignored CSV staging
```
