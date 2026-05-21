/**
 * Normalize glamping nightly rate columns to USD before persisting to
 * `all_glamping_properties`. Preserves original currency amounts in
 * `rate_unit_rates_by_year` metadata when conversion runs.
 */

/** ISO 4217 code → USD per 1 unit of foreign currency (fixed reference rates). */
export const FX_TO_USD_MULTIPLIER: Readonly<Record<string, number>> = {
  USD: 1,
  EUR: 1.1,
  GBP: 1.27,
  AED: 0.2725,
  AUD: 0.65,
  CAD: 0.72,
  NZD: 0.6,
  CHF: 1.12,
  JPY: 0.0067,
  IDR: 0.000063,
  THB: 0.029,
  MXN: 0.05,
  INR: 0.012,
  BRL: 0.2,
  ZAR: 0.055,
};

/** Documented alongside enrich migrations (AED/3.67, AUD×0.65, etc.). */
export const FX_REFERENCE_DATE = '2026-05-21';

export const GLAMPING_DAILY_RATE_COLUMNS = [
  'rate_avg_retail_daily_rate',
  'rate_winter_weekday',
  'rate_winter_weekend',
  'rate_spring_weekday',
  'rate_spring_weekend',
  'rate_summer_weekday',
  'rate_summer_weekend',
  'rate_fall_weekday',
  'rate_fall_weekend',
] as const;

export type GlampingDailyRateColumn = (typeof GLAMPING_DAILY_RATE_COLUMNS)[number];

const FOREIGN_AMOUNT_KEY_SUFFIXES: ReadonlyArray<{ suffix: string; currency: string }> = [
  { suffix: '_eur', currency: 'EUR' },
  { suffix: '_aed', currency: 'AED' },
  { suffix: '_aud', currency: 'AUD' },
  { suffix: '_cad', currency: 'CAD' },
  { suffix: '_gbp', currency: 'GBP' },
  { suffix: '_nzd', currency: 'NZD' },
  { suffix: '_chf', currency: 'CHF' },
  { suffix: '_idr', currency: 'IDR' },
  { suffix: '_thb', currency: 'THB' },
  { suffix: '_mxn', currency: 'MXN' },
  { suffix: '_inr', currency: 'INR' },
];

const EXPLICIT_USD_JSON_KEYS = new Set([
  'from_rate_usd',
  'nightly_usd',
  'nightly_base_usd',
  'total_usd',
  'package_total_usd',
  'usd_approx_lowest',
  'usd_approx_full_board',
  'usd_approx_everyday',
  'usd_approx_fully_flex',
  'afar_from_rate_usd',
  'portfolio_from_rate_usd',
]);

