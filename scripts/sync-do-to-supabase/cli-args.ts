/**
 * CLI arg parsing for DO → Supabase sync (testable without running the sync).
 */

export interface SyncCliOptions {
  /** Always set — defaults to campings when --databases is omitted. */
  databases: Set<string>;
  tables: Set<string> | null;
  includeLarge: boolean;
  dryRun: boolean;
  full: boolean;
  replaceSnapshots: boolean;
  continueOnError: boolean;
  schemaOnly: boolean;
}

/**
 * Condensed default: skip sites/propertys unless explicitly requested.
 * Set SYNC_INCLUDE_LARGE_DEFAULT=1 only for emergency/full history pulls.
 * --no-large always wins over env / --include-large.
 */
export function parseSyncCliArgs(
  argv: string[] = process.argv.slice(2),
  env: NodeJS.ProcessEnv = process.env
): SyncCliOptions {
  const dbArg = argv.find((a) => a.startsWith('--databases='));
  const tablesArg = argv.find((a) => a.startsWith('--tables='));

  const databases = dbArg
    ? new Set(dbArg.slice(12).split(',').map((s) => s.trim()))
    : new Set(['campings']);

  const wantLarge =
    argv.includes('--include-large') || env.SYNC_INCLUDE_LARGE_DEFAULT === '1';
  const includeLarge = wantLarge && !argv.includes('--no-large');

  return {
    databases,
    tables: tablesArg ? new Set(tablesArg.slice(9).split(',').map((s) => s.trim())) : null,
    includeLarge,
    dryRun: argv.includes('--dry-run'),
    full: argv.includes('--full'),
    replaceSnapshots: argv.includes('--replace-snapshots'),
    continueOnError: argv.includes('--continue-on-error'),
    schemaOnly: argv.includes('--schema-only'),
  };
}
