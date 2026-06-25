import type { SupabaseClient } from '@supabase/supabase-js';
import {
  countAllProjectPipelineJobsInSupabase,
  countProjectPipelineJobsInSupabase,
  fetchProjectPipelineLastSuccessfulSyncRun,
  fetchProjectPipelineLastSuccessfulSyncRunAnyTab,
  isAnyProjectPipelineMirrorIncomplete,
  isProjectPipelineMirrorIncompleteForSheet,
} from '@/lib/project-pipeline/fetch-from-supabase';
import { isProjectPipelineAllSheetsTab } from '@/lib/project-pipeline/sheet-tabs';

export type ProjectPipelineMirrorStatus = {
  mirroredCount: number;
  lastSyncedAt: string | null;
  mirrorIncomplete: boolean;
};

export async function getProjectPipelineMirrorStatus(
  supabase: SupabaseClient,
  input: { sheetId: string; sheetName: string }
): Promise<ProjectPipelineMirrorStatus> {
  const allYearsView = isProjectPipelineAllSheetsTab(input.sheetName);

  const mirroredCount = allYearsView
    ? await countAllProjectPipelineJobsInSupabase(supabase, { sheetId: input.sheetId })
    : await countProjectPipelineJobsInSupabase(supabase, {
        sheetId: input.sheetId,
        sheetName: input.sheetName,
      });

  const lastSyncRun = allYearsView
    ? await fetchProjectPipelineLastSuccessfulSyncRunAnyTab(supabase, { sheetId: input.sheetId })
    : await fetchProjectPipelineLastSuccessfulSyncRun(supabase, {
        sheetId: input.sheetId,
        sheetName: input.sheetName,
      });

  const mirrorIncomplete = allYearsView
    ? await isAnyProjectPipelineMirrorIncomplete(supabase, { sheetId: input.sheetId })
    : await isProjectPipelineMirrorIncompleteForSheet(supabase, {
        sheetId: input.sheetId,
        sheetName: input.sheetName,
      });

  return {
    mirroredCount,
    lastSyncedAt: lastSyncRun?.completed_at ?? null,
    mirrorIncomplete,
  };
}
