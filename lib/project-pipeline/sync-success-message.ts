export type ProjectPipelineSyncSuccessCounts = {
  syncAll?: boolean;
  jobsAdded?: number;
  totalJobsAdded?: number;
};

export function resolveProjectPipelineSyncJobsAdded(
  response: ProjectPipelineSyncSuccessCounts
): number {
  return response.syncAll ? response.totalJobsAdded ?? 0 : response.jobsAdded ?? 0;
}
