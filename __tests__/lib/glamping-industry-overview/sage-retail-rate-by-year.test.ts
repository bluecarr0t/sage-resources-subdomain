import {
  avgRetailDailyRateFromRateYearBucket,
  sageRetailRateFieldsForOverview,
} from '@/lib/glamping-industry-overview/sage-retail-rate-by-year';

describe('avgRetailDailyRateFromRateYearBucket', () => {
  it('averages non-null seasonal rates', () => {
    const rates = {
      '2025': {
        winter: { weekday: 100, weekend: 200 },
        spring: { weekday: null, weekend: null },
        summer: { weekday: 300, weekend: 300 },
        fall: { weekday: null, weekend: null },
      },
    };
    expect(avgRetailDailyRateFromRateYearBucket(rates, '2025')).toBe(225);
  });
});

describe('sageRetailRateFieldsForOverview', () => {
  it('maps legacy 2025-only JSON to 2024 and leaves 2025 empty', () => {
    const fields = sageRetailRateFieldsForOverview({
      rate_avg_retail_daily_rate: 225,
      rate_unit_rates_by_year: {
        '2025': {
          winter: { weekday: 100, weekend: 200 },
          spring: { weekday: null, weekend: null },
          summer: { weekday: 300, weekend: 300 },
          fall: { weekday: null, weekend: null },
        },
      },
    });
    expect(fields.avg_retail_daily_rate_2024).toBe('225');
    expect(fields.avg_retail_daily_rate_2025).toBeNull();
  });

  it('fills 2025 for legacy JSON when choropleth2025 is set', () => {
    const fields = sageRetailRateFieldsForOverview(
      {
        rate_avg_retail_daily_rate: 225,
        rate_unit_rates_by_year: {
          '2025': {
            winter: { weekday: 100, weekend: 200 },
            spring: { weekday: null, weekend: null },
            summer: { weekday: 300, weekend: 300 },
            fall: { weekday: null, weekend: null },
          },
        },
      },
      { choropleth2025: true }
    );
    expect(fields.avg_retail_daily_rate_2024).toBe('225');
    expect(fields.avg_retail_daily_rate_2025).toBe('225');
  });

  it('maps 2026 JSON + rate_avg to 2025 only', () => {
    const fields = sageRetailRateFieldsForOverview({
      rate_avg_retail_daily_rate: 310,
      rate_unit_rates_by_year: {
        '2026': {
          winter: { weekday: 300, weekend: 320 },
          spring: { weekday: 300, weekend: 320 },
          summer: { weekday: 300, weekend: 320 },
          fall: { weekday: 300, weekend: 320 },
        },
      },
    });
    expect(fields.avg_retail_daily_rate_2025).toBe('310');
    expect(fields.avg_retail_daily_rate_2024).toBeNull();
  });
});
