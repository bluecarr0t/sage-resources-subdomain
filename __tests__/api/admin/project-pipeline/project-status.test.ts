/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { UI_CREATED_PROJECT_PIPELINE_SHEET_ROW_INDEX } from '@/lib/project-pipeline/create-job';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

jest.mock('@/lib/require-admin-auth', () => ({
  withAdminAuth:
    (handler: (req: NextRequest, auth: unknown) => Promise<Response>) =>
    async (req: NextRequest) =>
      handler(req, {
        session: { user: { id: 'admin-1', email: 'heilala@sageoutdooradvisory.com' } },
      }),
}));

jest.mock('@/lib/auth-helpers', () => ({
  getManagedUser: jest.fn().mockResolvedValue({
    display_name: 'Shari Heilala',
    role: 'admin',
    pipeline_view_all: true,
  }),
}));

jest.mock('@/lib/managed-users-pipeline', () => ({
  canViewAllPipelineJobs: jest.fn().mockReturnValue(true),
}));

jest.mock('@/lib/project-pipeline/fetch-jobs', () => ({
  getProjectPipelineSheetId: jest.fn().mockReturnValue('sheet-1'),
}));

const mockUpdateStatus = jest.fn();
const mockFetchJobByNumber = jest.fn();

jest.mock('@/lib/project-pipeline/fetch-from-supabase', () => ({
  fetchProjectPipelineJobByJobNumber: (...args: unknown[]) => mockFetchJobByNumber(...args),
  updateProjectPipelineJobProjectStatus: (...args: unknown[]) => mockUpdateStatus(...args),
}));

jest.mock('@/lib/project-pipeline/resolve-job-for-edit', () => ({
  canEditProjectPipelineJob: jest.fn().mockReturnValue(true),
}));

jest.mock('@/lib/project-pipeline/notifications/load-managed-users', () => ({
  loadActiveManagedUsersForPipeline: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/lib/supabase', () => ({
  createServerClient: jest.fn(() => ({ from: jest.fn() })),
}));

function uiCreatedJob(): ProjectPipelineJob {
  return {
    jobNumber: '26-TEST-06',
    client: 'Manual Client',
    propertyLocation: 'Austin, TX',
    appraiserConsultant: 'Greg',
    projMgr: 'Shari',
    contractStart: '',
    dueDate: '',
    dateCompleted: '',
    commercialOutdoor: 'Outdoor',
    propertyType: '',
    service: '',
    reviewStatus: '',
    sentToClient: 'No',
    authorSlackUsername: '',
    clientEmail: '',
    projectStatus: 'In-Progress',
    uiSourceOfTruth: true,
    sheetRowIndex: UI_CREATED_PROJECT_PIPELINE_SHEET_ROW_INDEX,
    pipelineSheetName: '2026 Jobs',
  };
}

describe('PATCH /api/admin/project-pipeline/jobs/project-status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchJobByNumber.mockResolvedValue(uiCreatedJob());
    mockUpdateStatus.mockImplementation(async (_supabase, job: ProjectPipelineJob) => job);
  });

  it('accepts UI-created jobs with sheetRowIndex 0', async () => {
    const { PATCH } = await import('@/app/api/admin/project-pipeline/jobs/project-status/route');
    const job = uiCreatedJob();

    const req = new NextRequest('http://localhost/api/admin/project-pipeline/jobs/project-status', {
      method: 'PATCH',
      body: JSON.stringify({ job, projectStatus: 'In-Progress' }),
    });

    const res = await PATCH(req);
    expect(res.status).toBe(200);
    expect(mockUpdateStatus).toHaveBeenCalled();
  });
});
