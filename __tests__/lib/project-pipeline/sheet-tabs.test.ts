import {
  formatProjectPipelineSheetYearLabel,
  parseProjectPipelineSheetYear,
  PROJECT_PIPELINE_ALL_SHEETS_TAB,
  PROJECT_PIPELINE_SHEET_TABS,
  resolveProjectPipelineSheetSelection,
  resolveProjectPipelineSheetTab,
} from '@/lib/project-pipeline/sheet-tabs';

describe('parseProjectPipelineSheetYear', () => {
  it('parses year from standard job tabs', () => {
    expect(parseProjectPipelineSheetYear('2026 Jobs')).toBe(2026);
    expect(parseProjectPipelineSheetYear('2025 Jobs')).toBe(2025);
  });

  it('parses year from Vanessa-only tab', () => {
    expect(parseProjectPipelineSheetYear('2023 Vanessa Only')).toBe(2023);
  });

  it('parses year from bare year tabs', () => {
    expect(parseProjectPipelineSheetYear('2022')).toBe(2022);
    expect(parseProjectPipelineSheetYear('2020')).toBe(2020);
  });

  it('returns null when no leading year', () => {
    expect(parseProjectPipelineSheetYear('Vanessa Only')).toBeNull();
  });
});

describe('formatProjectPipelineSheetYearLabel', () => {
  it('shows only the year for sheet tabs', () => {
    expect(formatProjectPipelineSheetYearLabel('2025 Jobs')).toBe('2025');
    expect(formatProjectPipelineSheetYearLabel('2023 Vanessa Only')).toBe('2023');
    expect(formatProjectPipelineSheetYearLabel('2020')).toBe('2020');
  });

  it('shows All Years for the combined view sentinel', () => {
    expect(formatProjectPipelineSheetYearLabel(PROJECT_PIPELINE_ALL_SHEETS_TAB)).toBe('All Years');
  });
});

describe('resolveProjectPipelineSheetTab', () => {
  it('defaults to 2026 Jobs', () => {
    expect(resolveProjectPipelineSheetTab(undefined)).toBe('2026 Jobs');
    expect(resolveProjectPipelineSheetTab('')).toBe('2026 Jobs');
    expect(resolveProjectPipelineSheetTab('invalid')).toBe('2026 Jobs');
  });

  it('keeps known tabs', () => {
    for (const tab of PROJECT_PIPELINE_SHEET_TABS) {
      expect(resolveProjectPipelineSheetTab(tab)).toBe(tab);
    }
  });
});

describe('resolveProjectPipelineSheetSelection', () => {
  it('defaults to all years for the Job Pipeline view', () => {
    expect(resolveProjectPipelineSheetSelection(undefined)).toBe(PROJECT_PIPELINE_ALL_SHEETS_TAB);
    expect(resolveProjectPipelineSheetSelection('')).toBe(PROJECT_PIPELINE_ALL_SHEETS_TAB);
    expect(resolveProjectPipelineSheetSelection('invalid')).toBe(PROJECT_PIPELINE_ALL_SHEETS_TAB);
  });

  it('keeps all years and known tabs', () => {
    expect(resolveProjectPipelineSheetSelection(PROJECT_PIPELINE_ALL_SHEETS_TAB)).toBe(
      PROJECT_PIPELINE_ALL_SHEETS_TAB
    );
    for (const tab of PROJECT_PIPELINE_SHEET_TABS) {
      expect(resolveProjectPipelineSheetSelection(tab)).toBe(tab);
    }
  });
});
