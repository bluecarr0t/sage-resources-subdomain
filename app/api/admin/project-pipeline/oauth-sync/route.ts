import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { createServerClient } from '@/lib/supabase';
import { getProjectPipelineAuthMode } from '@/lib/project-pipeline/auth';
import {
  syncAllProjectPipelineSheetsToSupabase,
  syncProjectPipelineSheetToSupabase,
} from '@/lib/project-pipeline/sync-to-supabase';
import { resolveProjectPipelineSheetTab } from '@/lib/project-pipeline/sheet-tabs';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export const POST = withAdminAuth(async (request: NextRequest) => {
  if (getProjectPipelineAuthMode() !== 'oauth') {
    return NextResponse.json(
      {
        error: 'OAuth sync unavailable',
        message: 'OAuth backfill is only used when service account credentials are not configured.',
      },
      { status: 400 }
    );
  }

  let body: { accessToken?: unknown; syncAll?: unknown; sheetName?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const accessToken =
    typeof body.accessToken === 'string' && body.accessToken.trim()
      ? body.accessToken.trim()
      : undefined;

  if (!accessToken) {
    return NextResponse.json(
      { error: 'Missing accessToken', message: 'Google Sheets OAuth access token is required.' },
      { status: 400 }
    );
  }

  const supabase = createServerClient();
  const started = Date.now();

  try {
    if (body.syncAll === true) {
      const result = await syncAllProjectPipelineSheetsToSupabase(supabase, { accessToken });
      return NextResponse.json({
        ok: true,
        syncAll: true,
        ...result,
        elapsedMs: Date.now() - started,
      });
    }

    const sheetName = resolveProjectPipelineSheetTab(
      typeof body.sheetName === 'string' ? body.sheetName : undefined
    );
    const result = await syncProjectPipelineSheetToSupabase(supabase, sheetName, { accessToken });

    return NextResponse.json({
      ok: true,
      syncAll: false,
      ...result,
      elapsedMs: Date.now() - started,
    });
  } catch (error) {
    console.error('[project-pipeline/oauth-sync] failed', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'OAuth sync failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        elapsedMs: Date.now() - started,
      },
      { status: 500 }
    );
  }
});
