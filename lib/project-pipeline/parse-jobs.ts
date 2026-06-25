import type { ProjectPipelineJob, ProjectPipelineSheetField } from './types';
import { buildFieldColumnMap } from './column-map';
import {
  resolveCommercialOutdoor,
  resolveCommercialOutdoorWithoutHighlight,
  resolveProjectPipelineJobCommercialOutdoor,
  type ProjectPipelineSegment,
} from './segment';
import { normalizeProjectPipelineSentToClient } from './sent-to-client';
import { normalizeProjectPipelineReviewStatus } from './review-status';
import { DEFAULT_PROJECT_PIPELINE_PROJECT_STATUS } from './project-status';
import { DEFAULT_PROJECT_PIPELINE_FLAG } from './project-flag';
import { withDerivedProjectPipelineProjectStatus } from './derive-project-status';

function cellToString(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

function isRowEmpty(values: string[]): boolean {
  return values.every((value) => !value.trim());
}

function createEmptyJob(sheetRowIndex: number): ProjectPipelineJob {
  return {
    jobNumber: '',
    client: '',
    propertyLocation: '',
    appraiserConsultant: '',
    projMgr: '',
    contractStart: '',
    dueDate: '',
    dateCompleted: '',
    commercialOutdoor: '',
    propertyType: '',
    service: '',
    reviewStatus: '',
    sentToClient: '',
    authorSlackUsername: '',
    clientEmail: '',
    projectStatus: DEFAULT_PROJECT_PIPELINE_PROJECT_STATUS,
    flag: DEFAULT_PROJECT_PIPELINE_FLAG,
    notes: '',
    sheetRowIndex,
  };
}

export type ParseProjectPipelineResult = {
  jobs: ProjectPipelineJob[];
  fieldColumnMap: ReturnType<typeof buildFieldColumnMap>;
};

/** Parse raw grid values (header row + data rows) into typed jobs. */
export function parseProjectPipelineSheet(
  rows: readonly (readonly unknown[])[],
  options?: {
    /** Sheet data-row index (1 = first row after header) → segment from row highlight. */
    getRowSegment?: (dataRowIndex: number) => ProjectPipelineSegment | undefined;
  }
): ParseProjectPipelineResult {
  if (!rows.length) {
    return { jobs: [], fieldColumnMap: {} };
  }

  const headerRow = rows[0].map((cell) => cellToString(cell));
  const fieldColumnMap = buildFieldColumnMap(headerRow);
  const columnIndexToField = new Map<number, ProjectPipelineSheetField>(
    Object.entries(fieldColumnMap).map(([field, index]) => [
      index,
      field as ProjectPipelineSheetField,
    ])
  );

  const jobs: ProjectPipelineJob[] = [];

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const rawRow = rows[rowIndex];
    const stringCells = rawRow.map((cell) => cellToString(cell));

    if (isRowEmpty(stringCells)) continue;

    const sheetRowIndex = rowIndex + 1;
    const job = createEmptyJob(sheetRowIndex);
    rawRow.forEach((cell, colIndex) => {
      const field = columnIndexToField.get(colIndex);
      if (field) {
        job[field] = cellToString(cell);
      }
    });

    if (!job.jobNumber && !job.client) continue;

    const rowSegment = options?.getRowSegment?.(rowIndex);
    if (rowSegment) {
      job.commercialOutdoor = resolveCommercialOutdoor(job.commercialOutdoor, rowSegment);
    } else {
      job.commercialOutdoor = resolveCommercialOutdoorWithoutHighlight(job.commercialOutdoor);
    }

    job.commercialOutdoor = resolveProjectPipelineJobCommercialOutdoor({
      commercialOutdoor: job.commercialOutdoor,
      service: job.service,
    });

    job.sentToClient = normalizeProjectPipelineSentToClient(job.sentToClient);
    job.reviewStatus = normalizeProjectPipelineReviewStatus(job.reviewStatus);

    jobs.push(withDerivedProjectPipelineProjectStatus(job));
  }

  return { jobs, fieldColumnMap };
}

/** @deprecated Use parseProjectPipelineSheet */
export function parseProjectPipelineRows(
  rows: readonly (readonly unknown[])[],
  options?: {
    getRowSegment?: (dataRowIndex: number) => ProjectPipelineSegment | undefined;
  }
): ProjectPipelineJob[] {
  return parseProjectPipelineSheet(rows, options).jobs;
}
