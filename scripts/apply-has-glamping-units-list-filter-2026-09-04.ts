#!/usr/bin/env npx tsx
/**
 * Recreate all_sage_data_list_anchors with derived has_glamping_units.
 *
 * Usage:
 *   npx tsx scripts/apply-has-glamping-units-list-filter-2026-09-04.ts
 *
 * Requires SUPABASE_DB_URL in .env.local
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { writeFileSync } from 'fs';
import { Client } from 'pg';
import { buildIsGlampingInventoryUnitTypeSql } from '../lib/admin/has-glamping-units';

config({ path: resolve(process.cwd(), '.env.local') });

function buildMigrationSql(): string {
  return `-- Derived has_glamping_units on the Sage Data list-anchors view.
-- Safe to re-run. Labels come from lib/admin/has-glamping-units.ts
-- (same taxonomy as the edit-property readout). Not a stored table column.

${buildIsGlampingInventoryUnitTypeSql()}

COMMENT ON FUNCTION public.is_glamping_inventory_unit_type(text) IS
  'True when unit_type is furnished glamping inventory (yurt, safari tent, dome, …). RV Site / Campsite / hotel SKUs are false.';

CREATE OR REPLACE FUNCTION public.sage_data_property_list_key(
  p_property_id uuid,
  p_slug text,
  p_property_name text,
  p_city text,
  p_state text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT COALESCE(
    p_property_id::text,
    NULLIF(btrim(p_slug), ''),
    lower(btrim(coalesce(p_property_name, ''))) || '|' ||
      lower(btrim(coalesce(p_city, ''))) || '|' ||
      lower(btrim(coalesce(p_state, '')))
  );
$$;

DROP VIEW IF EXISTS public.all_sage_data_list_anchors;

CREATE VIEW public.all_sage_data_list_anchors AS
SELECT DISTINCT ON (
  public.sage_data_property_list_key(
    agp.property_id,
    agp.slug,
    agp.property_name,
    agp.city,
    agp.state
  )
)
  agp.*,
  EXISTS (
    SELECT 1
    FROM public.all_sage_data sib
    WHERE public.sage_data_property_list_key(
            sib.property_id,
            sib.slug,
            sib.property_name,
            sib.city,
            sib.state
          ) = public.sage_data_property_list_key(
            agp.property_id,
            agp.slug,
            agp.property_name,
            agp.city,
            agp.state
          )
      AND public.is_glamping_inventory_unit_type(sib.unit_type)
  ) AS has_glamping_units
FROM public.all_sage_data agp
ORDER BY
  public.sage_data_property_list_key(
    agp.property_id,
    agp.slug,
    agp.property_name,
    agp.city,
    agp.state
  ),
  agp.id;

COMMENT ON VIEW public.all_sage_data_list_anchors IS
  'Deduped admin Sage Data list: one row per logical property (lowest id = anchor). has_glamping_units is derived from sibling unit_types.';

COMMENT ON COLUMN public.all_sage_data_list_anchors.has_glamping_units IS
  'True when any sibling site row has a furnished glamping unit_type. Not stored on all_sage_data.';

GRANT SELECT ON public.all_sage_data_list_anchors TO authenticated;
GRANT SELECT ON public.all_sage_data_list_anchors TO service_role;

NOTIFY pgrst, 'reload schema';
`;
}

async function main() {
  const sql = buildMigrationSql();
  const sqlPath = resolve(
    process.cwd(),
    'scripts/migrations/add-has-glamping-units-to-list-anchors-2026-09-04.sql'
  );
  writeFileSync(sqlPath, sql, 'utf-8');
  console.log(`Wrote ${sqlPath}`);

  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error('SUPABASE_DB_URL is required. Add it to .env.local');
    process.exit(1);
  }

  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    await client.query(sql);
    const { rows } = await client.query<{
      with_glamping: string;
      without_glamping: string;
    }>(
      `SELECT
         COUNT(*) FILTER (WHERE has_glamping_units) AS with_glamping,
         COUNT(*) FILTER (WHERE NOT has_glamping_units) AS without_glamping
       FROM public.all_sage_data_list_anchors`
    );
    console.log('✓ list-anchors has_glamping_units column applied');
    console.table(rows);
  } catch (err) {
    console.error('Migration failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
