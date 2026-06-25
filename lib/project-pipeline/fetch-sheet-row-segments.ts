import type { sheets_v4 } from 'googleapis';
import {
  getProjectPipelineSheetsCache,
  projectPipelineSheetsCacheKey,
  setProjectPipelineSheetsCache,
} from './sheets-read-cache';
import {
  inferSegmentFromGridRow,
  resolveCommercialOutdoor,
  resolveProjectPipelineJobCommercialOutdoor,
  stripProjectPipelineSegmentColumnLabel,
  ROW_HIGHLIGHT_COLUMN_INDICES,
  type ProjectPipelineSegment,
} from './segment';
import type { ProjectPipelineJob } from './types';

const HIGHLIGHT_LAST_COLUMN = Math.max(...ROW_HIGHLIGHT_COLUMN_INDICES);
const HIGHLIGHT_COLUMN_LETTER = String.fromCharCode(65 + HIGHLIGHT_LAST_COLUMN);

export function buildRowSegmentGetter(
  rowData: sheets_v4.Schema$RowData[] | null | undefined
): (dataRowIndex: number) => ProjectPipelineSegment | undefined {
  if (!rowData?.length) {
    return () => undefined;
  }

  return (dataRowIndex: number) => {
    const row = rowData[dataRowIndex];
    if (!row?.values?.length) return undefined;
    return inferSegmentFromGridRow(row.values);
  };
}

/** Load row background colors used to infer Outdoor (green) vs Commercial. */
export async function fetchProjectPipelineRowSegmentGetter(
  sheets: sheets_v4.Sheets,
  sheetId: string,
  sheetName: string,
  options: { bypassCache?: boolean } = {}
): Promise<(dataRowIndex: number) => ProjectPipelineSegment | undefined> {
  const cacheKey = projectPipelineSheetsCacheKey('row-segments', sheetId, sheetName);

  if (!options.bypassCache) {
    const cached =
      getProjectPipelineSheetsCache<
        (dataRowIndex: number) => ProjectPipelineSegment | undefined
      >(cacheKey);
    if (cached) return cached;
  }

  const escaped = sheetName.replace(/'/g, "''");
  const range = `'${escaped}'!A:${HIGHLIGHT_COLUMN_LETTER}`;

  const response = await sheets.spreadsheets.get({
    spreadsheetId: sheetId,
    ranges: [range],
    includeGridData: true,
    fields: 'sheets.data.rowData.values.effectiveFormat.backgroundColor',
  });

  const rowData = response.data.sheets?.[0]?.data?.[0]?.rowData;
  const getter = buildRowSegmentGetter(rowData);
  if (!options.bypassCache) {
    setProjectPipelineSheetsCache(cacheKey, getter);
  }
  return getter;
}

/** Re-apply row highlight segment when the Supabase mirror only stored a division label. */
export async function applySheetRowSegmentsToJobs(input: {
  jobs: readonly ProjectPipelineJob[];
  sheetId: string;
  sheetName: string;
  sheets: import('googleapis').sheets_v4.Sheets;
}): Promise<ProjectPipelineJob[]> {
  const getRowSegment = await fetchProjectPipelineRowSegmentGetter(
    input.sheets,
    input.sheetId,
    input.sheetName
  ).catch(() => null);

  if (!getRowSegment) return [...input.jobs];

  return input.jobs.map((job) => {
    const dataRowIndex = job.sheetRowIndex - 1;
    const segment = getRowSegment(dataRowIndex) ?? 'Commercial';

    const commercialOutdoor = resolveProjectPipelineJobCommercialOutdoor({
      commercialOutdoor: resolveCommercialOutdoor(
        stripProjectPipelineSegmentColumnLabel(job.commercialOutdoor),
        segment
      ),
      service: job.service,
    });

    return {
      ...job,
      commercialOutdoor,
    };
  });
}
