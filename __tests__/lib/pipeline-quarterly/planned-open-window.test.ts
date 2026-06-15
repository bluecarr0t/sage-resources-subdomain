import {
  isPlannedOpenWithinDays,
  isPlannedOpenWithinMonths,
  summarizePipelineOpeningWithinDays,
  summarizePipelineOpeningWithinMonths,
} from '@/lib/pipeline-quarterly/planned-open-window';

describe('isPlannedOpenWithinDays', () => {
  it('returns true for dates inside the inclusive forward window', () => {
    expect(isPlannedOpenWithinDays('2026-06-15', 90, '2026-06-15')).toBe(true);
    expect(isPlannedOpenWithinDays('2026-09-13', 90, '2026-06-15')).toBe(true);
  });

  it('returns false for dates before as-of or beyond the window', () => {
    expect(isPlannedOpenWithinDays('2026-06-14', 90, '2026-06-15')).toBe(false);
    expect(isPlannedOpenWithinDays('2026-09-14', 90, '2026-06-15')).toBe(false);
    expect(isPlannedOpenWithinDays(null, 90, '2026-06-15')).toBe(false);
  });
});

describe('summarizePipelineOpeningWithinDays', () => {
  it('counts properties and units with planned open dates in the window', () => {
    const summary = summarizePipelineOpeningWithinDays(
      [
        { plannedOpenDate: '2026-07-01', units: 10 },
        { plannedOpenDate: '2026-08-01', units: 5 },
        { plannedOpenDate: null, units: 20 },
        { plannedOpenDate: '2027-01-01', units: 8 },
      ],
      90,
      '2026-06-15'
    );

    expect(summary).toEqual({
      propertyCount: 2,
      unitCount: 15,
    });
  });
});

describe('isPlannedOpenWithinMonths', () => {
  it('returns true for dates inside the inclusive six-month window', () => {
    expect(isPlannedOpenWithinMonths('2026-06-15', 6, '2026-06-15')).toBe(true);
    expect(isPlannedOpenWithinMonths('2026-12-15', 6, '2026-06-15')).toBe(true);
  });

  it('returns false for dates beyond six calendar months', () => {
    expect(isPlannedOpenWithinMonths('2026-12-16', 6, '2026-06-15')).toBe(false);
  });
});

describe('summarizePipelineOpeningWithinMonths', () => {
  it('counts properties and units with planned open dates in the window', () => {
    const summary = summarizePipelineOpeningWithinMonths(
      [
        { plannedOpenDate: '2026-07-01', units: 10 },
        { plannedOpenDate: '2026-12-01', units: 5 },
        { plannedOpenDate: null, units: 20 },
        { plannedOpenDate: '2027-01-01', units: 8 },
      ],
      6,
      '2026-06-15'
    );

    expect(summary).toEqual({
      propertyCount: 2,
      unitCount: 15,
    });
  });
});
