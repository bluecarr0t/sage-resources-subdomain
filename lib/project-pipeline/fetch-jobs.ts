import { unstable_cache } from 'next/cache';
import {
  createGoogleSheetsReadClient,
  createGoogleSheetsReadClientFromAccessToken,
  isGoogleSheetsServiceAccountConfigured,
} from '@/lib/google-sheets-export';
import { isProjectPipelineConfigured } from './auth';
import { parseProjectPipelineSheet } from './parse-jobs';
import { buildFieldColumnMap } from './column-map';
import {
  applySheetRowSegmentsToJobs,
  fetchProjectPipelineRowSegmentGetter,
} from './fetch-sheet-row-segments';
import {
  DEFAULT_PROJECT_PIPELINE_SHEET_TAB,
  parseProjectPipelineSheetYear,
  resolveProjectPipelineSheetTab,
} from './sheet-tabs';
import type { ProjectPipelineSegment } from './segment';
import {
  getProjectPipelineSheetsCache,
  projectPipelineSheetsCacheKey,
  setProjectPipelineSheetsCache,
} from './sheets-read-cache';
import type { ProjectPipelineFieldColumnMap, ProjectPipelineJob } from './types';

export const DEFAULT_PROJECT_PIPELINE_SHEET_ID =
  '1q9LzRoP_lDmiXaXLEL9HwXGjVPdNon0EoZ3yY4vrk3A';
export const DEFAULT_PROJECT_PIPELINE_SHEET_NAME = DEFAULT_PROJECT_PIPELINE_SHEET_TAB;

const CACHE_REVALIDATE_SECONDS = 180;

export function getProjectPipelineSheetId(
  env: NodeJS.ProcessEnv = process.env
): string {
  return env.GOOGLE_PROJECT_PIPELINE_SHEET_ID?.trim() || DEFAULT_PROJECT_PIPELINE_SHEET_ID;
}

export function getProjectPipelineSheetName(
  env: NodeJS.ProcessEnv = process.env
): string {
  return env.GOOGLE_PROJECT_PIPELINE_SHEET_NAME?.trim() || DEFAULT_PROJECT_PIPELINE_SHEET_NAME;
}

export { isProjectPipelineConfigured } from './auth';

async function fetchProjectPipelineJobsFromSheet(
  sheetId: string,
  sheetName: string,
  accessToken?: string,
  options: { skipRowSegmentFetch?: boolean } = {}
): Promise<{ jobs: ProjectPipelineJob[]; fieldColumnMap: ProjectPipelineFieldColumnMap }> {
  const sheets = accessToken
    ? createGoogleSheetsReadClientFromAccessToken(accessToken)
    : createGoogleSheetsReadClient();
  const range = `'${sheetName.replace(/'/g, "''")}'!A:O`;

  const segmentPromise = options.skipRowSegmentFetch
    ? Promise.resolve(() => undefined as ProjectPipelineSegment | undefined)
    : fetchProjectPipelineRowSegmentGetter(sheets, sheetId, sheetName).catch((error) => {
        console.warn(
          `[project-pipeline] Row highlight read failed for ${sheetName}; segment column only`,
          error
        );
        return () => undefined;
      });

  const [response, getRowSegment] = await Promise.all([
    sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range,
      valueRenderOption: 'FORMATTED_VALUE',
    }),
    segmentPromise,
  ]);

  const values = response.data.values;
  if (!values?.length) return { jobs: [], fieldColumnMap: {} };

  const parsed = parseProjectPipelineSheet(values, { getRowSegment });

  return {
    jobs: parsed.jobs.map((job) => ({
      ...job,
      pipelineSheetName: sheetName,
      sheetYear: parseProjectPipelineSheetYear(sheetName),
    })),
    fieldColumnMap: parsed.fieldColumnMap,
  };
}

function getCachedFetch(sheetId: string, sheetName: string) {
  return unstable_cache(
    () => fetchProjectPipelineJobsFromSheet(sheetId, sheetName),
    ['project-pipeline-jobs', sheetId, sheetName],
    {
      revalidate: CACHE_REVALIDATE_SECONDS,
      tags: ['project-pipeline-jobs', `project-pipeline-jobs-${sheetName}`],
    }
  );
}

