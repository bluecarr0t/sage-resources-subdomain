import {
  jobAppraiserConsultantMatchesSearchQuery,
  jobMatchesProjectPipelineSearchQuery,
} from '@/lib/project-pipeline/search-jobs';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

function sampleJob(
  overrides: Partial<ProjectPipelineJob> = {}
): Pick<ProjectPipelineJob, 'jobNumber' | 'client' | 'propertyLocation' | 'appraiserConsultant'> {
  return {
    jobNumber: '26-192A-05',
    client: 'Marcus Hotels',
    propertyLocation: 'Lake Geneva, WI',
    appraiserConsultant: 'Lars / Luke',
    ...overrides,
  };
}

describe('jobAppraiserConsultantMatchesSearchQuery', () => {
  it('matches any parsed consultant name', () => {
    expect(jobAppraiserConsultantMatchesSearchQuery('Lars / Luke', 'luke')).toBe(true);
    expect(jobAppraiserConsultantMatchesSearchQuery('Lars / Luke', 'lars')).toBe(true);
    expect(jobAppraiserConsultantMatchesSearchQuery('Wendy / Shari', 'shari')).toBe(true);
  });

  it('does not match unrelated consultant names', () => {
    expect(jobAppraiserConsultantMatchesSearchQuery('Lars / Luke', 'shari')).toBe(false);
    expect(jobAppraiserConsultantMatchesSearchQuery('Greg', 'shari')).toBe(false);
  });
});

describe('jobMatchesProjectPipelineSearchQuery', () => {
  it('matches client, job number, and location fields', () => {
    expect(jobMatchesProjectPipelineSearchQuery(sampleJob(), '26-192')).toBe(true);
    expect(jobMatchesProjectPipelineSearchQuery(sampleJob(), 'marcus')).toBe(true);
    expect(jobMatchesProjectPipelineSearchQuery(sampleJob(), 'geneva')).toBe(true);
  });

  it('matches consultant names without matching proj mgr-only text', () => {
    expect(
      jobMatchesProjectPipelineSearchQuery(
        sampleJob({ appraiserConsultant: 'Greg' }),
        'shari'
      )
    ).toBe(false);

    expect(
      jobMatchesProjectPipelineSearchQuery(
        sampleJob({ appraiserConsultant: 'Wendy / Shari' }),
        'shari'
      )
    ).toBe(true);
  });
});
