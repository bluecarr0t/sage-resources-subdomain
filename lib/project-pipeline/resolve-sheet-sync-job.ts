import { withDerivedProjectPipelineProjectStatus } from '@/lib/project-pipeline/derive-project-status';
import type { ProjectPipelineStoredStatus } from '@/lib/project-pipeline/fetch-from-supabase';
import { mergeSheetJobWithUiEditedJob } from '@/lib/project-pipeline/merge-sheet-ui-job';
import { isStickyProjectPipelineProjectStatus } from '@/lib/project-pipeline/project-status';
import type { ProjectPipelineSheetTab } from '@/lib/project-pipeline/sheet-tabs';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

export type ResolveSheetSyncProjectPipelineJobInput = {
  sheetJob: ProjectPipelineJob;
  sheetName: ProjectPipelineSheetTab;
  sheetYear: number | null;
  storedStatusByJobNumber: ReadonlyMap<string, ProjectPipelineStoredStatus>;
  uiEditedByJobNumber: ReadonlyMap<string, ProjectPipelineJob>;
};

/** Build the merged job that will be written to Supabase during a sheet sync. */
export function resolveSheetSyncProjectPipelineJob(
  input: ResolveSheetSyncProjectPipelineJobInput
): ProjectPipelineJob {
  const jobNumber = input.sheetJob.jobNumber.trim();
  const uiEdited = input.uiEditedByJobNumber.get(jobNumber);
  if (uiEdited) {
    return mergeSheetJobWithUiEditedJob(input.sheetJob, uiEdited);
  }

  const stored = input.storedStatusByJobNumber.get(jobNumber);
  const preserveStoredStatus =
    stored &&
    (stored.projectStatusManual || isStickyProjectPipelineProjectStatus(stored.projectStatus));

  if (preserveStoredStatus) {
    return withDerivedProjectPipelineProjectStatus({
      ...input.sheetJob,
      pipelineSheetName: input.sheetName,
      sheetYear: input.sheetYear,
      projectStatus: stored.projectStatus,
      projectStatusManual: stored.projectStatusManual,
      flag: stored.flag,
      notes: stored.notes,
      reviewNotes: stored.reviewNotes,
    });
  }

  const storedFlag = stored?.flag;
  const storedNotes = stored?.notes;
  const storedReviewNotes = stored?.reviewNotes;

  return withDerivedProjectPipelineProjectStatus({
    ...input.sheetJob,
    pipelineSheetName: input.sheetName,
    sheetYear: input.sheetYear,
    ...(storedFlag ? { flag: storedFlag } : {}),
    ...(storedNotes ? { notes: storedNotes } : {}),
    ...(storedReviewNotes?.length ? { reviewNotes: storedReviewNotes } : {}),
  });
}
