/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

const mockNotifyPipelineJobChangesAsync = jest.fn();
const mockUpsert = jest.fn();
const mockLoadManagedUsers = jest.fn();

jest.mock('@/lib/project-pipeline/notifications/notify-pipeline-job-change', () => ({
  notifyPipelineJobChangesAsync: (...args: unknown[]) => mockNotifyPipelineJobChangesAsync(...args),
}));

jest.mock('@/lib/project-pipeline/notifications/load-managed-users', () => ({
  loadActiveManagedUsersForPipeline: (...args: unknown[]) => mockLoadManagedUsers(...args),
}));

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

jest.mock('@/lib/project-pipeline/fetch-with-fallback', () => ({
  fetchProjectPipelineJobsWithFallback: jest.fn().mockResolvedValue({ jobs: [] }),
}));

const mockFetchJobByNumber = jest.fn().mockResolvedValue(null);

jest.mock('@/lib/project-pipeline/fetch-from-supabase', () => ({
  fetchProjectPipelineJobByJobNumber: (...args: unknown[]) => mockFetchJobByNumber(...args),
  upsertProjectPipelineJobMirror: (...args: unknown[]) => mockUpsert(...args),
  deleteProjectPipelineJobMirror: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/project-pipeline/resolve-job-for-edit', () => ({
  canEditProjectPipelineJob: jest.fn().mockReturnValue(true),
}));

jest.mock('@/lib/supabase', () => ({
  createServerClient: jest.fn(() => ({ from: jest.fn() })),
}));

function sampleJob(overrides: Partial<ProjectPipelineJob> = {}): ProjectPipelineJob {
  return {
    jobNumber: '26-100A-01',
    client: 'Test Client',
    propertyLocation: 'Hopewell Junction, NY',
    appraiserConsultant: 'Luke Marran',
    projMgr: 'Shari',
    contractStart: '01/21/2026',
    dueDate: '4/1/26',
    dateCompleted: '',
    commercialOutdoor: 'Outdoor',
    propertyType: 'Glamping',
    service: 'Feasibility Study',
    reviewStatus: 'Changes Requested',
    sentToClient: 'No',
    authorSlackUsername: 'luke',
    clientEmail: 'client@example.com',
    sheetRowIndex: 2,
    pipelineSheetName: '2026 Jobs',
    ...overrides,
  };
}

describe('POST /api/admin/project-pipeline/jobs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpsert.mockImplementation(async (_supabase, job: ProjectPipelineJob) => job);
  });

  it('creates a new UI job in Supabase', async () => {
    const { POST } = await import('@/app/api/admin/project-pipeline/jobs/route');
    const newJob = sampleJob({
      jobNumber: '26-200A-01',
      sheetRowIndex: 0,
      uiSourceOfTruth: true,
      reviewNotes: [],
    });

    const req = new NextRequest('http://localhost/api/admin/project-pipeline/jobs', {
      method: 'POST',
      body: JSON.stringify({ job: newJob }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        jobNumber: '26-200A-01',
        sheetRowIndex: 0,
        uiSourceOfTruth: true,
        pipelineSheetName: '2026 Jobs',
      }),
      expect.objectContaining({ sheetId: 'sheet-1', sheetName: '2026 Jobs' })
    );
    expect(mockNotifyPipelineJobChangesAsync).not.toHaveBeenCalled();
  });

  it('rejects duplicate job numbers', async () => {
    mockFetchJobByNumber.mockResolvedValueOnce(sampleJob());

    const { POST } = await import('@/app/api/admin/project-pipeline/jobs/route');
    const req = new NextRequest('http://localhost/api/admin/project-pipeline/jobs', {
      method: 'POST',
      body: JSON.stringify({
        job: sampleJob({ jobNumber: '26-100A-01', sheetRowIndex: 0, uiSourceOfTruth: true }),
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(409);
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});

describe('PUT /api/admin/project-pipeline/jobs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpsert.mockImplementation(async (_supabase, job: ProjectPipelineJob) => job);
    mockLoadManagedUsers.mockResolvedValue([
      {
        email: 'marran@sageoutdooradvisory.com',
        display_name: 'Luke Marran',
        first_name: 'Luke',
        last_name: 'Marran',
      },
    ]);
  });

  it('triggers pipeline email notifications after a successful save', async () => {
    const { PUT } = await import('@/app/api/admin/project-pipeline/jobs/route');
    const { fetchProjectPipelineJobsWithFallback } = jest.requireMock(
      '@/lib/project-pipeline/fetch-with-fallback'
    ) as { fetchProjectPipelineJobsWithFallback: jest.Mock };
    const existingJob = sampleJob({ reviewStatus: '', dueDate: '3/20/26' });
    const updatedJob = sampleJob({ reviewStatus: 'Changes Requested', dueDate: '4/1/26' });

    mockFetchJobByNumber.mockResolvedValueOnce(existingJob);

    const req = new NextRequest('http://localhost/api/admin/project-pipeline/jobs', {
      method: 'PUT',
      body: JSON.stringify({
        job: updatedJob,
        reviewFeedbackNote: 'Please update the market section.',
      }),
    });

    const res = await PUT(req);
    expect(res.status).toBe(200);
    expect(fetchProjectPipelineJobsWithFallback).not.toHaveBeenCalled();
    expect(mockFetchJobByNumber).toHaveBeenCalled();

    expect(mockNotifyPipelineJobChangesAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        existingJob,
        savedJob: expect.objectContaining({
          jobNumber: updatedJob.jobNumber,
          reviewStatus: 'Changes Requested',
          dueDate: '4/1/26',
        }),
        actorEmail: 'heilala@sageoutdooradvisory.com',
        actorDisplayName: 'Shari Heilala',
        managedUsers: [
          expect.objectContaining({ email: 'marran@sageoutdooradvisory.com' }),
        ],
      })
    );
  });

  it('DELETE removes a job for admins', async () => {
    const job = sampleJob();
    mockFetchJobByNumber.mockResolvedValueOnce(job);

    const { DELETE } = await import('@/app/api/admin/project-pipeline/jobs/route');
    const res = await DELETE(
      new NextRequest('http://localhost/api/admin/project-pipeline/jobs', {
        method: 'DELETE',
        body: JSON.stringify({ job }),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true, jobNumber: job.jobNumber });
  });
});
