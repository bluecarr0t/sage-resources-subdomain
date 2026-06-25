import { loadVisibleProjectPipelineJobs } from '@/lib/project-pipeline/load-visible-pipeline-jobs';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

jest.mock('@/lib/project-pipeline/fetch-with-fallback', () => ({
  fetchProjectPipelineJobsWithFallback: jest.fn(),
}));

jest.mock('@/lib/project-pipeline/filter-jobs', () => ({
  filterJobsForUser: jest.fn((jobs: ProjectPipelineJob[]) => jobs),
}));

jest.mock('@/lib/project-pipeline/review-workflow', () => ({
  filterProjectPipelineJobReviewNotesForViewer: jest.fn((job: ProjectPipelineJob) => job),
}));

import { fetchProjectPipelineJobsWithFallback } from '@/lib/project-pipeline/fetch-with-fallback';
import { filterJobsForUser } from '@/lib/project-pipeline/filter-jobs';

const mockFetch = fetchProjectPipelineJobsWithFallback as jest.MockedFunction<
  typeof fetchProjectPipelineJobsWithFallback
>;
const mockFilter = filterJobsForUser as jest.MockedFunction<typeof filterJobsForUser>;

function sampleJob(): ProjectPipelineJob {
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
  };
}

describe('loadVisibleProjectPipelineJobs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      jobs: [sampleJob()],
      fieldColumnMap: { jobNumber: 0 },
      dataSource: 'supabase',
    });
    mockFilter.mockImplementation((jobs) => jobs);
  });

  it('fetches with mirror preference and filters jobs for the viewer', async () => {
    const supabase = {} as never;
    const result = await loadVisibleProjectPipelineJobs({
      supabase,
      sheetName: '2026 Jobs',
      email: 'luke@example.com',
      displayName: 'Luke Marran',
      pipelineViewAll: false,
      viewerIsAdmin: false,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.objectContaining({
        supabase,
        sheetName: '2026 Jobs',
        mirrorPreferred: true,
        allowOAuthSheets: false,
      })
    );
    expect(mockFilter).toHaveBeenCalledWith(
      [sampleJob()],
      expect.objectContaining({
        email: 'luke@example.com',
        displayName: 'Luke Marran',
        pipelineViewAll: false,
      })
    );
    expect(result.jobs).toHaveLength(1);
    expect(result.dataSource).toBe('supabase');
  });

  it('passes oauth access tokens only when oauth sheets are allowed', async () => {
    const supabase = {} as never;

    await loadVisibleProjectPipelineJobs({
      supabase,
      sheetName: '2026 Jobs',
      email: 'luke@example.com',
      displayName: 'Luke Marran',
      pipelineViewAll: true,
      viewerIsAdmin: true,
      accessToken: 'oauth-token',
      allowOAuthSheets: true,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.objectContaining({
        allowOAuthSheets: true,
        accessToken: 'oauth-token',
      })
    );
  });
});
