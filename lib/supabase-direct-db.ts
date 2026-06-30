/**
 * Direct Postgres connection to Supabase for bulk sync/import scripts.
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

let pool: Pool | null = null;

export function getSupabaseDirectPool(): Pool {
  if (pool) return pool;
  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    throw new Error('SUPABASE_DB_URL is required. Add it to .env.local');
  }
  pool = new Pool({
    connectionString: url,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000,
  });
  return pool;
}

export async function querySupabase<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  return getSupabaseDirectPool().query<T>(text, params);
}

/** Run multiple queries on one Supabase connection inside a read-only transaction. */
export async function withSupabaseReadOnlyClient<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getSupabaseDirectPool().connect();
  try {
    await client.query('BEGIN READ ONLY');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function closeSupabaseDirectPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