export async function fetchProjectPipelineFieldColumnMap(input: {
  sheetName?: string;
  accessToken?: string;
  env?: NodeJS.ProcessEnv;
  bypassCache?: boolean;
}): Promise<ProjectPipelineFieldColumnMap> {
  const env = input.env ?? process.env;
  const sheetId = getProjectPipelineSheetId(env);
  const sheetName = resolveProjectPipelineSheetTab(
    input.sheetName ?? getProjectPipelineSheetName(env)
  );
  const accessToken = input.accessToken?.trim();
  const cacheKey = projectPipelineSheetsCacheKey('field-column-map', sheetId, sheetName);

  if (!input.bypassCache) {
    const cached = getProjectPipelineSheetsCache<ProjectPipelineFieldColumnMap>(cacheKey);
    if (cached) return cached;
  }

  const sheets = accessToken
    ? createGoogleSheetsReadClientFromAccessToken(accessToken)
    : createGoogleSheetsReadClient();
  const range = `'${sheetName.replace(/'/g, "''")}'!1:1`;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
    valueRenderOption: 'FORMATTED_VALUE',
  });

  const headerRow = response.data.values?.[0];
  if (!headerRow?.length) return {};

  const fieldColumnMap = buildFieldColumnMap(
    headerRow.map((cell) => String(cell ?? '').trim())
  );
  setProjectPipelineSheetsCache(cacheKey, fieldColumnMap, CACHE_REVALIDATE_SECONDS);
  return fieldColumnMap;
}

export type FetchProjectPipelineJobsResult = {
  jobs: ProjectPipelineJob[];
  fieldColumnMap: ProjectPipelineFieldColumnMap;
};

export type FetchProjectPipelineJobsOptions = {
  accessToken?: string;
  env?: NodeJS.ProcessEnv;
  sheetName?: string;
  /** Skip Next.js unstable_cache (use for cron / write-back refresh). */
  bypassCache?: boolean;
  /** Skip spreadsheets.get row-highlight reads (saves API quota during bulk sync). */
  skipRowSegmentFetch?: boolean;
};

/** Fetch all jobs from the configured Google Sheet tab. Service-account reads are cached ~3 min unless bypassCache. */
export async function fetchProjectPipelineJobs(
  options: FetchProjectPipelineJobsOptions = {}
): Promise<FetchProjectPipelineJobsResult> {
  const env = options.env ?? process.env;

  if (!isProjectPipelineConfigured(env)) {
    throw new Error('Project Pipeline Google Sheets is not configured');
  }

  const sheetId = getProjectPipelineSheetId(env);
  const sheetName = resolveProjectPipelineSheetTab(
    options.sheetName ?? getProjectPipelineSheetName(env)
  );
  const accessToken = options.accessToken?.trim();
  const cacheKey = projectPipelineSheetsCacheKey('jobs', sheetId, sheetName);

  if (!options.bypassCache) {
    const cached = getProjectPipelineSheetsCache<FetchProjectPipelineJobsResult>(cacheKey);
    if (cached) return cached;
  }

  const result = options.bypassCache
    ? await fetchProjectPipelineJobsFromSheet(sheetId, sheetName, accessToken, {
        skipRowSegmentFetch: options.skipRowSegmentFetch,
      })
    : accessToken
      ? await fetchProjectPipelineJobsFromSheet(sheetId, sheetName, accessToken, {
          skipRowSegmentFetch: options.skipRowSegmentFetch,
        })
      : await getCachedFetch(sheetId, sheetName)();

  if (!options.bypassCache) {
    setProjectPipelineSheetsCache(cacheKey, result, CACHE_REVALIDATE_SECONDS);
  }

  return result;
}

export async function refreshProjectPipelineJobSegmentsFromSheet(
  jobs: readonly ProjectPipelineJob[],
  input: {
    sheetId: string;
    sheetName: string;
    accessToken?: string;
    env?: NodeJS.ProcessEnv;
  }
): Promise<ProjectPipelineJob[]> {
  if (!jobs.length) return [];

  const env = input.env ?? process.env;
  const accessToken = input.accessToken?.trim();
  if (!accessToken && !isGoogleSheetsServiceAccountConfigured(env)) {
    return [...jobs];
  }

  if (!isProjectPipelineConfigured(env) && !accessToken) {
    return [...jobs];
  }

  const sheets = accessToken
    ? createGoogleSheetsReadClientFromAccessToken(accessToken)
    : createGoogleSheetsReadClient();

  return applySheetRowSegmentsToJobs({
    jobs,
    sheetId: input.sheetId,
    sheetName: input.sheetName,
    sheets,
  });
}
