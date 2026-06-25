import { mergeSheetJobsWithSupabaseOverrides } from '@/lib/project-pipeline/fetch-from-supabase';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

function sampleSheetJob(overrides: Partial<ProjectPipelineJob> = {}): ProjectPipelineJob {
  return {
    jobNumber: '26-100A-01',
    client: 'Client',
    propertyLocation: 'Austin, TX',
    appraiserConsultant: 'Greg',
    projMgr: 'Shari',
    contractStart: '01/21/2026',
    dueDate: '03/20/2026',
    dateCompleted: '',
    commercialOutdoor: 'Outdoor',
    propertyType: 'Glamping',
    service: 'Feasibility Study',
    reviewStatus: '',
    sentToClient: 'No',
    authorSlackUsername: 'greg',
    clientEmail: 'client@example.com',
    projectStatus: 'Not Started',
    sheetRowIndex: 2,
    ...overrides,
  };
}

describe('mergeSheetJobsWithSupabaseOverrides', () => {
  it('preserves On Hold from legacy flag values in stored status', () => {
    const [merged] = mergeSheetJobsWithSupabaseOverrides(
      [sampleSheetJob({ appraiserConsultant: 'Greg' })],
      new Map([
        [
          '26-100A-01',
          {
            projectStatus: 'On Hold',
            projectStatusManual: true,
            flag: 'None',
            notes: '',
            reviewNotes: [],
          },
        ],
      ]),
      new Map()
    );

    expect(merged.projectStatus).toBe('On Hold');
    expect(merged.projectStatusManual).toBe(true);
  });
});
