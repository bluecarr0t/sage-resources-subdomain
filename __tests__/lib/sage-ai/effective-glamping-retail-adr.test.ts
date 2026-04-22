import { effectiveGlampingRetailAdrFromRow } from '@/lib/sage-ai/effective-glamping-retail-adr';

describe('effectiveGlampingRetailAdrFromRow', () => {
  it('uses the average of positive seasonal rates when any are set, ignoring stale rate_avg', () => {
    const row: Record<string, unknown> = {
      rate_avg_retail_daily_rate: 2000,
      rate_winter_weekday: 200,
      rate_winter_weekend: 200,
      rate_spring_weekday: 200,
      rate_spring_weekend: 200,
      rate_summer_weekday: 200,
      rate_summer_weekend: 200,
      rate_fall_weekday: 200,
      rate_fall_weekend: 200,
    };
    expect(effectiveGlampingRetailAdrFromRow(row)).toBe(200);
  });

  it('falls back to rate_avg_retail_daily_rate when no seasonal fields are positive', () => {
    const row: Record<string, unknown> = {
      rate_avg_retail_daily_rate: 350,
    };
    expect(effectiveGlampingRetailAdrFromRow(row)).toBe(350);
  });
});
