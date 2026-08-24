import {
  describeProjectPipelineSyncAll,
  formatProjectPipelineFailedSheetsMessage,
  isRetryableProjectPipelineSyncError,
  syncProjectPipelineSheetsWithRetry,
} from '@/lib/project-pipeline/sync-sheets-with-retry';
import type { ProjectPipelineSheetTab } from '@/lib/project-pipeline/sheet-tabs';

const TABS = ['2026 Jobs', '2025 Jobs', '2024 Jobs'] as const satisfies readonly ProjectPipelineSheetTab[];

describe('isRetryableProjectPipelineSyncError', () => {
  it('retries Google Sheets quota and transient network errors', () => {
    expect(
      isRetryableProjectPipelineSyncError(
        new Error("Quota exceeded for quota metric 'Read requests'")
      )
    ).toBe(true);
    expect(isRetryableProjectPipelineSyncError(new Error('ETIMEDOUT'))).toBe(true);
    expect(isRetryableProjectPipelineSyncError(new Error('fetch failed'))).toBe(true);
  });

  it('does not retry permission, OAuth, or config errors', () => {
    expect(
      isRetryableProjectPipelineSyncError(new Error('The caller does not have permission'))
    ).toBe(false);
    expect(isRetryableProjectPipelineSyncError(new Error('Request had invalid authentication credentials'))).toBe(
      false
    );
    expect(
      isRetryableProjectPipelineSyncError(
        new Error('Project pipeline cron sync requires Google service account credentials')
      )
    ).toBe(false);
  });
});

describe('syncProjectPipelineSheetsWithRetry', () => {
  it('syncs remaining tabs when one tab fails', async () => {
    const syncSheet = jest.fn(async (sheetName: ProjectPipelineSheetTab) => {
      if (sheetName === '2025 Jobs') {
        throw new Error('The caller does not have permission');
      }
      return { sheetName };
    });

    const result = await syncProjectPipelineSheetsWithRetry({
      sheetNames: TABS,
      syncSheet,
      sleep: async () => undefined,
    });

    expect(result.sheets.map((sheet) => sheet.sheetName)).toEqual(['2026 Jobs', '2024 Jobs']);
    expect(result.failedSheets).toEqual([
      { sheetName: '2025 Jobs', error: 'The caller does not have permission' },
    ]);
    expect(syncSheet).toHaveBeenCalledTimes(3);
  });

  it('retries retryable failures after the first pass', async () => {
    const attempts: Record<string, number> = {};
    const sleep = jest.fn(async () => undefined);
    const syncSheet = jest.fn(async (sheetName: ProjectPipelineSheetTab) => {
      attempts[sheetName] = (attempts[sheetName] ?? 0) + 1;
      if (sheetName === '2025 Jobs' && attempts[sheetName] === 1) {
        throw new Error("Quota exceeded for quota metric 'Read requests'");
      }
      return { sheetName, attempt: attempts[sheetName] };
    });

    const result = await syncProjectPipelineSheetsWithRetry({
      sheetNames: TABS,
      syncSheet,
      sleep,
      retryDelayMs: 10,
    });

    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledWith(10);
    expect(result.failedSheets).toEqual([]);
    expect(result.sheets.map((sheet) => sheet.sheetName)).toEqual([
      '2026 Jobs',
      '2024 Jobs',
      '2025 Jobs',
    ]);
    expect(attempts['2025 Jobs']).toBe(2);
  });

  it('does not retry permission errors', async () => {
    const sleep = jest.fn(async () => undefined);
    const syncSheet = jest.fn(async (sheetName: ProjectPipelineSheetTab) => {
      if (sheetName === '2026 Jobs') {
        throw new Error('The caller does not have permission');
      }
      return { sheetName };
    });

    const result = await syncProjectPipelineSheetsWithRetry({
      sheetNames: TABS,
      syncSheet,
      sleep,
    });

    expect(sleep).not.toHaveBeenCalled();
    expect(syncSheet.mock.calls.filter(([name]) => name === '2026 Jobs')).toHaveLength(1);
    expect(result.failedSheets).toEqual([
      { sheetName: '2026 Jobs', error: 'The caller does not have permission' },
    ]);
  });
});

describe('describeProjectPipelineSyncAll', () => {
  it('returns 200 when every tab succeeded', () => {
    expect(describeProjectPipelineSyncAll({ failedSheets: [] })).toEqual({
      ok: true,
      status: 200,
    });
  });

  it('returns 500 when any tab is still failing', () => {
    expect(
      describeProjectPipelineSyncAll({
        failedSheets: [{ sheetName: '2020', error: 'Quota exceeded' }],
      })
    ).toEqual({
      ok: false,
      status: 500,
      message: '2020: Quota exceeded',
    });
  });
});

describe('formatProjectPipelineFailedSheetsMessage', () => {
  it('joins failed tabs for logs and API messages', () => {
    expect(
      formatProjectPipelineFailedSheetsMessage([
        { sheetName: '2025 Jobs', error: 'Quota exceeded' },
        { sheetName: '2020', error: 'timeout' },
      ])
    ).toBe('2025 Jobs: Quota exceeded; 2020: timeout');
  });
});
