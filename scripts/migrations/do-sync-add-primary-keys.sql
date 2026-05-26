-- One-time: ensure PRIMARY KEY constraints on hipcamp/campspot mirror tables for Phase 2 upsert.
-- Safe to re-run: skips tables that already have a PK.
-- Run via Supabase SQL editor or: psql $SUPABASE_DB_URL -f scripts/migrations/do-sync-add-primary-keys.sql

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema_name, t.relname AS table_name, pg_get_constraintdef(c.oid) AS pk_def
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE c.contype = 'p'
      AND n.nspname IN ('hipcamp', 'campspot', 'bookoutdoors')
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c2
      JOIN pg_class t2 ON c2.conrelid = t2.oid
      JOIN pg_namespace n2 ON t2.relnamespace = n2.oid
      WHERE n2.nspname = r.schema_name AND t2.relname = r.table_name AND c2.contype = 'p'
    ) THEN
      NULL;
    END IF;
  END LOOP;
END $$;

-- hipcamp.propertydetails
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'hipcamp.propertydetails'::regclass AND contype = 'p'
  ) THEN
    DELETE FROM hipcamp.propertydetails a
    USING hipcamp.propertydetails b
    WHERE a.ctid < b.ctid AND a.id = b.id;
    ALTER TABLE hipcamp.propertydetails ADD PRIMARY KEY (id);
  END IF;
END $$;

-- hipcamp.scrapings
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'hipcamp.scrapings'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE hipcamp.scrapings ADD PRIMARY KEY (id);
  END IF;
END $$;

-- campspot.propertydetails
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'campspot.propertydetails'::regclass AND contype = 'p'
  ) THEN
    DELETE FROM campspot.propertydetails a
    USING campspot.propertydetails b
    WHERE a.ctid < b.ctid AND a.id = b.id;
    ALTER TABLE campspot.propertydetails ADD PRIMARY KEY (id);
  END IF;
END $$;

-- campspot.scrapings
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'campspot.scrapings'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE campspot.scrapings ADD PRIMARY KEY (id);
  END IF;
END $$;
