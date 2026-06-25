import { buildProjectPipelineApiResponse } from '@/lib/project-pipeline/build-api-response';
import { PROJECT_PIPELINE_ALL_SHEETS_TAB } from '@/lib/project-pipeline/sheet-tabs';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

jest.mock('@/lib/auth-helpers', () => ({
  getManagedUser: jest.fn(),
}));

jest.mock('@/lib/supabase', () => ({
  createServerClient: jest.fn(() => ({ from: jest.fn() })),
}));

jest.mock('@/lib/google-sheets-export', () => ({
  isGoogleSheetsServiceAccountConfigured: jest.fn(() => false),
}));

jest.mock('@/lib/project-pipeline/auth', () => ({
  getProjectPipelineAuthMode: jest.fn(() => 'oauth'),
  getProjectPipelineOAuthClientId: jest.fn(() => 'client-id.apps.googleusercontent.com'),
  isProjectPipelineConfigured: jest.fn(() => true),
}));

jest.mock('@/lib/project-pipeline/fetch-from-supabase', () => ({
  countAllProjectPipelineJobsInSupabase: jest.fn(),
  countProjectPipelineJobsInSupabase: jest.fn(),
}));

jest.mock('@/lib/project-pipeline/mirror-status', () => ({
  getProjectPipelineMirrorStatus: jest.fn(),
}));

jest.mock('@/lib/project-pipeline/load-visible-pipeline-jobs', () => ({
  loadVisibleProjectPipelineJobs: jest.fn(),
}));

jest.mock('@/lib/project-pipeline/author-preview', () => ({
  canUseProjectPipelineAuthorPreview: jest.fn(() => false),
}));

jest.mock('@/lib/project-pipeline/consultant-workload-view', () => ({
  canUseProjectPipelineConsultantWorkloadView: jest.fn(() => false),
}));

import { getManagedUser } from '@/lib/auth-helpers';
import { getProjectPipelineAuthMode, isProjectPipelineConfigured } from '@/lib/project-pipeline/auth';
import { countAllProjectPipelineJobsInSupabase, countProjectPipelineJobsInSupabase } from '@/lib/project-pipeline/fetch-from-supabase';
import { loadVisibleProjectPipelineJobs } from '@/lib/project-pipeline/load-visible-pipeline-jobs';
import { getProjectPipelineMirrorStatus } from '@/lib/project-pipeline/mirror-status';

const mockGetManagedUser = getManagedUser as jest.MockedFunction<typeof getManagedUser>;
const mockCountAll = countAllProjectPipelineJobsInSupabase as jest.MockedFunction<
  typeof countAllProjectPipelineJobsInSupabase
>;
const mockCountTab = countProjectPipelineJobsInSupabase as jest.MockedFunction<
  typeof countProjectPipelineJobsInSupabase
>;
const mockLoadVisible = loadVisibleProjectPipelineJobs as jest.MockedFunction<
  typeof loadVisibleProjectPipelineJobs
>;
const mockMirrorStatus = getProjectPipelineMirrorStatus as jest.MockedFunction<
  typeof getProjectPipelineMirrorStatus
>;
const mockGetAuthMode = getProjectPipelineAuthMode as jest.MockedFunction<
  typeof getProjectPipelineAuthMode
>;
const mockIsConfigured = isProjectPipelineConfigured as jest.MockedFunction<
  typeof isProjectPipelineConfigured
>;

function sampleJob(overrides: Partial<ProjectPipelineJob> = {}): ProjectPipelineJob {
  return {
    jobNumber: '26-103A-01',
    client: 'Client',
    propertyLocation: 'Belle Center, OH',
    appraiserConsultant: 'Luke',
    projMgr: 'Shari',
    contractStart: '01/09/2026',
    dueDate: '03/01/2026',
    dateCompleted: '',
    commercialOutdoor: 'Outdoor',
    propertyType: 'Glamping',
    service: 'Feasibility Study',
    reviewStatus: 'Not Started',
    sentToClient: 'No',
    authorSlackUsername: 'luke',
    clientEmail: 'client@example.com',
    projectStatus: 'In-Progress',
    sheetRowIndex: 38,
    pipelineSheetName: '2026 Jobs',
    ...overrides,
  };
}

