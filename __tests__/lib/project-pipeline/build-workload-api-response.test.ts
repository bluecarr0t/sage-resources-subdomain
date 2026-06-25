import { buildProjectPipelineWorkloadApiResponse } from '@/lib/project-pipeline/build-workload-api-response';

jest.mock('@/lib/supabase', () => ({
  createServerClient: jest.fn(),
}));

jest.mock('@/lib/project-pipeline/fetch-from-supabase', () => ({
  countProjectPipelineJobsInSupabase: jest.fn(),
}));

jest.mock('@/lib/project-pipeline/fetch-with-fallback', () => ({
  fetchProjectPipelineJobsWithFallback: jest.fn(),
}));

jest.mock('@/lib/project-pipeline/auth', () => ({
  getProjectPipelineAuthMode: jest.fn(() => 'oauth'),
  getProjectPipelineOAuthClientId: jest.fn(() => 'client-id.apps.googleusercontent.com'),
  isProjectPipelineConfigured: jest.fn(() => true),
}));

import { countProjectPipelineJobsInSupabase } from '@/lib/project-pipeline/fetch-from-supabase';

const mockCount = countProjectPipelineJobsInSupabase as jest.MockedFunction<
  typeof countProjectPipelineJobsInSupabase
>;

describe('buildProjectPipelineWorkloadApiResponse', () => {
  beforeEach(() => {
    mockCount.mockReset();
  });

  it('returns requiresOAuth when mirror is empty and no access token', async () => {
    mockCount.mockResolvedValue(0);

    const result = await buildProjectPipelineWorkloadApiResponse({
      sheetName: '2026 Jobs',
      view: 'byYear',
    });

    expect(result.requiresOAuth).toBe(true);
    expect(result.view).toBe('byYear');
    expect(result.oauthClientId).toBe('client-id.apps.googleusercontent.com');
    if (result.view === 'byYear') {
      expect(result.byAppraiser).toEqual([]);
    }
  });

  it('returns requiresOAuth for charts view when mirror is empty', async () => {
    mockCount.mockResolvedValue(0);

    const result = await buildProjectPipelineWorkloadApiResponse({
      sheetName: '2026 Jobs',
      view: 'charts',
    });

    expect(result.requiresOAuth).toBe(true);
    expect(result.view).toBe('charts');
    if (result.view === 'charts') {
      expect(result.byMonth).toEqual([]);
      expect(result.unparsedJobCount).toBe(0);
    }
  });
});
