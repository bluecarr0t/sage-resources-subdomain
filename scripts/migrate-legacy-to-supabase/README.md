# Legacy Campings DB to Supabase Migration

Migrates `hipcamp` and `campspot` schemas from the legacy campings database (DigitalOcean) to Supabase.

## Prerequisites

1. **Supabase**: Enable PostGIS in Supabase SQL Editor:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```

2. **Environment**: Add to `.env.local`:
   ```
   SUPABASE_DB_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```
   Get from: Supabase Dashboard → Project Settings → Database → Connection string (URI, Transaction mode).

## Usage

### Full migration (schema + export + import)

```bash
npm run migrate:legacy
```

Or step by step:

```bash
# 1. Export schema DDL from legacy DB
npm run migrate:legacy-schema

# 2. Run schema in Supabase (01-enable-postgis.sql first, then schema-hipcamp.sql, schema-campspot.sql)
# Or use run-migration.ts which does this automatically

# 3. Export data (excludes large tables: sites, hipcamp.propertys)
npm run migrate:legacy-export

# 4. Import data to Supabase
npm run migrate:legacy-import
```

### Options

- `run-migration.ts --schema-only`: Create schema only, skip export/import
- `run-migration.ts --skip-export`: Use existing exported data
- `run-migration.ts --skip-import`: Export only, don't import
- `export-data.ts --tables=propertydetails,imports`: Export specific tables
- `export-data.ts --exclude-large`: Skip sites and hipcamp.propertys (default in migrate:legacy)

## Scale considerations

- **sites** (88M campspot, 28M hipcamp): Excluded by default. Use streaming/COPY for full migration.
- **hipcamp.propertys** (11M rows): Excluded by default.
- Smaller tables (propertydetails, imports, scrapings, etc.) are exported and imported.

## File structure

```
scripts/migrate-legacy-to-supabase/
├── 01-enable-postgis.sql    # Run in Supabase first
├── export-legacy-schema.ts   # Generate schema DDL
├── schema-hipcamp.sql        # Generated
├── schema-campspot.sql       # Generated
├── export-data.ts            # Export to CSV
├── import-data.ts            # Import from CSV
├── run-migration.ts          # Orchestrator
├── README.md
└── data/                     # Exported CSVs (gitignored)
```
