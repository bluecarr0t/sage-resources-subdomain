-- RLS for legacy archive schemas (daily + monthly)
-- Run after legacy bulk transfer / monthly condense.
-- service_role bypasses RLS; authenticated gets read-only SELECT.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema_name, c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r'
      AND n.nspname IN (
        'hipcamp_public',
        'campspot_public',
        'hipcamp_public_monthly',
        'campspot_public_monthly'
      )
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', r.schema_name, r.table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated read" ON %I.%I', r.schema_name, r.table_name);
    EXECUTE format(
      'CREATE POLICY "Allow authenticated read" ON %I.%I FOR SELECT TO authenticated USING (true)',
      r.schema_name,
      r.table_name
    );
  END LOOP;
END $$;
