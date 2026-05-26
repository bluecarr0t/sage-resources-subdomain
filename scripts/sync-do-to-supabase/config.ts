import type { DigitalOceanDatabase } from '../../lib/digitalocean-readonly-db';

export type SchemaMapping = 'identical' | Record<string, string>;

export interface DatabaseSyncConfig {
  /** PostgreSQL database name on DigitalOcean */
  database: DigitalOceanDatabase;
  /** Human label for logs */
  label: string;
  /**
   * Schemas to sync from this database.
   * - campings DB: hipcamp, campspot, bookoutdoors (identical in Supabase)
   * - legacy hipcamp/campspot DBs: public schema only
   */
  sourceSchemas: string[];
  /**
   * How source schemas map to Supabase.
   * - 'identical': hipcamp → hipcamp, campspot → campspot, etc.
   * - object: e.g. { public: 'hipcamp_public' } for standalone DBs whose tables live in public
   */
  schemaMapping: SchemaMapping;
}

/** @deprecated Use CAMPINGS_LARGE_TABLES + shouldSkipLargeTable from table-sync-config.ts */
export { CAMPINGS_LARGE_TABLES as LARGE_TABLES } from './table-sync-config';

export const DATABASE_SYNC_CONFIGS: DatabaseSyncConfig[] = [
  {
    database: 'campings',
    label: 'campings (Dec 2024–present)',
    sourceSchemas: ['hipcamp', 'campspot', 'bookoutdoors'],
    schemaMapping: 'identical',
  },
  {
    database: 'hipcamp',
    label: 'hipcamp legacy database',
    sourceSchemas: ['public'],
    schemaMapping: { public: 'hipcamp_public' },
  },
  {
    database: 'campspot',
    label: 'campspot legacy database',
    sourceSchemas: ['public'],
    schemaMapping: { public: 'campspot_public' },
  },
];

export function resolveTargetSchema(
  config: DatabaseSyncConfig,
  sourceSchema: string
): string {
  if (config.schemaMapping === 'identical') return sourceSchema;
  const mapped = config.schemaMapping[sourceSchema];
  if (!mapped) {
    throw new Error(`No Supabase schema mapping for ${config.database}.${sourceSchema}`);
  }
  return mapped;
}

export function qualifiedTable(schema: string, table: string): string {
  return `${schema}.${table}`;
}

export function parseDatabaseFilter(raw?: string): Set<DigitalOceanDatabase> | null {
  if (!raw) return null;
  return new Set(
    raw.split(',').map((s) => s.trim()) as DigitalOceanDatabase[]
  );
}
