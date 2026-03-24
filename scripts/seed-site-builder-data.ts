#!/usr/bin/env npx tsx
/**
 * Seed Site Builder reference data: glamping types, RV site types structure.
 * Run: npx tsx scripts/seed-site-builder-data.ts
 *
 * Requires SUPABASE_DB_URL in .env.local.
 * Idempotent: uses upsert on slug.
 *
 * NO mock or fallback cost data. All costs come ONLY from:
 * - Marshall & Swift (CCE): Glamping base costs via cce_cost_rows
 * - Walden Insights: Catalog units via cce_catalog_units (when used)
 * - Feasibility studies (.xlsx/.docx): RV site costs + amenity costs via sync-feasibility-amenities.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { Client } from 'pg';
import { SITE_BUILDER_GLAMPING_TYPE_SEED_ROWS } from '../lib/site-builder/glamping-types-defaults';

config({ path: resolve(process.cwd(), '.env.local') });

const GLAMPING_TYPES = SITE_BUILDER_GLAMPING_TYPE_SEED_ROWS;

// base_cost_per_site = 0; costs come only from feasibility_development_costs
const RV_SITE_TYPES = [
  { slug: 'full-hookup-pull-thru', name: 'Full hookup pull-thru', width_ft: 45, depth_ft: 90, base_cost_per_site: 0, hookup_type: 'full' },
  { slug: 'full-hookup-back-in', name: 'Full hookup back-in', width_ft: 40, depth_ft: 80, base_cost_per_site: 0, hookup_type: 'full' },
  { slug: 'back-in-standard', name: 'Back-in standard', width_ft: 35, depth_ft: 70, base_cost_per_site: 0, hookup_type: 'full' },
  { slug: 'back-in-deluxe', name: 'Back-in deluxe', width_ft: 40, depth_ft: 80, base_cost_per_site: 0, hookup_type: 'full' },
];

// Default amenities (fallback when sync-feasibility-amenities.ts hasn't run).
// Sync overwrites with real costs from feasibility studies when available.
const DEFAULT_AMENITY_COSTS: { slug: string; name: string; cost_per_unit: number; applies_to: string }[] = [
  // Per-site deck or patio add (typical wood/composite platform), not whole-building shell—was 40500 in error
  { slug: 'deck-patio', name: 'Deck / patio', cost_per_unit: 6500, applies_to: 'both' },
  { slug: 'fire-pit', name: 'Fire pit', cost_per_unit: 400, applies_to: 'both' },
  { slug: 'patio-furniture', name: 'Patio furniture', cost_per_unit: 750, applies_to: 'both' },
  { slug: 'shade-structure', name: 'Shade structure / pergola', cost_per_unit: 500, applies_to: 'both' },
  { slug: 'picnic-table', name: 'Picnic table', cost_per_unit: 350, applies_to: 'both' },
  { slug: 'outdoor-kitchen', name: 'Outdoor kitchen / grill', cost_per_unit: 8500, applies_to: 'glamping' },
  { slug: 'private-bathroom', name: 'Private bathroom', cost_per_unit: 25000, applies_to: 'glamping' },
  { slug: 'private-hot-tub', name: 'Private hot tub', cost_per_unit: 12000, applies_to: 'glamping' },
  { slug: 'concrete-pad', name: 'Concrete pad', cost_per_unit: 2500, applies_to: 'rv' },
  { slug: 'water-hookup', name: 'Water hookup', cost_per_unit: 1500, applies_to: 'rv' },
  { slug: 'sewer-hookup', name: 'Sewer hookup', cost_per_unit: 2000, applies_to: 'rv' },
  { slug: 'wifi', name: 'WiFi access', cost_per_unit: 500, applies_to: 'both' },
];

async function main() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error('SUPABASE_DB_URL is required. Add it to .env.local');
    process.exit(1);
  }

  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();

    const glampingSlugs = GLAMPING_TYPES.map((g) => g.slug);
    for (const row of GLAMPING_TYPES) {
      await client.query(
        `INSERT INTO site_builder_glamping_types (slug, name, default_sqft, default_diameter_ft, cce_occupancy_code, default_quality_type)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (slug) DO UPDATE SET
           name = EXCLUDED.name,
           default_sqft = EXCLUDED.default_sqft,
           default_diameter_ft = EXCLUDED.default_diameter_ft,
           cce_occupancy_code = EXCLUDED.cce_occupancy_code,
           default_quality_type = EXCLUDED.default_quality_type`,
        [row.slug, row.name, row.default_sqft, row.default_diameter_ft, row.cce_occupancy_code, row.default_quality_type]
      );
    }
    await client.query(
      `DELETE FROM site_builder_glamping_types WHERE NOT (slug = ANY($1::text[]))`,
      [glampingSlugs]
    );
    console.log(`✓ Upserted ${GLAMPING_TYPES.length} glamping types`);

    const rvSlugs = RV_SITE_TYPES.map((r) => r.slug);
    for (const row of RV_SITE_TYPES) {
      await client.query(
        `INSERT INTO site_builder_rv_site_types (slug, name, width_ft, depth_ft, base_cost_per_site, hookup_type)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (slug) DO UPDATE SET
           name = EXCLUDED.name,
           width_ft = EXCLUDED.width_ft,
           depth_ft = EXCLUDED.depth_ft,
           base_cost_per_site = EXCLUDED.base_cost_per_site,
           hookup_type = EXCLUDED.hookup_type`,
        [row.slug, row.name, row.width_ft, row.depth_ft, row.base_cost_per_site, row.hookup_type]
      );
    }
    await client.query(
      `DELETE FROM site_builder_rv_site_types WHERE NOT (slug = ANY($1::text[]))`,
      [rvSlugs]
    );
    console.log(`✓ Upserted ${RV_SITE_TYPES.length} RV site types`);

    // Upsert default amenities (fallback when sync hasn't run; sync overwrites with real data)
    for (const row of DEFAULT_AMENITY_COSTS) {
      await client.query(
        `INSERT INTO site_builder_amenity_costs (slug, name, cost_per_unit, applies_to)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (slug) DO UPDATE SET
           name = EXCLUDED.name,
           cost_per_unit = EXCLUDED.cost_per_unit,
           applies_to = EXCLUDED.applies_to`,
        [row.slug, row.name, row.cost_per_unit, row.applies_to]
      );
    }
    await client.query(
      `DELETE FROM site_builder_amenity_costs WHERE NOT (slug = ANY($1::text[]))`,
      [DEFAULT_AMENITY_COSTS.map((a) => a.slug)]
    );
    console.log(`✓ Upserted ${DEFAULT_AMENITY_COSTS.length} default amenities (run sync-feasibility-amenities.ts to replace with feasibility study data)`);
  } catch (err) {
    console.error('Seed failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
