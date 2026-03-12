/**
 * Legacy camping database connection (Hipcamp/Campspot old data)
 * Direct PostgreSQL connection for local scripts and data migration.
 * Uses env vars - credentials should be in .env.local (never committed).
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

function getPoolConfig() {
  return {
    host: process.env.LEGACY_CAMPING_DB_HOST || '146.190.212.63',
    port: parseInt(process.env.LEGACY_CAMPING_DB_PORT || '5432', 10),
    user: process.env.LEGACY_CAMPING_DB_USER || 'rou',
    password: process.env.LEGACY_CAMPING_DB_PASSWORD,
    database: process.env.LEGACY_CAMPING_DB_NAME || 'campings',
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };
}

let pool: Pool | null = null;

/**
 * Get or create the connection pool.
 * Call getLegacyCampingPool() for queries, or use query() / getClient() helpers.
 */
export function getLegacyCampingPool(): Pool {
  if (!pool) {
    const poolConfig = getPoolConfig();
    if (!poolConfig.password) {
      throw new Error(
        'LEGACY_CAMPING_DB_PASSWORD is required. Add it to .env.local'
      );
    }
    pool = new Pool(poolConfig);
  }
  return pool;
}

/**
 * Execute a parameterized query against the legacy camping database.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const client = getLegacyCampingPool();
  return client.query<T>(text, params);
}

/**
 * Get a client from the pool for transactions or multiple queries.
 * Caller must release the client when done: client.release()
 */
export async function getClient(): Promise<PoolClient> {
  return getLegacyCampingPool().connect();
}

/**
 * Close the pool. Call when shutting down (e.g. script exit).
 */
export async function closeLegacyCampingPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
