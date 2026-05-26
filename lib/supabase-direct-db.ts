/**
 * Direct Postgres connection to Supabase for bulk sync/import scripts.
 */

import { Pool, QueryResult, QueryResultRow } from 'pg';

let pool: Pool | null = null;

export function getSupabaseDirectPool(): Pool {
  if (pool) return pool;
  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    throw new Error('SUPABASE_DB_URL is required. Add it to .env.local');
  }
  pool = new Pool({ connectionString: url, max: 5, idleTimeoutMillis: 30000 });
  return pool;
}

export async function querySupabase<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  return getSupabaseDirectPool().query<T>(text, params);
}

export async function closeSupabaseDirectPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
