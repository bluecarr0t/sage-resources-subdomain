export type ProjectPipelineSyncSuccessCounts = {
  syncAll?: boolean;
  jobsUpserted?: number;
  jobsAdded?: number;
  totalJobsUpserted?: number;
  totalJobsAdded?: number;
};

export function resolveProjectPipelineSyncSuccessCounts(
  response: ProjectPipelineSyncSuccessCounts
): { total: number; added: number } {
  const total = response.syncAll
    ? response.totalJobsUpserted ?? 0
    : response.jobsUpserted ?? 0;
  const added = response.syncAll ? response.totalJobsAdded ?? 0 : response.jobsAdded ?? 0;
  return { total, added };
}
