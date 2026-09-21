import { buildClientPortalWorkspace } from '@/lib/client-portal/sanitize';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';
import type { ClientPortalRequest } from '@/lib/client-portal/types';

function job(overrides: Partial<ProjectPipelineJob> = {}): ProjectPipelineJob {
  return {
    jobNumber: '26-100A-01',
    client: 'Test Client',
    propertyLocation: 'Hopewell, NY',
    appraiserConsultant: 'Luke Marran',
    projMgr: 'Shari',
    contractStart: '1/21/26',
    dueDate: '4/1/26',
    dateCompleted: '',
    commercialOutdoor: 'Outdoor',
    propertyType: 'Glamping',
    service: 'Feasibility Study',
    reviewStatus: '',
    sentToClient: '',
    authorSlackUsername: 'luke',
    clientEmail: 'client@example.com',
    projectStatus: 'In-Progress',
    sheetRowIndex: 2,
    ...overrides,
  };
}

function request(
  overrides: Partial<ClientPortalRequest> = {}
): ClientPortalRequest {
  return {
    id: 'req-1',
    engagementId: 'eng-1',
    title: 'Site plan',
    body: 'Please upload the latest site plan.',
    status: 'open',
    createdByEmail: 'author@sageoutdooradvisory.com',
    createdByDisplayName: 'Author',
    createdAt: '2026-01-01T00:00:00.000Z',
    clientResponse: '',
    submittedAt: null,
    clearedAt: null,
    clearedByEmail: null,
    ...overrides,
  };
}

describe('buildClientPortalWorkspace', () => {
  it('strips internal fields and maps stage, blocking on open requests', () => {
    const workspace = buildClientPortalWorkspace({
      job: job(),
      engagement: null,
      updates: [],
      requests: [request()],
      files: [],
    });

    expect(workspace.job).toEqual(
      expect.objectContaining({
        jobNumber: '26-100A-01',
        client: 'Test Client',
        stage: 'In progress',
        blocked: true,
      })
    );
    expect(workspace.job).not.toHaveProperty('authorSlackUsername');
    expect(workspace.job).not.toHaveProperty('flag');
    expect(workspace.job).not.toHaveProperty('reviewNotes');
    expect(workspace.openRequestCount).toBe(1);
  });
});
