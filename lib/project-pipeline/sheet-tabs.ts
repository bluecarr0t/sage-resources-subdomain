import type { ProjectPipelineJob } from './types';

/** Google Sheet tab names synced into `project_pipeline_jobs`. Newest first. */
export const PROJECT_PIPELINE_SHEET_TABS = [
  '2026 Jobs',
  '2025 Jobs',
  '2024 Jobs',
  '2023 Vanessa Only',
  '2022',
  '2021',
  '2020',
] as const;

export type ProjectPipelineSheetTab = (typeof PROJECT_PIPELINE_SHEET_TABS)[number];

/** Sentinel value for Job Pipeline UI — loads every synced sheet tab. */
export const PROJECT_PIPELINE_ALL_SHEETS_TAB = '__all_years__' as const;

export type ProjectPipelineSheetSelection =
  | ProjectPipelineSheetTab
  | typeof PROJECT_PIPELINE_ALL_SHEETS_TAB;

/** Default Google Sheet tab for sync, fetch fallbacks, and env defaults. */
export const DEFAULT_PROJECT_PIPELINE_SHEET_TAB: ProjectPipelineSheetTab = '2026 Jobs';

/** Default year filter on /admin/job-pipeline. */
export const DEFAULT_PROJECT_PIPELINE_VIEW_SHEET_FILTER: ProjectPipelineSheetSelection =
  PROJECT_PIPELINE_ALL_SHEETS_TAB;

export function isProjectPipelineAllSheetsTab(
  value: string | null | undefined
): value is typeof PROJECT_PIPELINE_ALL_SHEETS_TAB {
  return value?.trim() === PROJECT_PIPELINE_ALL_SHEETS_TAB;
}

export function parseProjectPipelineSheetYear(sheetName: string): number | null {
  const match = sheetName.trim().match(/^(\d{4})\b/);
  if (!match) return null;
  const year = Number.parseInt(match[1], 10);
  return Number.isFinite(year) ? year : null;
}

/** Short label for year dropdowns (e.g. "2025 Jobs" → "2025"). */
export function formatProjectPipelineSheetYearLabel(sheetName: string): string {
  if (isProjectPipelineAllSheetsTab(sheetName)) return 'All Years';
  const year = parseProjectPipelineSheetYear(sheetName);
  return year != null ? String(year) : sheetName.trim();
}

export function isProjectPipelineSheetTab(value: string): value is ProjectPipelineSheetTab {
  return (PROJECT_PIPELINE_SHEET_TABS as readonly string[]).includes(value);
}

export function resolveProjectPipelineSheetTab(
  sheetName: string | null | undefined
): ProjectPipelineSheetTab {
  const trimmed = sheetName?.trim();
  if (trimmed && isProjectPipelineSheetTab(trimmed)) return trimmed;
  return DEFAULT_PROJECT_PIPELINE_SHEET_TAB;
}

/** Resolves UI/API sheet filter — preserves "all years" and known tabs. */
export function resolveProjectPipelineSheetSelection(
  sheetName: string | null | undefined
): ProjectPipelineSheetSelection {
  const trimmed = sheetName?.trim();
  if (trimmed && isProjectPipelineAllSheetsTab(trimmed)) return PROJECT_PIPELINE_ALL_SHEETS_TAB;
  if (trimmed && isProjectPipelineSheetTab(trimmed)) return trimmed;
  return DEFAULT_PROJECT_PIPELINE_VIEW_SHEET_FILTER;
}

export function listProjectPipelineSheetTabOptions(): {
  sheetName: ProjectPipelineSheetSelection;
  sheetYear: number | null;
}[] {
  return [
    { sheetName: PROJECT_PIPELINE_ALL_SHEETS_TAB, sheetYear: null },
    ...PROJECT_PIPELINE_SHEET_TABS.map((sheetName) => ({
      sheetName,
      sheetYear: parseProjectPipelineSheetYear(sheetName),
    })),
  ];
}

export function sortProjectPipelineJobsForAllYearsView(
  jobs: readonly ProjectPipelineJob[]
): ProjectPipelineJob[] {
  return [...jobs].sort((a, b) => {
    const yearA = parseProjectPipelineSheetYear(a.pipelineSheetName ?? '') ?? 0;
    const yearB = parseProjectPipelineSheetYear(b.pipelineSheetName ?? '') ?? 0;
    if (yearB !== yearA) return yearB - yearA;
    return a.sheetRowIndex - b.sheetRowIndex;
  });
}

