import {
  countProjectPipelineReviewTodos,
  isProjectPipelineJobProjMgr,
  isProjectPipelineReviewTodoForUser,
  resolveDefaultProjectPipelineTableStatusFilter,
} from '@/lib/project-pipeline/review-todos';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

function sampleJob(overrides: Partial<ProjectPipelineJob> = {}): ProjectPipelineJob {
  return {
    jobNumber: '26-100A-01',
    client: 'Client',
    propertyLocation: 'Austin, TX',
    appraiserConsultant: 'Luke Marran',
    projMgr: 'Shari',
    contractStart: '',
    dueDate: '',
    dateCompleted: '',
    commercialOutdoor: 'Outdoor',
    propertyType: 'Glamping',
    service: 'Feasibility Study',
    reviewStatus: '',
    sentToClient: 'No',
    authorSlackUsername: '',
    clientEmail: '',
    projectStatus: 'In-Progress',
    sheetRowIndex: 2,
    ...overrides,
  };
}

describe('review-todos', () => {
  it('counts outdoor PM review todos when status is In-Progress', () => {
    const jobs = [
      sampleJob({ jobNumber: '1', reviewStatus: 'In-Progress', projMgr: 'Shari' }),
      sampleJob({ jobNumber: '2', reviewStatus: 'In-Progress', projMgr: 'Greg' }),
      sampleJob({
        jobNumber: '3',
        reviewStatus: 'In-Progress',
        projMgr: 'Shari',
        commercialOutdoor: 'Commercial',
      }),
    ];

    const count = countProjectPipelineReviewTodos(jobs, {
      email: 'heilala@sageoutdooradvisory.com',
      displayName: 'Shari Heilala',
      pipelineViewAll: true,
      managedUser: { role: 'admin', division: 'outdoor' },
    });

    expect(count).toBe(1);
  });

  it('counts author resubmission todos when status is Changes Requested', () => {
    const jobs = [
      sampleJob({ jobNumber: '1', reviewStatus: 'Changes Requested', appraiserConsultant: 'Luke Marran' }),
      sampleJob({ jobNumber: '2', reviewStatus: 'Changes Requested', appraiserConsultant: 'Elizabeth' }),
    ];

    const count = countProjectPipelineReviewTodos(jobs, {
      email: 'marran@sageoutdooradvisory.com',
      displayName: 'Luke Marran',
      pipelineViewAll: false,
      managedUser: { role: 'author', division: 'outdoor' },
    });

    expect(count).toBe(1);
  });

  it('matches proj mgr aliases', () => {
    expect(isProjectPipelineJobProjMgr(sampleJob({ projMgr: 'Shari' }), 'Shari Heilala')).toBe(true);
    expect(isProjectPipelineReviewTodoForUser(
      sampleJob({ reviewStatus: 'In-Progress', projMgr: 'Shari', commercialOutdoor: 'Outdoor' }),
      { displayName: 'Shari Heilala', division: 'outdoor' }
    )).toBe(true);
  });

  it('defaults project status filter to In Review when PM has reviewer todos', () => {
    const jobs = [
      sampleJob({ jobNumber: '1', reviewStatus: 'In-Progress', projMgr: 'Shari' }),
      sampleJob({ jobNumber: '2', reviewStatus: 'Changes Requested', appraiserConsultant: 'Luke Marran' }),
    ];

    expect(
      resolveDefaultProjectPipelineTableStatusFilter(jobs, {
        email: 'heilala@sageoutdooradvisory.com',
        displayName: 'Shari Heilala',
        pipelineViewAll: true,
        managedUser: { role: 'admin', division: 'outdoor' },
      })
    ).toBe('In Review');
  });

  it('keeps In-Progress default when consultant only has resubmission todos', () => {
    const jobs = [
      sampleJob({ jobNumber: '1', reviewStatus: 'Changes Requested', appraiserConsultant: 'Luke Marran' }),
    ];

    expect(
      resolveDefaultProjectPipelineTableStatusFilter(jobs, {
        email: 'marran@sageoutdooradvisory.com',
        displayName: 'Luke Marran',
        pipelineViewAll: false,
        managedUser: { role: 'author', division: 'outdoor' },
      })
    ).toBe('In-Progress');
  });

  it('returns In-Progress when there are no review todos', () => {
    expect(
      resolveDefaultProjectPipelineTableStatusFilter([sampleJob()], {
        email: 'marran@sageoutdooradvisory.com',
        displayName: 'Luke Marran',
        pipelineViewAll: false,
        managedUser: { role: 'author', division: 'outdoor' },
      })
    ).toBe('In-Progress');
  });
});
