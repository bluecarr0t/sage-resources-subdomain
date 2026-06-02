/**
 * Derive overview ARDR year fields from Sage `rate_unit_rates_by_year`.
 *
 * The table has no `avg_retail_daily_rate_2024` column. Legacy rows store a prior
 * snapshot under the JSON key "2025" (migration from old seasonal columns); current
 * research uses "2026" synced into `rate_avg_retail_daily_rate`. There are zero rows
 * with a literal "2024" key today.
 */

function parseRateUnitRatesRoot(value: unknown): Record<string, unknown> | null {
  if (value == null) return null;
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }
  return null;
}

function parseSeasonRateNumeric(value: unknown): number | null {
  if (value == null || value === '') return null;
  const s = String(value).trim().toLowerCase();
  if (s === 'closed' || s === 'n/a' || s === 'na') return null;
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  if (n == null || Number.isNaN(n) || n <= 0) return null;
  return n;
}

/** Mean of non-null seasonal weekday/weekend rates for one calendar year bucket. */
export function avgRetailDailyRateFromRateYearBucket(
  rates: Record<string, unknown>,
  year: string
): number | null {
  const yearData = rates[year];
  if (yearData == null || typeof yearData !== 'object' || Array.isArray(yearData)) {
    return null;
  }
  const yd = yearData as Record<string, unknown>;
  const values: number[] = [];
  for (const season of ['winter', 'spring', 'summer', 'fall'] as const) {
    const sd = yd[season];
    if (sd == null || typeof sd !== 'object' || Array.isArray(sd)) continue;
    const o = sd as Record<string, unknown>;
    for (const day of ['weekday', 'weekend'] as const) {
      const n = parseSeasonRateNumeric(o[day]);
      if (n != null) values.push(n);
    }
  }
  if (values.length === 0) return null;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.round(avg * 100) / 100;
}

function toOverviewField(val: unknown): string | null {
  if (val == null || val === '') return null;
  return String(val);
}

export type SageRetailRateFieldsOptions = {
  /**
   * When true, legacy JSON (year "2025" only) may populate `avg_retail_daily_rate_2025`
   * from `rate_avg_retail_daily_rate` or the 2025 bucket — for state ADR choropleth only.
   * YoY charts should omit this so 2025 stays empty on legacy rows.
   */
  choropleth2025?: boolean;
};

/**
 * Map Sage DB row → overview `avg_retail_daily_rate_2024` / `_2025` strings.
 * Avoids counting legacy-only "2025" JSON rows on both YoY series unless `choropleth2025`.
 */
export function sageRetailRateFieldsForOverview(
  row: Record<string, unknown>,
  options?: SageRetailRateFieldsOptions
): {
  avg_retail_daily_rate_2025: string | null;
  avg_retail_daily_rate_2024: string | null;
} {
  const choropleth2025 = options?.choropleth2025 === true;
  const ruby = parseRateUnitRatesRoot(row.rate_unit_rates_by_year);
  const maxYear =
    ruby == null
      ? null
      : Math.max(
          ...Object.keys(ruby)
            .filter((k) => /^\d{4}$/.test(k))
            .map((k) => Number(k))
            .filter((n) => !Number.isNaN(n))
        );
  const has2026 = ruby != null && ruby['2026'] != null;
  const has2025 = ruby != null && ruby['2025'] != null;
  const legacy2025Only = has2025 && !has2026;

  let avg_retail_daily_rate_2024 = toOverviewField(row.avg_retail_daily_rate_2024);
  if (!avg_retail_daily_rate_2024 && ruby) {
    if (ruby['2024'] != null) {
      const v = avgRetailDailyRateFromRateYearBucket(ruby, '2024');
      if (v != null) avg_retail_daily_rate_2024 = String(v);
    } else if (legacy2025Only) {
      const v = avgRetailDailyRateFromRateYearBucket(ruby, '2025');
      if (v != null) avg_retail_daily_rate_2024 = String(v);
    }
  }

  const explicitCurrent =
    row.avg_retail_daily_rate_2025 ?? row.rate_avg_retail_daily_rate ?? row.rate_avg;

  let avg_retail_daily_rate_2025: string | null = null;
  if (!legacy2025Only && explicitCurrent != null && explicitCurrent !== '') {
    avg_retail_daily_rate_2025 = toOverviewField(explicitCurrent);
  }
  if (
    !legacy2025Only &&
    !avg_retail_daily_rate_2025 &&
    ruby &&
    maxYear != null &&
    Number.isFinite(maxYear)
  ) {
    const v = avgRetailDailyRateFromRateYearBucket(ruby, String(maxYear));
    if (v != null) avg_retail_daily_rate_2025 = String(v);
  }

  if (choropleth2025 && !avg_retail_daily_rate_2025) {
    if (explicitCurrent != null && explicitCurrent !== '') {
      avg_retail_daily_rate_2025 = toOverviewField(explicitCurrent);
    } else if (ruby && legacy2025Only) {
      const v = avgRetailDailyRateFromRateYearBucket(ruby, '2025');
      if (v != null) avg_retail_daily_rate_2025 = String(v);
    }
  }

  return { avg_retail_daily_rate_2024, avg_retail_daily_rate_2025 };
}

/** Wide row for state ADR choropleth — fills 2025 on legacy Sage rows without affecting YoY folds. */
export function wideRowForGlampingStateAdrChoropleth<T extends { avg_retail_daily_rate_2025: string | null }>(
  row: T,
  raw: Record<string, unknown>
): T {
  const mapRates = sageRetailRateFieldsForOverview(raw, { choropleth2025: true });
  return {
    ...row,
    avg_retail_daily_rate_2025:
      mapRates.avg_retail_daily_rate_2025 ?? row.avg_retail_daily_rate_2025,
  };
}
