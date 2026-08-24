import {
  isGoogleSheetsOAuthAuthError,
  isGoogleSheetsPermissionError,
} from './google-sheets-client-errors';
import type { ProjectPipelineSheetTab } from './sheet-tabs';

export const DEFAULT_PROJECT_PIPELINE_SYNC_RETRY_DELAY_MS = 2_500;
export const DEFAULT_PROJECT_PIPELINE_SYNC_MAX_ATTEMPTS = 2;

export type ProjectPipelineSheetSyncFailure = {
  sheetName: ProjectPipelineSheetTab;
  error: string;
};

export type SyncProjectPipelineSheetsWithRetryResult<T> = {
  sheets: T[];
  failedSheets: ProjectPipelineSheetSyncFailure[];
};

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error ?? 'Unknown error');
}

/** Retry quota/transient failures; skip permission, OAuth, and config errors. */
export function isRetryableProjectPipelineSyncError(error: unknown): boolean {
  if (isGoogleSheetsPermissionError(error)) return false;
  if (isGoogleSheetsOAuthAuthError(error)) return false;
  const message = errorMessage(error);
  if (/not configured/i.test(message)) return false;
  if (/requires Google service account/i.test(message)) return false;
  return true;
}

export function formatProjectPipelineFailedSheetsMessage(
  failedSheets: readonly ProjectPipelineSheetSyncFailure[]
): string {
  return failedSheets.map((sheet) => `${sheet.sheetName}: ${sheet.error}`).join('; ');
}

export type ProjectPipelineSyncAllOutcome = {
  ok: boolean;
  status: number;
  message?: string;
};

export function describeProjectPipelineSyncAll(result: {
  failedSheets: readonly ProjectPipelineSheetSyncFailure[];
}): ProjectPipelineSyncAllOutcome {
  if (result.failedSheets.length === 0) {
    return { ok: true, status: 200 };
  }

  return {
    ok: false,
    status: 500,
    message: formatProjectPipelineFailedSheetsMessage(result.failedSheets),
  };
}

/**
 * Sync every sheet tab, then retry remaining retryable failures once.
 * One tab failing does not skip the rest — Job Pipeline needs all years mirrored.
 */
export async function syncProjectPipelineSheetsWithRetry<T>(options: {
  sheetNames: readonly ProjectPipelineSheetTab[];
  syncSheet: (sheetName: ProjectPipelineSheetTab) => Promise<T>;
  isRetryableError?: (error: unknown) => boolean;
  maxAttempts?: number;
  retryDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
  onSheetError?: (sheetName: ProjectPipelineSheetTab, error: unknown, attempt: number) => void;
}): Promise<SyncProjectPipelineSheetsWithRetryResult<T>> {
  const {
    sheetNames,
    syncSheet,
    isRetryableError = isRetryableProjectPipelineSyncError,
    maxAttempts = DEFAULT_PROJECT_PIPELINE_SYNC_MAX_ATTEMPTS,
    retryDelayMs = DEFAULT_PROJECT_PIPELINE_SYNC_RETRY_DELAY_MS,
    sleep = defaultSleep,
    onSheetError,
  } = options;

  const sheets: T[] = [];
  const lastErrorBySheet = new Map<ProjectPipelineSheetTab, string>();
  let pending = [...sheetNames];

  for (let attempt = 1; attempt <= maxAttempts && pending.length > 0; attempt += 1) {
    if (attempt > 1) {
      await sleep(retryDelayMs);
    }

    const toTry = pending;
    pending = [];

    for (const sheetName of toTry) {
      try {
        sheets.push(await syncSheet(sheetName));
        lastErrorBySheet.delete(sheetName);
      } catch (error) {
        lastErrorBySheet.set(sheetName, errorMessage(error));
        onSheetError?.(sheetName, error, attempt);
        if (attempt < maxAttempts && isRetryableError(error)) {
          pending.push(sheetName);
        }
      }
    }
  }

  const failedSheets = sheetNames.flatMap((sheetName) => {
    const error = lastErrorBySheet.get(sheetName);
    return error ? [{ sheetName, error }] : [];
  });

  return { sheets, failedSheets };
}
