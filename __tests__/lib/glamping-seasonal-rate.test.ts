import {
  buildSeasonClosedFlags,
  isAnySeasonRateMissing,
  isWinterSeasonRateMissing,
  normalizeSeasonRateForDb,
  parseSeasonRateNumeric,
  parseSeasonRateValue,
  SEASON_RATE_CLOSED,
} from '@/lib/glamping-seasonal-rate';

describe('glamping-seasonal-rate', () => {
  it('parses closed literal', () => {
    expect(parseSeasonRateValue('closed')).toEqual({ kind: 'closed' });
    expect(parseSeasonRateValue(' Closed ')).toEqual({ kind: 'closed' });
    expect(parseSeasonRateNumeric('closed')).toBeNull();
  });

  it('parses numeric strings and numbers', () => {
    expect(parseSeasonRateValue(199)).toEqual({ kind: 'numeric', value: 199 });
    expect(parseSeasonRateValue('$224.50')).toEqual({ kind: 'numeric', value: 224.5 });
  });

  it('normalizes for db storage', () => {
    expect(normalizeSeasonRateForDb('closed')).toBe(SEASON_RATE_CLOSED);
    expect(normalizeSeasonRateForDb(175)).toBe('175');
    expect(() => normalizeSeasonRateForDb('maybe')).toThrow(/Invalid seasonal rate/);
  });

  it('detects winter missing vs documented closed', () => {
    expect(
      isWinterSeasonRateMissing(
        { winter_weekday: null, winter_weekend: null },
        { winter_weekday: true, winter_weekend: true }
      )
    ).toBe(false);
    expect(
      isWinterSeasonRateMissing(
        { winter_weekday: 200, winter_weekend: null },
        {}
      )
    ).toBe(false);
    expect(
      isWinterSeasonRateMissing(
        { winter_weekday: null, winter_weekend: null },
        {}
      )
    ).toBe(true);
  });

  it('detects any-season missing for blended mode', () => {
    expect(
      isAnySeasonRateMissing(
        {
          winter_weekday: null,
          winter_weekend: null,
          spring_weekday: null,
          spring_weekend: null,
          summer_weekday: null,
          summer_weekend: null,
          fall_weekday: null,
          fall_weekend: null,
        },
        { summer_weekday: true }
      )
    ).toBe(false);
  });

  it('builds closed flags from db row', () => {
    expect(
      buildSeasonClosedFlags({
        rate_winter_weekday: 'closed',
        rate_summer_weekday: '200',
      })
    ).toEqual({ winter_weekday: true });
  });
});