describe('buildProjectPipelineApiResponse', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetManagedUser.mockResolvedValue({
      id: 'user-1',
      email: 'luke@example.com',
      display_name: 'Luke Marran',
      role: 'consultant',
      division: 'outdoor',
      is_active: true,
      pipeline_view_all: false,
      created_at: '',
      updated_at: '',
    } as Awaited<ReturnType<typeof getManagedUser>>);
    mockIsConfigured.mockReturnValue(true);
    mockGetAuthMode.mockReturnValue('oauth');
    mockCountAll.mockResolvedValue(10);
    mockCountTab.mockResolvedValue(10);
    mockMirrorStatus.mockResolvedValue({
      mirroredCount: 10,
      lastSyncedAt: '2026-06-01T12:00:00.000Z',
      mirrorIncomplete: false,
    });
    mockLoadVisible.mockResolvedValue({
      jobs: [sampleJob()],
      fieldColumnMap: { jobNumber: 0 },
      dataSource: 'supabase',
    });
  });

  it('returns configured false when pipeline env is missing', async () => {
    mockIsConfigured.mockReturnValue(false);

    const result = await buildProjectPipelineApiResponse({
      userId: 'user-1',
      email: 'luke@example.com',
    });

    expect(result.configured).toBe(false);
    expect(result.jobs).toEqual([]);
    expect(mockLoadVisible).not.toHaveBeenCalled();
  });

  it('returns requiresOAuth when oauth mode has an empty mirror and no access token', async () => {
    mockCountTab.mockResolvedValue(0);

    const result = await buildProjectPipelineApiResponse({
      userId: 'user-1',
      email: 'luke@example.com',
      sheetName: '2026 Jobs',
    });

    expect(result.requiresOAuth).toBe(true);
    expect(result.oauthClientId).toBe('client-id.apps.googleusercontent.com');
    expect(result.jobs).toEqual([]);
    expect(mockLoadVisible).not.toHaveBeenCalled();
    expect(mockMirrorStatus).not.toHaveBeenCalled();
    expect(mockCountTab).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ sheetName: '2026 Jobs' })
    );
  });

  it('requires OAuth for an empty sheet tab even when other tabs are mirrored', async () => {
    mockCountTab.mockResolvedValue(0);

    const result = await buildProjectPipelineApiResponse({
      userId: 'user-1',
      email: 'luke@example.com',
      sheetName: '2025 Jobs',
    });

    expect(mockCountTab).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ sheetName: '2025 Jobs' })
    );
    expect(mockCountAll).not.toHaveBeenCalled();
    expect(result.requiresOAuth).toBe(true);
    expect(mockLoadVisible).not.toHaveBeenCalled();
  });

  it('loads jobs from the mirror when oauth mode has mirrored rows without a token', async () => {
    mockCountTab.mockResolvedValue(10);

    const result = await buildProjectPipelineApiResponse({
      userId: 'user-1',
      email: 'luke@example.com',
      sheetName: '2026 Jobs',
    });

    expect(result.requiresOAuth).toBe(false);
    expect(result.jobs).toHaveLength(1);
    expect(result.dataSource).toBe('supabase');
    expect(mockLoadVisible).toHaveBeenCalledWith(
      expect.objectContaining({
        sheetName: '2026 Jobs',
        allowOAuthSheets: false,
        accessToken: undefined,
      })
    );
  });

  it('allows oauth sheets fallback when an access token is provided on an empty mirror', async () => {
    mockCountTab.mockResolvedValue(0);
    mockLoadVisible.mockResolvedValue({
      jobs: [sampleJob()],
      fieldColumnMap: {},
      dataSource: 'sheets',
    });

    const result = await buildProjectPipelineApiResponse({
      userId: 'user-1',
      email: 'luke@example.com',
      accessToken: 'oauth-token',
      sheetName: '2026 Jobs',
    });

    expect(result.requiresOAuth).toBe(false);
    expect(result.dataSource).toBe('sheets');
    expect(mockLoadVisible).toHaveBeenCalledWith(
      expect.objectContaining({
        allowOAuthSheets: true,
        accessToken: 'oauth-token',
      })
    );
  });

  it('includes mirror metadata for the selected sheet tab', async () => {
    mockMirrorStatus.mockResolvedValue({
      mirroredCount: 42,
      lastSyncedAt: '2026-06-15T08:30:00.000Z',
      mirrorIncomplete: true,
    });

    const result = await buildProjectPipelineApiResponse({
      userId: 'user-1',
      email: 'luke@example.com',
      sheetName: '2026 Jobs',
    });

    expect(result.lastSyncedAt).toBe('2026-06-15T08:30:00.000Z');
    expect(result.mirrorIncomplete).toBe(true);
    expect(mockMirrorStatus).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ sheetName: '2026 Jobs' })
    );
  });

  it('resolves all-years sheet selection with a null sheet year', async () => {
    const result = await buildProjectPipelineApiResponse({
      userId: 'user-1',
      email: 'luke@example.com',
      sheetName: PROJECT_PIPELINE_ALL_SHEETS_TAB,
    });

    expect(result.sheetName).toBe(PROJECT_PIPELINE_ALL_SHEETS_TAB);
    expect(result.sheetYear).toBeNull();
    expect(mockLoadVisible).toHaveBeenCalledWith(
      expect.objectContaining({ sheetName: PROJECT_PIPELINE_ALL_SHEETS_TAB })
    );
  });

  it('skips the oauth gate in service-account mode', async () => {
    mockGetAuthMode.mockReturnValue('service_account');
    mockCountAll.mockResolvedValue(0);

    const result = await buildProjectPipelineApiResponse({
      userId: 'user-1',
      email: 'luke@example.com',
    });

    expect(result.requiresOAuth).toBe(false);
    expect(mockCountAll).not.toHaveBeenCalled();
    expect(mockLoadVisible).toHaveBeenCalled();
  });
});
