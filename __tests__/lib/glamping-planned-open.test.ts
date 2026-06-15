import {
  buildPlannedOpenFlipPatch,
  formatPlannedOpenDateLabel,
  isPlannedOpenDateDue,
  normalizePlannedOpenDate,
  parsePlannedOpenDateField,
  sanitizePlannedOpenDatePatch,
} from '@/lib/glamping-planned-open';

describe('normalizePlannedOpenDate', () => {
  it('accepts valid YYYY-MM-DD', () => {
    expect(normalizePlannedOpenDate('2026-06-18')).toBe('2026-06-18');
  });

  it('rejects invalid dates', () => {
    expect(normalizePlannedOpenDate('2026-13-01')).toBeNull();
    expect(normalizePlannedOpenDate('06/18/2026')).toBeNull();
    expect(normalizePlannedOpenDate('')).toBeNull();
  });
});

describe('isPlannedOpenDateDue', () => {
  it('is due on and after the planned date', () => {
    expect(isPlannedOpenDateDue('2026-06-18', '2026-06-17')).toBe(false);
    expect(isPlannedOpenDateDue('2026-06-18', '2026-06-18')).toBe(true);
    expect(isPlannedOpenDateDue('2026-06-18', '2026-06-19')).toBe(true);
  });
});

describe('buildPlannedOpenFlipPatch', () => {
  it('flips to Yes and sets year_site_opened from planned date', () => {
    expect(
      buildPlannedOpenFlipPatch(
        {
          id: 1,
          property_name: 'Test Camp',
          planned_open_date: '2026-06-18',
          year_site_opened: null,
        },
        '2026-06-18'
      )
    ).toEqual({
      is_open: 'Yes',
      planned_open_date: null,
      date_updated: '2026-06-18',
      year_site_opened: '2026',
    });
  });

  it('does not overwrite existing year_site_opened', () => {
    const patch = buildPlannedOpenFlipPatch(
      {
        id: 1,
        property_name: 'Test Camp',
        planned_open_date: '2026-06-18',
        year_site_opened: 2025,
      },
      '2026-06-18'
    );
    expect(patch.year_site_opened).toBeUndefined();
  });
});

describe('parsePlannedOpenDateField', () => {
  it('parses Postgres date strings and ISO timestamps', () => {
    expect(parsePlannedOpenDateField('2026-06-30')).toBe('2026-06-30');
    expect(parsePlannedOpenDateField('2026-06-30T00:00:00+00:00')).toBe(
      '2026-06-30'
    );
  });
});

describe('formatPlannedOpenDateLabel', () => {
  it('formats valid dates and falls back for empty values', () => {
    expect(formatPlannedOpenDateLabel('2026-06-30')).toBe('Jun 30, 2026');
    expect(formatPlannedOpenDateLabel(null)).toBe('—');
  });
});

describe('sanitizePlannedOpenDatePatch', () => {
  it('clears planned_open_date when leaving Under Construction', () => {
    const patch = { is_open: 'Yes', planned_open_date: '2026-06-18' };
    expect(sanitizePlannedOpenDatePatch(patch, 'Under Construction')).toEqual({
      ok: true,
    });
    expect(patch.planned_open_date).toBeNull();
  });

  it('rejects planned_open_date when not Under Construction', () => {
    const patch = { planned_open_date: '2026-06-18' };
    const result = sanitizePlannedOpenDatePatch(patch, 'Yes');
    expect(result).toEqual({
      ok: false,
      error: 'planned_open_date is only allowed when is_open is Under Construction',
    });
  });
});
