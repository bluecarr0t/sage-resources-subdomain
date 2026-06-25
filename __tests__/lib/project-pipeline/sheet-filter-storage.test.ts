import {
  parseSheetFilterParam,
  sheetNameToUrlValue,
} from '@/lib/project-pipeline/sheet-filter-storage';
import { PROJECT_PIPELINE_ALL_SHEETS_TAB } from '@/lib/project-pipeline/sheet-tabs';

describe('sheet-filter-storage', () => {
  it('maps sheet tabs to URL slugs and back', () => {
    expect(sheetNameToUrlValue(PROJECT_PIPELINE_ALL_SHEETS_TAB)).toBe('all');
    expect(sheetNameToUrlValue('2026 Jobs')).toBe('2026');
    expect(parseSheetFilterParam('all')).toBe(PROJECT_PIPELINE_ALL_SHEETS_TAB);
    expect(parseSheetFilterParam('2026')).toBe('2026 Jobs');
    expect(parseSheetFilterParam('2023-vanessa')).toBe('2023 Vanessa Only');
  });
});
