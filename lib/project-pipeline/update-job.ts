import { revalidateTag } from 'next/cache';
import type { sheets_v4 } from 'googleapis';
import {
  createGoogleSheetsReadClient,
  createGoogleSheetsReadClientFromAccessToken,
} from '@/lib/google-sheets-export';
import { columnIndexToLetter } from './column-map';
import {
  getProjectPipelineSheetId,
  getProjectPipelineSheetName,
} from './fetch-jobs';
import { resolveProjectPipelineSheetTab } from './sheet-tabs';
import { PROJECT_PIPELINE_JOB_FIELDS } from './types';
import type {
  ProjectPipelineFieldColumnMap,
  ProjectPipelineJob,
} from './types';

export type UpdateProjectPipelineJobInput = {
  job: ProjectPipelineJob;
  fieldColumnMap: ProjectPipelineFieldColumnMap;
  accessToken?: string;
  env?: NodeJS.ProcessEnv;
};

export async function updateProjectPipelineJob(
  input: UpdateProjectPipelineJobInput
): Promise<void> {
  const env = input.env ?? process.env;
  const sheetId = getProjectPipelineSheetId(env);
  const sheetName = resolveProjectPipelineSheetTab(
    input.job.pipelineSheetName || getProjectPipelineSheetName(env)
  );
  const escapedName = sheetName.replace(/'/g, "''");
  const { job, fieldColumnMap } = input;
  const accessToken = input.accessToken?.trim();

  if (!job.sheetRowIndex || job.sheetRowIndex < 2) {
    throw new Error('Invalid sheet row for project pipeline job');
  }

  const sheets: sheets_v4.Sheets = accessToken
    ? createGoogleSheetsReadClientFromAccessToken(accessToken)
    : createGoogleSheetsReadClient();

  const data = PROJECT_PIPELINE_JOB_FIELDS.flatMap((field) => {
    const columnIndex = fieldColumnMap[field];
    if (columnIndex == null) return [];

    const columnLetter = columnIndexToLetter(columnIndex);
    return [
      {
        range: `'${escapedName}'!${columnLetter}${job.sheetRowIndex}`,
        values: [[job[field]]],
      },
    ];
  });

  if (!data.length) {
    throw new Error('No mapped columns available to update this job');
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data,
    },
  });

  if (!accessToken) {
    revalidateTag('project-pipeline-jobs');
    revalidateTag(`project-pipeline-jobs-${sheetName}`);
  }
}