function roundUsd(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function convertAmountToUsd(amount: number, currency: string): number {
  const code = currency.trim().toUpperCase();
  const mult = FX_TO_USD_MULTIPLIER[code];
  if (mult == null) {
    throw new Error(`Unsupported currency for USD conversion: ${currency}`);
  }
  return roundUsd(amount * mult);
}

function parseRateJson(value: unknown): Record<string, unknown> | null {
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

function currencyFromKey(key: string): string | null {
  const lower = key.toLowerCase();
  for (const { suffix, currency } of FOREIGN_AMOUNT_KEY_SUFFIXES) {
    if (lower.endsWith(suffix) || lower === `from_rate${suffix}`) {
      return currency;
    }
  }
  if (lower.includes('_usd') || lower.endsWith('_usd')) return 'USD';
  return null;
}

function walkDetectCurrency(node: unknown, found: Set<string>): void {
  if (node == null || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) walkDetectCurrency(item, found);
    return;
  }
  const obj = node as Record<string, unknown>;
  if (typeof obj.currency === 'string') {
    const c = obj.currency.trim().toUpperCase();
    if (c && c !== 'USD') found.add(c);
  }
  if (typeof obj.currency_requested === 'string') {
    const c = obj.currency_requested.trim().toUpperCase();
    if (c && c !== 'USD') found.add(c);
  }
  for (const [key, val] of Object.entries(obj)) {
    const fromKey = currencyFromKey(key);
    if (fromKey && fromKey !== 'USD') found.add(fromKey);
    if (val != null && typeof val === 'object') walkDetectCurrency(val, found);
  }
}

/** True when JSON already stores USD nightly figures (usd_approx_*, *_usd, etc.). */
export function rateJsonIndicatesUsdNumericColumns(json: unknown): boolean {
  const root = parseRateJson(json);
  if (!root) return false;
  let hasUsdHint = false;
  const walk = (node: unknown): void => {
    if (node == null || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    const obj = node as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
      if (EXPLICIT_USD_JSON_KEYS.has(key) || key.startsWith('usd_approx_')) {
        hasUsdHint = true;
      }
      const val = obj[key];
      if (val != null && typeof val === 'object') walk(val);
    }
  };
  walk(root);
  return hasUsdHint;
}

function rateJsonAlreadyConvertedToUsd(json: unknown): boolean {
  const root = parseRateJson(json);
  if (!root) return false;
  let found = false;
  const walk = (node: unknown): void => {
    if (node == null || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    const obj = node as Record<string, unknown>;
    if (
      obj.currency === 'USD' &&
      typeof obj.source_currency === 'string' &&
      obj.source_currency !== 'USD'
    ) {
      found = true;
    }
    for (const val of Object.values(obj)) {
      if (val != null && typeof val === 'object') walk(val);
    }
  };
  walk(root);
  return found;
}

export function detectSourceCurrencyFromRow(row: Record<string, unknown>): string | null {
  const explicit =
    typeof row.source_currency === 'string'
      ? row.source_currency.trim().toUpperCase()
      : null;
  if (explicit && explicit !== 'USD') return explicit;

  const found = new Set<string>();
  walkDetectCurrency(row.rate_unit_rates_by_year, found);
  if (found.size === 1) return [...found][0];
  if (found.size > 1) {
    // Prefer EUR/AED/AUD when multiple foreign keys appear in one blob
    for (const code of ['EUR', 'AED', 'AUD', 'CAD', 'GBP']) {
      if (found.has(code)) return code;
    }
    return [...found][0];
  }
  return null;
}

function convertForeignAmountKeysInJson(
  node: unknown,
  multiplier: number,
  meta: { sourceCurrency: string }
): unknown {
  if (node == null || typeof node !== 'object') return node;
  if (Array.isArray(node)) {
    return node.map((item) => convertForeignAmountKeysInJson(item, multiplier, meta));
  }
  const obj = { ...(node as Record<string, unknown>) };
  for (const [key, val] of Object.entries(obj)) {
    const keyCurrency = currencyFromKey(key);
    if (
      keyCurrency &&
      keyCurrency === meta.sourceCurrency &&
      typeof val === 'number' &&
      Number.isFinite(val)
    ) {
      const usdKey = key.replace(new RegExp(`${meta.sourceCurrency}$`, 'i'), 'usd').replace(
        /_eur$/i,
        '_usd'
      );
      const resolvedUsdKey =
        usdKey !== key
          ? usdKey
          : key.endsWith('_eur')
            ? `${key.slice(0, -4)}_usd`
            : `${key}_usd`;
      if (!(resolvedUsdKey in obj)) {
        obj[resolvedUsdKey] = roundUsd(val * multiplier);
      }
    } else if (val != null && typeof val === 'object') {
      obj[key] = convertForeignAmountKeysInJson(val, multiplier, meta);
    }
  }
  if (typeof obj.currency === 'string' && obj.currency.toUpperCase() === meta.sourceCurrency) {
    obj.source_currency = meta.sourceCurrency;
    obj.currency = 'USD';
    obj.fx_reference_date = FX_REFERENCE_DATE;
    obj.fx_to_usd_multiplier = multiplier;
  }
  return obj;
}

export type ApplyGlampingRatesToUsdResult = {
  row: Record<string, unknown>;
  converted: boolean;
  sourceCurrency: string | null;
};

/**
 * Mutates a copy of `row`: converts daily rate columns from `sourceCurrency` to USD
 * when needed. Skips conversion when currency is USD, unknown, or JSON already
 * documents USD approximations for numeric columns.
 */
export function applyGlampingRatesToUsd(
  row: Record<string, unknown>,
  options?: { forceCurrency?: string }
): ApplyGlampingRatesToUsdResult {
  const out = { ...row };
  const sourceCurrency = (
    options?.forceCurrency?.trim().toUpperCase() ??
    detectSourceCurrencyFromRow(out) ??
    'USD'
  );

  if (sourceCurrency === 'USD') {
    return { row: out, converted: false, sourceCurrency: 'USD' };
  }

  if (rateJsonAlreadyConvertedToUsd(out.rate_unit_rates_by_year)) {
    return { row: out, converted: false, sourceCurrency: 'USD' };
  }

  if (rateJsonIndicatesUsdNumericColumns(out.rate_unit_rates_by_year)) {
    return { row: out, converted: false, sourceCurrency };
  }

  const multiplier = FX_TO_USD_MULTIPLIER[sourceCurrency];
  if (multiplier == null) {
    return { row: out, converted: false, sourceCurrency };
  }

  let converted = false;
  for (const col of GLAMPING_DAILY_RATE_COLUMNS) {
    const raw = out[col];
    if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
      out[col] = convertAmountToUsd(raw, sourceCurrency);
      converted = true;
    } else if (typeof raw === 'string' && raw.trim() !== '') {
      const n = Number(raw.replace(/[$,\s]/g, ''));
      if (Number.isFinite(n) && n > 0) {
        out[col] = convertAmountToUsd(n, sourceCurrency);
        converted = true;
      }
    }
  }

  const jsonRoot = parseRateJson(out.rate_unit_rates_by_year);
  if (jsonRoot) {
    out.rate_unit_rates_by_year = convertForeignAmountKeysInJson(jsonRoot, multiplier, {
      sourceCurrency,
    });
    if (!converted) {
      // JSON-only foreign amounts (no numeric columns set)
      converted = true;
    }
  } else if (converted) {
    out.rate_unit_rates_by_year = {
      fx_reference_date: FX_REFERENCE_DATE,
      source_currency: sourceCurrency,
      currency: 'USD',
      fx_to_usd_multiplier: multiplier,
    };
  }

  return { row: out, converted, sourceCurrency };
}
