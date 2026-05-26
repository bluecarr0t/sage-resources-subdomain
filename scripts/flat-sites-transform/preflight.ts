import type { PoolClient } from 'pg';

export type FlatOta = 'campspot' | 'hipcamp';

/** Base tables from sync:do — must be populated before transform. */
const REQUIRED_BASE_TABLES: Record<FlatOta, string[]> = {
  campspot: ['campspot.propertydetails', 'campspot.sites', 'campspot.sitedetails'],
  hipcamp: ['hipcamp.propertydetails', 'hipcamp.sites', 'hipcamp.sitedetails'],
};

/** Snapshotted from DO matviews at transform time (unless --skip-matviews). */
const MATVIEW_SNAPSHOT_TABLES: Record<FlatOta, string[]> = {
  campspot: ['campspot.latest_sites', 'campspot.site_monthly_analytics'],
  hipcamp: ['hipcamp.latest_sites', 'hipcamp.site_monthly_analytics'],
};

export interface PreflightResult {
  ok: boolean;
  missing: string[];
  counts: Record<string, number>;
}

export async function runFlatTransformPreflight(
  client: PoolClient,
  otas: FlatOta[],
  options?: { requireMatviewSnapshots?: boolean }
): Promise<PreflightResult> {
  const missing: string[] = [];
  const counts: Record<string, number> = {};
  const requireMatviews = options?.requireMatviewSnapshots ?? false;

  for (const ota of otas) {
    const tables = [
      ...REQUIRED_BASE_TABLES[ota],
      ...(requireMatviews ? MATVIEW_SNAPSHOT_TABLES[ota] : []),
    ];
    for (const qualified of tables) {
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
        missing.push(`${qualified} (empty — run npm run sync:do:full first)`);
      }
    }
  }

  return { ok: missing.length === 0, missing, counts };
}
