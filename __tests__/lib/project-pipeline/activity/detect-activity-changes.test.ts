import { detectProjectPipelineActivityChanges } from '@/lib/project-pipeline/activity/detect-activity-changes';
import { resolveProjectPipelineActivityVisibleEmails } from '@/lib/project-pipeline/activity/visible-to-emails';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

function sampleJob(overrides: Partial<ProjectPipelineJob> = {}): ProjectPipelineJob {
  return {
    jobNumber: '26-100A-01',
    client: 'Test Client',
    propertyLocation: 'Hopewell Junction, NY',
    appraiserConsultant: 'Luke Marran',
    projMgr: 'Shari',
    contractStart: '01/21/2026',
    dueDate: '3/20/26',
    dateCompleted: '',
    commercialOutdoor: 'Outdoor',
    propertyType: 'Glamping',
    service: 'Feasibility Study',
    reviewStatus: '',
    sentToClient: 'No',
    authorSlackUsername: 'luke',
    clientEmail: 'client@example.com',
    projectStatus: 'In-Progress',
    sheetRowIndex: 2,
    ...overrides,
  };
}

describe('detectProjectPipelineActivityChanges', () => {
  it('detects review status and due date changes', () => {
    const changes = detectProjectPipelineActivityChanges(
      sampleJob({ reviewStatus: '', dueDate: '3/20/26' }),
      sampleJob({ reviewStatus: 'In-Progress', dueDate: '4/1/26' })
    );

    expect(changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'reviewStatus', previousValue: '', newValue: 'In-Progress' }),
        expect.objectContaining({ field: 'dueDate', previousValue: '3/20/26', newValue: '4/1/26' }),
      ])
    );
  });

  it('ignores unchanged fields', () => {
    const job = sampleJob();
    expect(detectProjectPipelineActivityChanges(job, { ...job })).toEqual([]);
  });
});

describe('resolveProjectPipelineActivityVisibleEmails', () => {
  it('includes the actor and assigned consultant and project manager', () => {
    const emails = resolveProjectPipelineActivityVisibleEmails({
      job: sampleJob({ appraiserConsultant: 'Luke', projMgr: 'Shari' }),
      actorEmail: 'heilala@sageoutdooradvisory.com',
      managedUsers: [
        {
          email: 'marran@sageoutdooradvisory.com',
          display_name: 'Luke Marran',
          first_name: 'Luke',
          last_name: 'Marran',
        },
        {
          email: 'heilala@sageoutdooradvisory.com',
          display_name: 'Shari Heilala',
          first_name: 'Shari',
          last_name: 'Heilala',
        },
      ],
    });

    expect(emails).toEqual(
      expect.arrayContaining([
        'heilala@sageoutdooradvisory.com',
        'marran@sageoutdooradvisory.com',
      ])
    );
  });
});
