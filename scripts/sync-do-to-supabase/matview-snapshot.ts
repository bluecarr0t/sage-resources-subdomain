/**
 * Snapshot DigitalOcean materialized views into Supabase as regular tables.
 * Required for Phase 3 flat transform (site_monthly_analytics, latest_sites)
 * and condensed yearly analytics for calculations.
 */

import type { PoolClient } from 'pg';
import { queryDigitalOceanReadOnly } from '../../lib/digitalocean-readonly-db';
import { syncTableFromDigitalOcean } from './sync-table';
import {
  CAMPINGS_MATVIEW_SNAPSHOTS,
  type MatviewSnapshotSpec,
} from './matview-config';

export type { MatviewSnapshotSpec };
export { CAMPINGS_MATVIEW_SNAPSHOTS };
export interface SyncMatviewsOptions {
  supabaseClient: PoolClient;
  dryRun?: boolean;
  only?: Set<string>;
}

export async function syncCampingsMatviewSnapshots(
  options: SyncMatviewsOptions
): Promise<{ name: string; exported: number; upserted: number }[]> {
  const results: { name: string; exported: number; upserted: number }[] = [];

  for (const spec of CAMPINGS_MATVIEW_SNAPSHOTS) {
    const key = `${spec.schema}.${spec.name}`;
    if (options.only && !options.only.has(key) && !options.only.has(spec.name)) {
      continue;
    }

    console.log(`\nMatview snapshot: ${key} (full replace from DO)`);

    if (options.dryRun) {
      const { rows } = await queryDigitalOceanReadOnly<{ count: string }>(
        'campings',
        `SELECT count(*)::text AS count FROM ${spec.schema}.${spec.name}`
      );
      const count = parseInt(rows[0]?.count ?? '0', 10);
      console.log(`  [dry-run] ${key}: would snapshot ~${count.toLocaleString()} rows`);
      results.push({ name: key, exported: count, upserted: 0 });
      continue;
    }

    const result = await syncTableFromDigitalOcean({
      database: 'campings',
      sourceSchema: spec.schema,
      targetSchema: spec.schema,
      table: spec.name,
      supabaseClient: options.supabaseClient,
      mode: 'full_replace',
      dryRun: options.dryRun,
      // DO matviews have no PK — without this, keyset pagination sorts by the
      // first column only and silently skips most rows.
      paginationKey: spec.uniqueKey,
    });

    results.push({
      name: result.table,
      exported: result.exported,
      upserted: result.upserted,
    });
  }

  return results;
}
