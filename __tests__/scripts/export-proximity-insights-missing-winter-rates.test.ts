import { classifyWinterMissingSegment } from '@/lib/anchor-point-insights/winter-rate-research-segment';

describe('classifyWinterMissingSegment', () => {
  const base = {
    winter_weekday: null,
    winter_weekend: null,
    spring_weekday: null,
    spring_weekend: null,
    summer_weekday: null,
    summer_weekend: null,
    fall_weekday: null,
    fall_weekend: null,
    season_closed: {},
    rate_avg_retail_daily_rate: null,
  };

  it('labels summer-only gaps', () => {
    expect(
      classifyWinterMissingSegment({
        ...base,
        summer_weekday: 200,
      })
    ).toBe('winter_missing_has_summer_only');
  });

  it('labels spring/fall without summer', () => {
    expect(
      classifyWinterMissingSegment({
        ...base,
        spring_weekday: 150,
      })
    ).toBe('winter_missing_has_other_seasons');
  });

  it('labels avg-only gaps', () => {
    expect(
      classifyWinterMissingSegment({
        ...base,
        rate_avg_retail_daily_rate: 175,
      })
    ).toBe('winter_missing_has_avg_only');
  });

  it('labels fully empty seasonal rates', () => {
    expect(classifyWinterMissingSegment(base)).toBe('winter_missing_no_seasonal');
  });
});
