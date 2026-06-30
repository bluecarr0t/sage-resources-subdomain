/**
 * @jest-environment node
 */

import { PROJECT_PIPELINE_ALL_SHEETS_TAB } from '@/lib/project-pipeline/sheet-tabs';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

jest.mock('@/lib/project-pipeline/fetch-from-supabase', () => ({
  countProjectPipelineJobsInSupabase: jest.fn(),
  fetchAllProjectPipelineJobsFromSupabase: jest.fn(),
  fetchProjectPipelineJobsFromSupabase: jest.fn(),
  fetchProjectPipelineStoredStatusMap: jest.fn().mockResolvedValue(new Map()),
  fetchProjectPipelineUiEditedJobsMap: jest.fn().mockResolvedValue(new Map()),
  mergeSheetJobsWithSupabaseOverrides: jest.fn(
    (jobs: ProjectPipelineJob[]) => jobs
  ),
  shouldUseProjectPipelineSupabaseMirror: jest.fn(),
}));

jest.mock('@/lib/project-pipeline/fetch-jobs', () => ({
  fetchProjectPipelineFieldColumnMap: jest.fn().mockResolvedValue({}),
  fetchProjectPipelineJobs: jest.fn(),
  getProjectPipelineSheetId: jest.fn().mockReturnValue('sheet-1'),
  refreshProjectPipelineJobSegmentsFromSheet: jest.fn(
    async (jobs: ProjectPipelineJob[]) => jobs
  ),
}));

jest.mock('@/lib/google-sheets-export', () => ({
  isGoogleSheetsServiceAccountConfigured: jest.fn().mockReturnValue(false),
}));

jest.mock('@/lib/project-pipeline/auth', () => ({
  isProjectPipelineConfigured: jest.fn().mockReturnValue(true),
  getProjectPipelineAuthMode: jest.fn().mockReturnValue('service_account'),
}));

function sampleJob(sheetName: string, jobNumber: string): ProjectPipelineJob {
  return {
    jobNumber,
    client: 'Client',
    propertyLocation: 'Location',
    appraiserConsultant: 'Luke',
    projMgr: '',
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
    pipelineSheetName: sheetName,
  };
}

