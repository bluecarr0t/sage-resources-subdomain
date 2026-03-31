import type { Client } from 'pg';
import {
  GLAMPING_PROPERTY_AMENITY_FIELDS,
  glampingColumnsByCatalogSlug,
} from './glamping-properties-amenity-columns';

/**
 * Updates amenities.glamping_fields from the canonical glamping column map and
 * upserts dataset-only rows (no catalog slug) for admin / cost tooling.
 */
export async function syncAmenitiesGlampingMetadata(client: Client): Promise<void> {
  const bySlug = glampingColumnsByCatalogSlug();
  for (const [slug, fields] of Object.entries(bySlug)) {
    await client.query(`UPDATE amenities SET glamping_fields = $1::jsonb WHERE slug = $2`, [
      JSON.stringify(fields),
      slug,
    ]);
  }

  for (const f of GLAMPING_PROPERTY_AMENITY_FIELDS) {
    if (f.mapsToSiteBuilderSlug) continue;
    const cost = f.datasetDefaultCostPerUnit ?? 0;
    await client.query(
      `INSERT INTO amenities (slug, glamping_property_column, name, cost_per_unit, applies_to, scope, glamping_fields)
       VALUES (NULL, $1, $2, $4, 'both', $3, '[]'::jsonb)
       ON CONFLICT (glamping_property_column) DO UPDATE SET
         name = EXCLUDED.name,
         scope = EXCLUDED.scope,
         cost_per_unit = CASE
           WHEN amenities.cost_per_unit = 0 THEN EXCLUDED.cost_per_unit
           ELSE amenities.cost_per_unit
         END`,
      [f.column, f.label, f.scope, cost]
    );
  }
}
