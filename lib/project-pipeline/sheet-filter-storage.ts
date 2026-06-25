import {
  DEFAULT_PROJECT_PIPELINE_VIEW_SHEET_FILTER,
  isProjectPipelineAllSheetsTab,
  isProjectPipelineSheetTab,
  PROJECT_PIPELINE_ALL_SHEETS_TAB,
  PROJECT_PIPELINE_SHEET_TABS,
  type ProjectPipelineSheetSelection,
} from './sheet-tabs';

export const PROJECT_PIPELINE_SHEET_URL_PARAM = 'sheet';
export const PROJECT_PIPELINE_SHEET_STORAGE_KEY = 'project-pipeline-sheet-filter';

const ALL_YEARS_URL_VALUE = 'all';

const SHEET_SLUG_BY_TAB: Record<string, string> = {
  [PROJECT_PIPELINE_ALL_SHEETS_TAB]: ALL_YEARS_URL_VALUE,
  '2026 Jobs': '2026',
  '2025 Jobs': '2025',
  '2024 Jobs': '2024',
  '2023 Vanessa Only': '2023-vanessa',
  '2022': '2022',
  '2021': '2021',
  '2020': '2020',
};

const TAB_BY_SHEET_SLUG = Object.fromEntries(
  Object.entries(SHEET_SLUG_BY_TAB).map(([tab, slug]) => [slug, tab])
) as Record<string, ProjectPipelineSheetSelection>;

export function sheetNameToUrlValue(sheetName: string): string {
  const trimmed = sheetName.trim();
  if (isProjectPipelineAllSheetsTab(trimmed)) return ALL_YEARS_URL_VALUE;
  return SHEET_SLUG_BY_TAB[trimmed] ?? trimmed;
}

export function parseSheetFilterParam(
  value: string | null | undefined
): ProjectPipelineSheetSelection | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const slug = trimmed.toLowerCase();
  if (slug === ALL_YEARS_URL_VALUE) return PROJECT_PIPELINE_ALL_SHEETS_TAB;

  const fromSlug = TAB_BY_SHEET_SLUG[slug];
  if (fromSlug) return fromSlug;

  if (isProjectPipelineSheetTab(trimmed)) return trimmed;

  const yearMatch = /^\d{4}$/.exec(slug);
  if (yearMatch) {
    const tab = PROJECT_PIPELINE_SHEET_TABS.find(
      (name) => name.startsWith(`${yearMatch[1]} `) || name === yearMatch[1]
    );
    if (tab) return tab;
  }

  return null;
}

export function readPersistedSheetFilter(
  searchParams: Pick<URLSearchParams, 'get'> | null
): ProjectPipelineSheetSelection | null {
  const fromUrl = searchParams?.get(PROJECT_PIPELINE_SHEET_URL_PARAM);
  if (fromUrl !== null) {
    const parsed = parseSheetFilterParam(fromUrl);
    if (parsed !== null) return parsed;
  }

  if (typeof window === 'undefined') return null;

  try {
    const stored = sessionStorage.getItem(PROJECT_PIPELINE_SHEET_STORAGE_KEY);
    if (stored !== null) {
      const parsed = parseSheetFilterParam(stored);
      if (parsed !== null) return parsed;
    }
  } catch {
    // sessionStorage may be unavailable
  }

  return null;
}

export function writePersistedSheetFilter(
  sheetName: ProjectPipelineSheetSelection,
  options: { pathname: string; router: { replace: (url: string) => void } }
): void {
  const urlValue = sheetNameToUrlValue(sheetName);

  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(PROJECT_PIPELINE_SHEET_STORAGE_KEY, urlValue);
    } catch {
      // ignore
    }
  }

  const params = new URLSearchParams(
    typeof window !== 'undefined' ? window.location.search : ''
  );
  if (urlValue === ALL_YEARS_URL_VALUE) {
    params.delete(PROJECT_PIPELINE_SHEET_URL_PARAM);
  } else {
    params.set(PROJECT_PIPELINE_SHEET_URL_PARAM, urlValue);
  }

  const query = params.toString();
  options.router.replace(query ? `${options.pathname}?${query}` : options.pathname);
}

export function resolveInitialSheetFilter(
  searchParams: Pick<URLSearchParams, 'get'> | null
): ProjectPipelineSheetSelection {
  return readPersistedSheetFilter(searchParams) ?? DEFAULT_PROJECT_PIPELINE_VIEW_SHEET_FILTER;
}
