/**
 * @jest-environment node
 */

import {
  getProjectPipelineSheetsCache,
  isGoogleSheetsReadQuotaError,
  projectPipelineSheetsCacheKey,
  setProjectPipelineSheetsCache,
} from '@/lib/project-pipeline/sheets-read-cache';

describe('sheets-read-cache', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('stores and retrieves cached values before TTL expires', () => {
    const key = projectPipelineSheetsCacheKey('jobs', 'sheet-1', '2026 Jobs');
    setProjectPipelineSheetsCache(key, { jobs: [] }, 180);

    expect(getProjectPipelineSheetsCache<{ jobs: unknown[] }>(key)).toEqual({ jobs: [] });
  });

  it('expires cached values after TTL', () => {
    const key = projectPipelineSheetsCacheKey('jobs', 'sheet-1', '2026 Jobs');
    setProjectPipelineSheetsCache(key, { jobs: [] }, 1);

    jest.advanceTimersByTime(1_100);

    expect(getProjectPipelineSheetsCache(key)).toBeNull();
  });

  it('detects Google Sheets quota errors', () => {
    expect(
      isGoogleSheetsReadQuotaError(
        new Error(
          "Quota exceeded for quota metric 'Read requests' and limit 'Read requests per minute per user'"
        )
      )
    ).toBe(true);
    expect(isGoogleSheetsReadQuotaError(new Error('Network error'))).toBe(false);
  });
});
