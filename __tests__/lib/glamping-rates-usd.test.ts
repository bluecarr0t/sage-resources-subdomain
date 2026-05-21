import {
  applyGlampingRatesToUsd,
  convertAmountToUsd,
  detectSourceCurrencyFromRow,
  rateJsonIndicatesUsdNumericColumns,
} from '@/lib/glamping-rates-usd';

describe('glamping-rates-usd', () => {
  it('converts EUR nightly columns and annotates JSON', () => {
    const { row, converted, sourceCurrency } = applyGlampingRatesToUsd({
      rate_avg_retail_daily_rate: 82,
      rate_summer_weekday: 82,
      rate_unit_rates_by_year: {
        '2026': { currency: 'EUR', from_rate_eur: 82, meal_plan: 'room_only' },
      },
    });
    expect(converted).toBe(true);
    expect(sourceCurrency).toBe('EUR');
    expect(row.rate_avg_retail_daily_rate).toBe(90.2);
    expect(row.rate_summer_weekday).toBe(90.2);
    const y2026 = (row.rate_unit_rates_by_year as Record<string, Record<string, unknown>>)['2026'];
    expect(y2026.currency).toBe('USD');
    expect(y2026.source_currency).toBe('EUR');
    expect(y2026.from_rate_usd).toBe(90.2);
    expect(y2026.from_rate_eur).toBe(82);
  });

  it('skips AED rows when JSON already has usd_approx fields', () => {
    const row = {
      rate_avg_retail_daily_rate: 411,
      rate_unit_rates_by_year: {
        '2026': {
          currency: 'AED',
          lowest_aed: 1510,
          usd_approx_lowest: 411,
        },
      },
    };
    expect(rateJsonIndicatesUsdNumericColumns(row.rate_unit_rates_by_year)).toBe(true);
    const result = applyGlampingRatesToUsd(row);
    expect(result.converted).toBe(false);
    expect(result.row.rate_avg_retail_daily_rate).toBe(411);
  });

  it('detects EUR from from_rate_eur without currency field', () => {
    expect(
      detectSourceCurrencyFromRow({
        rate_unit_rates_by_year: { '2026': { from_rate_eur: 147 } },
      })
    ).toBe('EUR');
  });

  it('leaves USD rows unchanged', () => {
    const result = applyGlampingRatesToUsd({
      rate_avg_retail_daily_rate: 199,
      rate_unit_rates_by_year: { '2026': { currency: 'USD', nightly_usd: 199 } },
    });
    expect(result.converted).toBe(false);
    expect(result.row.rate_avg_retail_daily_rate).toBe(199);
  });

  it('convertAmountToUsd uses reference multipliers', () => {
    expect(convertAmountToUsd(100, 'EUR')).toBe(110);
    expect(convertAmountToUsd(1510, 'AED')).toBe(411.48);
  });
});
