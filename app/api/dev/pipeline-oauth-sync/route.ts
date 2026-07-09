import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  syncAllProjectPipelineSheetsToSupabase,
  syncProjectPipelineSheetToSupabase,
} from '@/lib/project-pipeline/sync-to-supabase';
import { resolveProjectPipelineSheetTab } from '@/lib/project-pipeline/sheet-tabs';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function assertDevelopmentOnly(): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Dev-only pipeline OAuth sync is disabled in production');
  }
}

export async function POST(request: NextRequest) {
  try {
    assertDevelopmentOnly();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Forbidden' },
      { status: 403 }
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
    return NextResponse.json({ error: 'Missing accessToken' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const started = Date.now();

  try {
    if (body.syncAll === true) {
      const result = await syncAllProjectPipelineSheetsToSupabase(supabase, { accessToken });
      return NextResponse.json({ ok: true, syncAll: true, ...result, elapsedMs: Date.now() - started });
    }

    const sheetName = resolveProjectPipelineSheetTab(
      typeof body.sheetName === 'string' ? body.sheetName : '2026 Jobs'
    );
    const result = await syncProjectPipelineSheetToSupabase(supabase, sheetName, { accessToken });
    return NextResponse.json({
      ok: true,
      syncAll: false,
      ...result,
      elapsedMs: Date.now() - started,
    });
  } catch (error) {
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
}
