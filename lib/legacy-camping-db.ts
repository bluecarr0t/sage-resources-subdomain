/**
 * Legacy camping database connection (Hipcamp/Campspot — campings DB on DigitalOcean).
 * Prefer lib/digitalocean-readonly-db.ts for new sync scripts (enforces read-only).
 * Uses env vars — credentials should be in .env.local (never committed).
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import {
  closeDigitalOceanPools,
  getDigitalOceanPool,
  queryDigitalOceanReadOnly,
  withDigitalOceanReadOnlyClient,
} from './digitalocean-readonly-db';

/**
 * Get or create the connection pool for the campings database.
 */
export function getLegacyCampingPool(): Pool {
  return getDigitalOceanPool('campings');
}

/**
 * Execute a read-only query against the campings database on DigitalOcean.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  return queryDigitalOceanReadOnly<T>('campings', text, params);
}

/**
 * Get a client from the pool for transactions or multiple queries.
 * Caller must release the client when done: client.release()
 */
export async function getClient(): Promise<PoolClient> {
  return getLegacyCampingPool().connect();
}

/**
 * Run multiple read-only queries on one campings DB connection (single transaction).
 * Prefer this for multi-step exports to avoid pool contention on serverless.
 */
export async function withReadOnlyCampingClient<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  return withDigitalOceanReadOnlyClient('campings', fn);
}

/**
 * Close the pool. Call when shutting down (e.g. script exit).
 */
export async function closeLegacyCampingPool(): Promise<void> {
  await closeDigitalOceanPools();
}
