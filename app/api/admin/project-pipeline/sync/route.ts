import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { createServerClient } from '@/lib/supabase';
import { getManagedUser } from '@/lib/auth-helpers';
import { canViewAllPipelineJobs } from '@/lib/managed-users-pipeline';
import { isManagedUserAdmin } from '@/lib/project-pipeline/job-edit-permissions';
import {
  assertProjectPipelineCronSyncConfigured,
  syncAllProjectPipelineSheetsToSupabase,
  syncProjectPipelineSheetToSupabase,
} from '@/lib/project-pipeline/sync-to-supabase';
import { resolveProjectPipelineSheetTab } from '@/lib/project-pipeline/sheet-tabs';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export const POST = withAdminAuth(async (request: NextRequest, auth) => {
  const managedUser = await getManagedUser(auth.session.user.id);
  const canSync =
    isManagedUserAdmin(managedUser) || canViewAllPipelineJobs(managedUser);

  if (!canSync) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'You do not have permission to sync the project pipeline' },
      { status: 403 }
    );
  }

  let body: { sheetName?: unknown; syncAll?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  try {
    assertProjectPipelineCronSyncConfigured();
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Project pipeline sync requires Google service account credentials on the server';
    return NextResponse.json({ error: 'Sync not configured', message }, { status: 503 });
  }

  const supabase = createServerClient();
  const started = Date.now();

  try {
    if (body.syncAll === true) {
      const result = await syncAllProjectPipelineSheetsToSupabase(supabase);
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
    const result = await syncProjectPipelineSheetToSupabase(supabase, sheetName);

    return NextResponse.json({
      ok: true,
      syncAll: false,
      ...result,
      elapsedMs: Date.now() - started,
    });
  } catch (error) {
    console.error('[project-pipeline/sync] manual sync failed', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'Sync failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        elapsedMs: Date.now() - started,
      },
      { status: 500 }
    );
  }
});
