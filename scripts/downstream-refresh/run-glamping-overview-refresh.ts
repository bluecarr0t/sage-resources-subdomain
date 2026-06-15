#!/usr/bin/env npx tsx
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const { refreshGlampingOverviewCache } = await import('./refresh-glamping-overview');
  const result = await refreshGlampingOverviewCache();
  console.log(
    JSON.stringify(
      {
        ok: !result.mapError,
        rowsScanned: result.rowsScanned,
        durationMs: result.durationMs,
        nextCacheInvalidated: result.nextCacheInvalidated,
        nextCacheInvalidateSkipped: result.nextCacheInvalidateSkipped,
        nextCacheInvalidateError: result.nextCacheInvalidateError,
        mapError: result.mapError,
      },
      null,
      2
    )
  );
  if (result.mapError) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
