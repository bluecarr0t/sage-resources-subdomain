import type { SupabaseClient } from '@supabase/supabase-js';
import { filterJobsForUser } from '@/lib/project-pipeline/filter-jobs';
import { fetchProjectPipelineJobsWithFallback } from '@/lib/project-pipeline/fetch-with-fallback';
import { dedupeProjectPipelineJobs } from '@/lib/project-pipeline/resolve-job-for-edit';
import { filterProjectPipelineJobReviewNotesForViewer } from '@/lib/project-pipeline/review-workflow';
import type {
  ProjectPipelineFieldColumnMap,
  ProjectPipelineJob,
} from '@/lib/project-pipeline/types';

export type LoadVisibleProjectPipelineJobsInput = {
  supabase: SupabaseClient;
  sheetName: string;
  email: string | null | undefined;
  displayName: string | null | undefined;
  pipelineViewAll: boolean;
  viewerIsAdmin: boolean;
  accessToken?: string;
  allowOAuthSheets?: boolean;
  includeFieldColumnMap?: boolean;
};

export type LoadVisibleProjectPipelineJobsResult = {
  jobs: ProjectPipelineJob[];
  fieldColumnMap: ProjectPipelineFieldColumnMap;
  dataSource: 'supabase' | 'sheets';
};

export async function loadVisibleProjectPipelineJobs(
  input: LoadVisibleProjectPipelineJobsInput
): Promise<LoadVisibleProjectPipelineJobsResult> {
  const allowOAuthSheets =
    input.allowOAuthSheets ?? Boolean(input.accessToken?.trim());

  const pipeline = await fetchProjectPipelineJobsWithFallback({
    supabase: input.supabase,
    sheetName: input.sheetName,
    mirrorPreferred: true,
    allowOAuthSheets,
    accessToken: allowOAuthSheets ? input.accessToken : undefined,
    includeFieldColumnMap: input.includeFieldColumnMap,
  });

  const jobs = filterJobsForUser(
    dedupeProjectPipelineJobs(pipeline.jobs, input.sheetName),
    {
      email: input.email,
      displayName: input.displayName,
      pipelineViewAll: input.pipelineViewAll,
    }
  ).map((job) =>
    filterProjectPipelineJobReviewNotesForViewer(job, {
      displayName: input.displayName,
      isAdmin: input.viewerIsAdmin,
    })
  );

  return {
    jobs,
    fieldColumnMap: pipeline.fieldColumnMap,
    dataSource: pipeline.dataSource,
  };
}
