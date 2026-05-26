#!/usr/bin/env npx tsx
/**
 * Blocks the legacy CSV export/import migration path unless explicitly overridden.
 *
 * Ongoing sync: npm run sync:do (SQL read-only on DO → upsert on Supabase).
 * Escape hatch: ALLOW_LEGACY_CSV_MIGRATION=1 npm run migrate:legacy:csv-export
 */

import { spawnSync } from 'child_process';
import { resolve } from 'path';

const REPLACEMENT = `
The CSV migration path (export-data.ts → import-data.ts) is deprecated for ongoing sync.

Use instead (read-only on DigitalOcean, writes only to Supabase):

  npm run sync:do              # weekly incremental (campings DB)
  npm run sync:do:full         # one-time / full backfill
  npm run sync:do -- --replace-snapshots   # monthly old_data_table

Docs: scripts/sync-do-to-supabase/README.md

To run the old CSV flow anyway (not recommended):

  ALLOW_LEGACY_CSV_MIGRATION=1 npm run migrate:legacy:csv-export
  ALLOW_LEGACY_CSV_MIGRATION=1 npm run migrate:legacy:csv-import
  ALLOW_LEGACY_CSV_MIGRATION=1 npm run migrate:legacy:csv
`;

const target = process.argv[2];

function runLegacy(command: string, args: string[]): number {
  const scriptDir = resolve(process.cwd(), 'scripts/migrate-legacy-to-supabase');
  const script = resolve(scriptDir, command);
  const result = spawnSync('npx', ['tsx', script, ...args], {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: process.env,
  });
  return result.status ?? 1;
}

function main(): void {
  if (process.env.ALLOW_LEGACY_CSV_MIGRATION === '1') {
    switch (target) {
      case 'export':
        process.exit(runLegacy('export-data.ts', ['--exclude-large', ...process.argv.slice(3)]));
      case 'import':
        process.exit(runLegacy('import-data.ts', process.argv.slice(3)));
      case 'full':
        process.exit(runLegacy('run-migration.ts', process.argv.slice(3)));
      default:
        console.error('Unknown legacy target:', target);
        process.exit(1);
    }
  }

  console.error(REPLACEMENT.trim());
  console.error(`\n(Blocked command: migrate:legacy${target === 'export' ? '-export' : target === 'import' ? '-import' : ''})\n`);
  process.exit(1);
}

main();
