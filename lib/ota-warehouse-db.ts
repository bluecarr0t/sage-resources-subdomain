/**
 * OTA warehouse read path for Sage AI exports.
 * Vercel cannot reach DigitalOcean Postgres (Trusted Sources IP allowlist), so production
 * must query the Supabase mirror (synced via `npm run sync:do:matviews`).
 */

import type { PoolClient } from 'pg';
import { withReadOnlyCampingClient } from '@/lib/legacy-camping-db';
import { withSupabaseReadOnlyClient } from '@/lib/supabase-direct-db';

export type OtaWarehouseBackend = 'supabase' | 'digitalocean';

const OTA_MONTHLY_TABLES = ['hipcamp.site_monthly_analytics', 'campspot.site_monthly_analytics'];

export function resolveOtaWarehouseBackend(): OtaWarehouseBackend {
  if (process.env.SUPABASE_DB_URL?.trim()) {
    return 'supabase';
  }
  if (process.env.VERCEL === '1') {
    throw new Error(
      'SUPABASE_DB_URL is required on Vercel for OTA monthly exports. ' +
        'DigitalOcean Postgres is not reachable from Vercel (IP allowlist). ' +
        'Add SUPABASE_DB_URL in Vercel project settings, then run `npm run sync:do:matviews` from a whitelisted machine.',
    );
  }
  return 'digitalocean';
}

async function assertOtaMonthlyTablesExist(client: PoolClient, backend: OtaWarehouseBackend): Promise<void> {
  const { rows } = await client.query<{ name: string; exists: boolean }>(
    `
    SELECT
      t.name,
      to_regclass(t.name) IS NOT NULL AS exists
    FROM unnest($1::text[]) AS t(name)
  `,
    [OTA_MONTHLY_TABLES],
  );

  const missing = rows.filter((r) => !r.exists).map((r) => r.name);
  if (missing.length === 0) return;

  if (backend === 'supabase') {
    throw new Error(
      `OTA monthly analytics tables are missing on Supabase: ${missing.join(', ')}. ` +
        'Run `npm run sync:do:matviews` from a machine that can reach DigitalOcean, then retry.',
    );
  }

  throw new Error(`OTA monthly analytics tables are missing: ${missing.join(', ')}.`);
}

export async function withOtaWarehouseClient<T>(
  fn: (client: PoolClient, backend: OtaWarehouseBackend) => Promise<T>,
): Promise<T> {
  const backend = resolveOtaWarehouseBackend();

  if (backend === 'supabase') {
    return withSupabaseReadOnlyClient(async (client) => {
      await assertOtaMonthlyTablesExist(client, backend);
      return fn(client, backend);
    });
  }

  return withReadOnlyCampingClient(async (client) => {
    await assertOtaMonthlyTablesExist(client, backend);
    return fn(client, backend);
  });
}
