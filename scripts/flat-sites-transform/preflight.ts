import type { PoolClient } from 'pg';

export type FlatOta = 'campspot' | 'hipcamp';

/**
 * Condensed Approach A: flat transform reads dimensions + matview snapshots.
 * Base daily `sites` / `propertys` are not required (and should stay truncated).
 */
const REQUIRED_TABLES: Record<FlatOta, string[]> = {
  campspot: [
    'campspot.propertydetails',
    'campspot.sitedetails',
    'campspot.latest_sites',
    'campspot.site_monthly_analytics',
  ],
  hipcamp: [
    'hipcamp.propertydetails',
    'hipcamp.sitedetails',
    'hipcamp.latest_sites',
    'hipcamp.site_monthly_analytics',
  ],
};

export interface PreflightResult {
  ok: boolean;
  missing: string[];
  counts: Record<string, number>;
}

export async function runFlatTransformPreflight(
  client: PoolClient,
  otas: FlatOta[],
  _options?: { requireMatviewSnapshots?: boolean }
): Promise<PreflightResult> {
  const missing: string[] = [];
  const counts: Record<string, number> = {};

  for (const ota of otas) {
    for (const qualified of REQUIRED_TABLES[ota]) {
      const [schema, table] = qualified.split('.');
      const exists = await client.query<{ exists: boolean }>(
        `
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = $1 AND table_name = $2
        ) AS exists
      `,
        [schema, table]
      );

      if (!exists.rows[0]?.exists) {
        missing.push(qualified);
        continue;
      }

      const countRes = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM ${schema}.${table}`
      );
      const count = parseInt(countRes.rows[0]?.count ?? '0', 10);
      counts[qualified] = count;

      if (count === 0) {
        missing.push(`${qualified} (empty — run npm run sync:do:matviews / sync:do -- --no-large)`);
      }
    }
  }

  return { ok: missing.length === 0, missing, counts };
}
