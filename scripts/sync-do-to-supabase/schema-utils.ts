import type { PoolClient } from 'pg';
import { queryDigitalOceanReadOnly } from '../../lib/digitalocean-readonly-db';
import type { DigitalOceanDatabase } from '../../lib/digitalocean-readonly-db';
import type { ColumnMeta, TableMeta } from './upsert-sql';

export type { ColumnMeta, TableMeta } from './upsert-sql';
export { buildUpsertSql } from './upsert-sql';

function mapType(udtName: string, dataType: string): string {
  if (udtName === 'geometry') return 'geometry(Point, 4326)';
  if (udtName === 'int4') return 'INTEGER';
  if (udtName === 'int8') return 'BIGINT';
  if (udtName === 'float4') return 'REAL';
  if (udtName === 'float8') return 'DOUBLE PRECISION';
  if (udtName === 'numeric') return 'NUMERIC';
  if (udtName === 'bool') return 'BOOLEAN';
  if (udtName === 'timestamp') return 'TIMESTAMP WITH TIME ZONE';
  if (udtName === 'timestamptz') return 'TIMESTAMP WITH TIME ZONE';
  if (udtName === 'uuid') return 'UUID';
  if (udtName === 'varchar' || udtName === 'character varying') return 'VARCHAR';
  if (udtName === 'json' || udtName === 'jsonb') return udtName.toUpperCase();
  if (udtName === 'text') return 'TEXT';
  if (udtName === 'date') return 'DATE';
  if (udtName === '_text') return 'TEXT[]';
  if (udtName === '_int4') return 'INTEGER[]';
  return dataType.toUpperCase();
}

async function fetchColumnsFromPgCatalog(
  database: DigitalOceanDatabase,
  schema: string,
  relation: string
): Promise<ColumnMeta[]> {
  const { rows } = await queryDigitalOceanReadOnly<ColumnMeta>(
    database,
    `
    SELECT
      a.attname AS column_name,
      format_type(a.atttypid, a.atttypmod) AS data_type,
      t.typname AS udt_name,
      CASE WHEN a.attnotnull THEN 'NO' ELSE 'YES' END AS is_nullable,
      pg_get_expr(d.adbin, d.adrelid) AS column_default,
      a.attnum AS ordinal_position
    FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    JOIN pg_type t ON a.atttypid = t.oid
    LEFT JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
    WHERE n.nspname = $1
      AND c.relname = $2
      AND c.relkind IN ('r', 'v', 'm', 'f')
      AND a.attnum > 0
      AND NOT a.attisdropped
    ORDER BY a.attnum
  `,
    [schema, relation]
  );
  return rows;
}

export async function fetchTableMetaFromDigitalOcean(
  database: DigitalOceanDatabase,
  schema: string,
  table: string
): Promise<TableMeta> {
  let { rows: columns } = await queryDigitalOceanReadOnly<ColumnMeta>(
    database,
    `
    SELECT column_name, data_type, udt_name, is_nullable, column_default, ordinal_position
    FROM information_schema.columns
    WHERE table_schema = $1 AND table_name = $2
    ORDER BY ordinal_position
  `,
    [schema, table]
  );

  if (columns.length === 0) {
    columns = await fetchColumnsFromPgCatalog(database, schema, table);
  }

  const { rows: pks } = await queryDigitalOceanReadOnly<{ column_name: string }>(
    database,
    `
    SELECT a.attname AS column_name
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    JOIN unnest(c.conkey) WITH ORDINALITY AS ck(attnum, ord) ON true
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ck.attnum
    WHERE n.nspname = $1 AND t.relname = $2 AND c.contype = 'p'
    ORDER BY ck.ord
  `,
    [schema, table]
  );

  const geometryColumns = columns.filter((c) => c.udt_name === 'geometry').map((c) => c.column_name);

  return {
    schema,
    table,
    columns,
    primaryKey: pks.map((p) => p.column_name),
    geometryColumns,
  };
}

export function buildCreateTableDdl(targetSchema: string, meta: TableMeta): string {
  const colDefs = meta.columns.map((c) => {
    const typ = mapType(c.udt_name, c.data_type);
    const nullStr = c.is_nullable === 'YES' ? '' : ' NOT NULL';
    let def = '';
    if (c.column_default && !c.column_default.includes('nextval')) {
      def = ` DEFAULT ${c.column_default}`;
    } else if (c.column_default?.includes('now()')) {
      def = ' DEFAULT now()';
    }
    return `  ${c.column_name} ${typ}${nullStr}${def}`;
  });

  if (meta.primaryKey.length > 0) {
    colDefs.push(`  PRIMARY KEY (${meta.primaryKey.join(', ')})`);
  }

  return [
    `CREATE SCHEMA IF NOT EXISTS ${targetSchema};`,
  `CREATE TABLE IF NOT EXISTS ${targetSchema}.${meta.table} (`,
    colDefs.join(',\n'),
    ');',
  ].join('\n');
}

export async function listTablesInSchema(
  database: DigitalOceanDatabase,
  schema: string
): Promise<string[]> {
  const { rows } = await queryDigitalOceanReadOnly<{ table_name: string }>(
    database,
    `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = $1 AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `,
    [schema]
  );
  return rows.map((r) => r.table_name);
}

export async function ensureTableInSupabase(
  client: PoolClient,
  targetSchema: string,
  meta: TableMeta
): Promise<void> {
  await client.query(buildCreateTableDdl(targetSchema, meta));
  await ensurePrimaryKeyOnSupabase(client, targetSchema, meta);
}

async function supabaseHasPrimaryKey(
  client: PoolClient,
  targetSchema: string,
  table: string
): Promise<boolean> {
  const { rows } = await client.query<{ exists: boolean }>(
    `
    SELECT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      JOIN pg_namespace n ON t.relnamespace = n.oid
      WHERE n.nspname = $1 AND t.relname = $2 AND c.contype = 'p'
    ) AS exists
  `,
    [targetSchema, table]
  );
  return Boolean(rows[0]?.exists);
}

/**
 * Existing Supabase tables from CSV migration may lack PKs; upsert requires them.
 */
export async function ensurePrimaryKeyOnSupabase(
  client: PoolClient,
  targetSchema: string,
  meta: TableMeta
): Promise<void> {
  if (meta.primaryKey.length === 0) return;

  const fullTable = `${targetSchema}.${meta.table}`;
  if (await supabaseHasPrimaryKey(client, targetSchema, meta.table)) return;

  const pkList = meta.primaryKey.join(', ');

  try {
    await client.query(`ALTER TABLE ${fullTable} ADD PRIMARY KEY (${pkList})`);
    console.log(`  ${fullTable}: added PRIMARY KEY (${pkList}).`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes('unique') && !message.includes('duplicate')) {
      throw err;
    }

    console.warn(`  ${fullTable}: deduplicating before PRIMARY KEY (${pkList})...`);
    await client.query(`
      DELETE FROM ${fullTable} a
      USING ${fullTable} b
      WHERE a.ctid < b.ctid AND (${meta.primaryKey.map((c) => `a.${c} = b.${c}`).join(' AND ')})
    `);
    await client.query(`ALTER TABLE ${fullTable} ADD PRIMARY KEY (${pkList})`);
    console.log(`  ${fullTable}: added PRIMARY KEY after dedupe.`);
  }
}

export function buildSelectList(meta: TableMeta): string {
  return meta.columns
    .map((c) =>
      meta.geometryColumns.includes(c.column_name)
        ? `ST_AsText(${c.column_name})::text AS ${c.column_name}`
        : c.column_name
    )
    .join(', ');
}

export { serializeRowValue } from './row-values';
