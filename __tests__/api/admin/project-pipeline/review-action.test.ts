/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

const mockNotifyPipelineJobChangesAsync = jest.fn();
const mockUpsert = jest.fn();
const mockLoadManagedUsers = jest.fn();
const mockRecordReviewActionActivityAsync = jest.fn();

jest.mock('@/lib/project-pipeline/notifications/notify-pipeline-job-change', () => ({
  notifyPipelineJobChangesAsync: (...args: unknown[]) => mockNotifyPipelineJobChangesAsync(...args),
}));

jest.mock('@/lib/project-pipeline/notifications/load-managed-users', () => ({
  loadActiveManagedUsersForPipeline: (...args: unknown[]) => mockLoadManagedUsers(...args),
}));

jest.mock('@/lib/project-pipeline/activity/record-activity', () => ({
  recordReviewActionActivityAsync: (...args: unknown[]) =>
    mockRecordReviewActionActivityAsync(...args),
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

const mockFetchJobByNumber = jest.fn();

jest.mock('@/lib/project-pipeline/fetch-from-supabase', () => ({
  fetchProjectPipelineJobByJobNumber: (...args: unknown[]) => mockFetchJobByNumber(...args),
  upsertProjectPipelineJobMirror: (...args: unknown[]) => mockUpsert(...args),
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
    client: 'Lisa Riner',
    propertyLocation: 'Hopewell Junction, NY',
    appraiserConsultant: 'Luke Marran',
    projMgr: 'Shari',
    contractStart: '01/21/2026',
    dueDate: '4/1/26',
    dateCompleted: '',
    commercialOutdoor: 'Outdoor',
    propertyType: 'Glamping',
    service: 'Feasibility Study',
    reviewStatus: 'In-Progress',
    sentToClient: 'No',
    authorSlackUsername: 'luke',
    clientEmail: 'client@example.com',
    sheetRowIndex: 2,
    pipelineSheetName: '2026 Jobs',
    reviewNotes: [],
    ...overrides,
  };
}

describe('POST /api/admin/project-pipeline/jobs/review-action', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpsert.mockImplementation(async (_supabase: unknown, job: ProjectPipelineJob) => job);
    mockLoadManagedUsers.mockResolvedValue([]);
    mockFetchJobByNumber.mockResolvedValue(sampleJob());
  });

  it('saves reviewer feedback and the new review status', async () => {
    const { POST } = await import('@/app/api/admin/project-pipeline/jobs/review-action/route');
    const existingJob = sampleJob();

    const req = new NextRequest('http://localhost/api/admin/project-pipeline/jobs/review-action', {
      method: 'POST',
      body: JSON.stringify({
        job: existingJob,
        action: 'review_feedback',
        note: "Thanks for working through this one! I'll send you an email but I'd like to review one more time before we send out.",
        reviewStatus: 'Changes Requested',
      }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.job.reviewStatus).toBe('Changes Requested');
    expect(body.job.reviewNotes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'review_feedback',
          note: "Thanks for working through this one! I'll send you an email but I'd like to review one more time before we send out.",
          reviewStatus: 'Changes Requested',
        }),
      ])
    );
    expect(mockUpsert).toHaveBeenCalled();
    expect(mockNotifyPipelineJobChangesAsync).toHaveBeenCalled();
    expect(mockRecordReviewActionActivityAsync).toHaveBeenCalled();
  });

  it('returns JSON 403 when changes requested have no note', async () => {
    const { POST } = await import('@/app/api/admin/project-pipeline/jobs/review-action/route');
    const req = new NextRequest('http://localhost/api/admin/project-pipeline/jobs/review-action', {
      method: 'POST',
      body: JSON.stringify({
        job: sampleJob(),
        action: 'review_feedback',
        note: '',
        reviewStatus: 'Changes Requested',
      }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.message).toMatch(/note is required/i);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('returns JSON 500 instead of throwing when the job lookup fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockFetchJobByNumber.mockRejectedValueOnce(new Error('Database unavailable'));

    const { POST } = await import('@/app/api/admin/project-pipeline/jobs/review-action/route');
    const req = new NextRequest('http://localhost/api/admin/project-pipeline/jobs/review-action', {
      method: 'POST',
      body: JSON.stringify({
        job: sampleJob(),
        action: 'review_feedback',
        note: 'Please update the market section.',
        reviewStatus: 'Changes Requested',
      }),
    });

    const res = await POST(req);
    const body = await res.json();

    try {
      expect(res.status).toBe(500);
      expect(body).toEqual({
        error: 'Database unavailable',
        message: 'Database unavailable',
      });
    } finally {
      consoleError.mockRestore();
    }
  });

  it('returns JSON 400 for an invalid payload', async () => {
    const { POST } = await import('@/app/api/admin/project-pipeline/jobs/review-action/route');
    const req = new NextRequest('http://localhost/api/admin/project-pipeline/jobs/review-action', {
      method: 'POST',
      body: JSON.stringify({ job: { client: 'Missing job number' }, action: 'review_feedback' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: 'Invalid review action payload' });
  });
});
