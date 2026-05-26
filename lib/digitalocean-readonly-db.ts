/**
 * Read-only PostgreSQL connections to DigitalOcean camping databases.
 * All queries run inside READ ONLY transactions — never writes to DO.
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

const WRITE_PATTERN = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|COPY\s+\S+\s+FROM)\b/i;

export type DigitalOceanDatabase = 'campings' | 'hipcamp' | 'campspot';

function getBaseConfig() {
  return {
    host: process.env.DIGITALOCEAN_DB_HOST || process.env.LEGACY_CAMPING_DB_HOST || '146.190.212.63',
    port: parseInt(process.env.DIGITALOCEAN_DB_PORT || process.env.LEGACY_CAMPING_DB_PORT || '5432', 10),
    user: process.env.DIGITALOCEAN_DB_USER || process.env.LEGACY_CAMPING_DB_USER || 'rou',
    password: process.env.DIGITALOCEAN_DB_PASSWORD || process.env.LEGACY_CAMPING_DB_PASSWORD,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
  };
}

const pools = new Map<DigitalOceanDatabase, Pool>();

function assertReadOnlySql(text: string): void {
  const trimmed = text.trim();
  if (WRITE_PATTERN.test(trimmed)) {
    throw new Error(`Refusing to run write SQL against DigitalOcean: ${trimmed.slice(0, 80)}`);
  }
}

export function getDigitalOceanPool(database: DigitalOceanDatabase): Pool {
  const existing = pools.get(database);
  if (existing) return existing;

  const password = getBaseConfig().password;
  if (!password) {
    throw new Error(
      'DIGITALOCEAN_DB_PASSWORD (or LEGACY_CAMPING_DB_PASSWORD) is required in .env.local'
    );
  }

  const pool = new Pool({ ...getBaseConfig(), database });
  pools.set(database, pool);
  return pool;
}

export async function queryDigitalOceanReadOnly<T extends QueryResultRow = QueryResultRow>(
  database: DigitalOceanDatabase,
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  assertReadOnlySql(text);
  const client = await getDigitalOceanPool(database).connect();
  try {
    await client.query('BEGIN READ ONLY');
    const result = await client.query<T>(text, params);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function withDigitalOceanReadOnlyClient<T>(
  database: DigitalOceanDatabase,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getDigitalOceanPool(database).connect();
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

export async function closeDigitalOceanPools(): Promise<void> {
  await Promise.all([...pools.values()].map((pool) => pool.end()));
  pools.clear();
}