describe('fetchProjectPipelineJobsWithFallback (all years)', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('loads each sheet tab independently so unsynced years still appear', async () => {
    const {
      countProjectPipelineJobsInSupabase,
      fetchAllProjectPipelineJobsFromSupabase,
      fetchProjectPipelineJobsFromSupabase,
      shouldUseProjectPipelineSupabaseMirror,
    } = jest.requireMock('@/lib/project-pipeline/fetch-from-supabase') as {
      countProjectPipelineJobsInSupabase: jest.Mock;
      fetchAllProjectPipelineJobsFromSupabase: jest.Mock;
      fetchProjectPipelineJobsFromSupabase: jest.Mock;
      shouldUseProjectPipelineSupabaseMirror: jest.Mock;
    };
    const { fetchProjectPipelineJobs } = jest.requireMock('@/lib/project-pipeline/fetch-jobs') as {
      fetchProjectPipelineJobs: jest.Mock;
    };

    fetchAllProjectPipelineJobsFromSupabase.mockResolvedValue([
      sampleJob('2026 Jobs', '26-109A-01'),
    ]);
    countProjectPipelineJobsInSupabase.mockImplementation(
      async (_supabase: unknown, input: { sheetName: string }) => {
        if (input.sheetName === '2026 Jobs') return 19;
        return 0;
      }
    );
    shouldUseProjectPipelineSupabaseMirror.mockImplementation(
      async (_supabase: unknown, input: { sheetName: string; mirroredCount: number }) =>
        input.sheetName === '2026 Jobs' && input.mirroredCount > 0
    );
    fetchProjectPipelineJobsFromSupabase.mockImplementation(
      async (_supabase: unknown, input: { sheetName: string }) => {
        if (input.sheetName === '2026 Jobs') {
          return [sampleJob('2026 Jobs', '26-109A-01')];
        }
        return [];
      }
    );
    fetchProjectPipelineJobs.mockImplementation(
      async (input: { sheetName: string }) => ({
        jobs: [sampleJob(input.sheetName, `25-${input.sheetName.slice(0, 4)}`)],
        fieldColumnMap: {},
      })
    );

    const { fetchProjectPipelineJobsWithFallback } = await import(
      '@/lib/project-pipeline/fetch-with-fallback'
    );

    const result = await fetchProjectPipelineJobsWithFallback({
      supabase: {} as never,
      sheetName: PROJECT_PIPELINE_ALL_SHEETS_TAB,
      mirrorPreferred: true,
    });

    expect(fetchAllProjectPipelineJobsFromSupabase).toHaveBeenCalled();
    expect(countProjectPipelineJobsInSupabase).toHaveBeenCalled();
    expect(result.jobs.some((job) => job.pipelineSheetName === '2026 Jobs')).toBe(true);
    expect(result.jobs.some((job) => job.pipelineSheetName === '2025 Jobs')).toBe(true);
    expect(fetchProjectPipelineJobs).toHaveBeenCalled();
    expect(result.dataSource).toBe('sheets');
  });

  it('loads mirrored tabs from a single Supabase query in all-years view', async () => {
    const { fetchAllProjectPipelineJobsFromSupabase } = jest.requireMock(
      '@/lib/project-pipeline/fetch-from-supabase'
    ) as {
      fetchAllProjectPipelineJobsFromSupabase: jest.Mock;
    };
    const { fetchProjectPipelineJobs } = jest.requireMock('@/lib/project-pipeline/fetch-jobs') as {
      fetchProjectPipelineJobs: jest.Mock;
    };

    fetchAllProjectPipelineJobsFromSupabase.mockResolvedValue([
      sampleJob('2026 Jobs', '26-109A-01'),
      sampleJob('2025 Jobs', '25-109A-01'),
    ]);
    fetchProjectPipelineJobs.mockResolvedValue({ jobs: [], fieldColumnMap: {} });

    const { fetchProjectPipelineJobsWithFallback } = await import(
      '@/lib/project-pipeline/fetch-with-fallback'
    );

    const result = await fetchProjectPipelineJobsWithFallback({
      supabase: {} as never,
      sheetName: PROJECT_PIPELINE_ALL_SHEETS_TAB,
      mirrorPreferred: true,
    });

    expect(fetchAllProjectPipelineJobsFromSupabase).toHaveBeenCalledTimes(1);
    expect(result.jobs).toHaveLength(2);
    expect(result.dataSource).toBe('supabase');
  });

  it('dedupes repeated jobs when building the all-years list', async () => {
    const { fetchAllProjectPipelineJobsFromSupabase } = jest.requireMock(
      '@/lib/project-pipeline/fetch-from-supabase'
    ) as {
      fetchAllProjectPipelineJobsFromSupabase: jest.Mock;
    };
    const { fetchProjectPipelineJobs } = jest.requireMock('@/lib/project-pipeline/fetch-jobs') as {
      fetchProjectPipelineJobs: jest.Mock;
    };

    const uiJob = sampleJob('2026 Jobs', '26-TEST-06');
    fetchAllProjectPipelineJobsFromSupabase.mockResolvedValue([
      uiJob,
      { ...uiJob },
      { ...uiJob },
      { ...uiJob },
    ]);
    fetchProjectPipelineJobs.mockResolvedValue({ jobs: [], fieldColumnMap: {} });

    const { fetchProjectPipelineJobsWithFallback } = await import(
      '@/lib/project-pipeline/fetch-with-fallback'
    );

    const result = await fetchProjectPipelineJobsWithFallback({
      supabase: {} as never,
      sheetName: PROJECT_PIPELINE_ALL_SHEETS_TAB,
      mirrorPreferred: true,
    });

    expect(result.jobs.filter((job) => job.jobNumber === '26-TEST-06')).toHaveLength(1);
  });

  it('prefers the Supabase mirror for tabs with mirrored rows to avoid Sheets quota', async () => {
    const {
      countProjectPipelineJobsInSupabase,
      fetchProjectPipelineJobsFromSupabase,
    } = jest.requireMock('@/lib/project-pipeline/fetch-from-supabase') as {
      countProjectPipelineJobsInSupabase: jest.Mock;
      fetchProjectPipelineJobsFromSupabase: jest.Mock;
    };
    const { fetchProjectPipelineJobs } = jest.requireMock('@/lib/project-pipeline/fetch-jobs') as {
      fetchProjectPipelineJobs: jest.Mock;
    };
    const { isGoogleSheetsServiceAccountConfigured } = jest.requireMock(
      '@/lib/google-sheets-export'
    ) as { isGoogleSheetsServiceAccountConfigured: jest.Mock };

    isGoogleSheetsServiceAccountConfigured.mockReturnValue(false);
    countProjectPipelineJobsInSupabase.mockResolvedValue(19);
    fetchProjectPipelineJobsFromSupabase.mockResolvedValue([
      sampleJob('2026 Jobs', '26-109A-01'),
    ]);

    const { fetchProjectPipelineJobsWithFallback } = await import(
      '@/lib/project-pipeline/fetch-with-fallback'
    );

    const result = await fetchProjectPipelineJobsWithFallback({
      supabase: {} as never,
      sheetName: '2026 Jobs',
      mirrorPreferred: true,
    });

    expect(fetchProjectPipelineJobs).not.toHaveBeenCalled();
    expect(result.jobs).toHaveLength(1);
    expect(result.dataSource).toBe('supabase');

    const { refreshProjectPipelineJobSegmentsFromSheet } = jest.requireMock(
      '@/lib/project-pipeline/fetch-jobs'
    ) as { refreshProjectPipelineJobSegmentsFromSheet: jest.Mock };
    expect(refreshProjectPipelineJobSegmentsFromSheet).toHaveBeenCalled();
  });

  it('skips row-segment Sheets reads when a service account mirror is configured', async () => {
    const {
      countProjectPipelineJobsInSupabase,
      fetchProjectPipelineJobsFromSupabase,
    } = jest.requireMock('@/lib/project-pipeline/fetch-from-supabase') as {
      countProjectPipelineJobsInSupabase: jest.Mock;
      fetchProjectPipelineJobsFromSupabase: jest.Mock;
    };
    const { isGoogleSheetsServiceAccountConfigured } = jest.requireMock(
      '@/lib/google-sheets-export'
    ) as { isGoogleSheetsServiceAccountConfigured: jest.Mock };

    isGoogleSheetsServiceAccountConfigured.mockReturnValue(true);
    countProjectPipelineJobsInSupabase.mockResolvedValue(19);
    fetchProjectPipelineJobsFromSupabase.mockResolvedValue([
      sampleJob('2026 Jobs', '26-109A-01'),
    ]);

    const { fetchProjectPipelineJobsWithFallback } = await import(
      '@/lib/project-pipeline/fetch-with-fallback'
    );

    const result = await fetchProjectPipelineJobsWithFallback({
      supabase: {} as never,
      sheetName: '2026 Jobs',
      mirrorPreferred: true,
    });

    expect(result.jobs).toHaveLength(1);

    const { refreshProjectPipelineJobSegmentsFromSheet } = jest.requireMock(
      '@/lib/project-pipeline/fetch-jobs'
    ) as { refreshProjectPipelineJobSegmentsFromSheet: jest.Mock };
    expect(refreshProjectPipelineJobSegmentsFromSheet).not.toHaveBeenCalled();
  });

  it('falls back to the Supabase mirror when Google Sheets quota is exceeded', async () => {
    const {
      countProjectPipelineJobsInSupabase,
      fetchProjectPipelineJobsFromSupabase,
    } = jest.requireMock('@/lib/project-pipeline/fetch-from-supabase') as {
      countProjectPipelineJobsInSupabase: jest.Mock;
      fetchProjectPipelineJobsFromSupabase: jest.Mock;
    };
    const { fetchProjectPipelineJobs } = jest.requireMock('@/lib/project-pipeline/fetch-jobs') as {
      fetchProjectPipelineJobs: jest.Mock;
    };

    countProjectPipelineJobsInSupabase
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(4);
    fetchProjectPipelineJobs.mockRejectedValue(
      new Error("Quota exceeded for quota metric 'Read requests'")
    );
    fetchProjectPipelineJobsFromSupabase.mockResolvedValue([
      sampleJob('2025 Jobs', '25-001'),
    ]);

    const { fetchProjectPipelineJobsWithFallback } = await import(
      '@/lib/project-pipeline/fetch-with-fallback'
    );

    const result = await fetchProjectPipelineJobsWithFallback({
      supabase: {} as never,
      sheetName: '2025 Jobs',
      mirrorPreferred: true,
    });

    expect(result.jobs).toHaveLength(1);
    expect(result.dataSource).toBe('supabase');
  });
});
