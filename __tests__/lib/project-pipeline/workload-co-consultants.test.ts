import {
  getWorkloadCoConsultantLabels,
  workloadConsultantBucketNames,
  workloadJobHasMultipleConsultants,
} from '@/lib/project-pipeline/workload-co-consultants';

describe('workload-co-consultants', () => {
  it('splits combined appraiser cells into bucket names', () => {
    expect(workloadConsultantBucketNames('Greg/Shari')).toEqual(['Greg', 'Shari']);
    expect(workloadConsultantBucketNames('Lars / Luke')).toEqual(['Lars', 'Luke']);
  });

  it('returns co-consultant labels for the other authors on a shared job', () => {
    const job = {
      appraiserConsultant: 'Greg/Shari',
    } as const;

    expect(getWorkloadCoConsultantLabels(job, 'Greg Garwood')).toEqual(['Shari']);
    expect(getWorkloadCoConsultantLabels(job, 'Shari')).toEqual(['Greg']);
    expect(workloadJobHasMultipleConsultants(job)).toBe(true);
  });
});
