import { getGhlConfig } from '@/lib/ghl/client';
import { moveOpportunityToReportSentToClient } from '@/lib/ghl/opportunities';
import { isProjectPipelineSentToClientYes } from '@/lib/project-pipeline/sent-to-client';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

export type SyncGhlSentToClientInput = {
  previous: Pick<ProjectPipelineJob, 'sentToClient' | 'jobNumber'> | null | undefined;
  next: Pick<ProjectPipelineJob, 'sentToClient' | 'jobNumber'>;
};

/** True when Sent to Client flips from not-Yes to Yes (independent of project status). */
export function didSentToClientFlipToYes(
  previous: Pick<ProjectPipelineJob, 'sentToClient'> | null | undefined,
  next: Pick<ProjectPipelineJob, 'sentToClient'>
): boolean {
  const wasYes = isProjectPipelineSentToClientYes(previous?.sentToClient);
  const isYes = isProjectPipelineSentToClientYes(next.sentToClient);
  return !wasYes && isYes;
}

export async function syncGhlOpportunityOnSentToClient(
  input: SyncGhlSentToClientInput
): Promise<void> {
  if (!didSentToClientFlipToYes(input.previous, input.next)) {
    return;
  }

  const jobNumber = input.next.jobNumber.trim();
  if (!jobNumber) {
    console.warn('[ghl] Sent to Client flipped to Yes but job number is empty — skip sync');
    return;
  }

  const config = getGhlConfig();
  if (!config) {
    return;
  }

  const result = await moveOpportunityToReportSentToClient(config, jobNumber);

  switch (result.status) {
    case 'updated':
      console.info(
        `[ghl] Moved opportunity ${result.opportunityId} to Report Sent to Client for job ${jobNumber}`
      );
      break;
    case 'already_on_stage':
      console.info(
        `[ghl] Opportunity ${result.opportunityId} already on Report Sent to Client for job ${jobNumber}`
      );
      break;
    case 'not_found':
      console.warn(
        `[ghl] No opportunity with job_number=${jobNumber} in configured pipeline — skip stage update`
      );
      break;
    case 'ambiguous':
      console.error(
        `[ghl] Multiple opportunities match job_number=${jobNumber} (${result.opportunityIds.join(', ')}) — skip stage update`
      );
      break;
    case 'stage_missing':
      console.error(
        `[ghl] Pipeline ${config.pipelineId} has no stage named "Report Sent to Client" — skip stage update`
      );
      break;
    default: {
      const _exhaustive: never = result;
      return _exhaustive;
    }
  }
}

/** Fire-and-forget: never throws to the jobs PUT caller. */
export function syncGhlOpportunityOnSentToClientAsync(input: SyncGhlSentToClientInput): void {
  void syncGhlOpportunityOnSentToClient(input).catch((err) => {
    console.error('[ghl] Sent to Client opportunity sync failed:', err);
  });
}
