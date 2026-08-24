import { NextResponse } from 'next/server';
import { describeProjectPipelineSyncAll } from './sync-sheets-with-retry';
import type { SyncAllProjectPipelineSheetsResult } from './sync-to-supabase';

export function jsonForProjectPipelineSyncAll(
  result: SyncAllProjectPipelineSheetsResult,
  extra: Record<string, unknown> = {}
): NextResponse {
  const outcome = describeProjectPipelineSyncAll(result);
  return NextResponse.json(
    {
      ok: outcome.ok,
      syncAll: true,
      ...result,
      ...(outcome.message
        ? { error: 'Sync incomplete', message: outcome.message }
        : {}),
      ...extra,
    },
    { status: outcome.status }
  );
}
