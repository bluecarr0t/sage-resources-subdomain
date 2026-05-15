import type {
  MarketReportMapPin,
  MarketReportMeta,
  MarketReportSections,
} from '@/lib/market-report/types';

export const SAGE_AI_MARKET_REPORT_BOOTSTRAP_STORAGE_KEY = 'sage_ai_market_report_bootstrap_v1';

/** Query flag on `/admin/sage-ai` — session payload is read once then removed. */
export const SAGE_AI_FROM_MARKET_REPORT_SEARCH_PARAM = 'fromMarketReport';
export const SAGE_AI_FROM_MARKET_REPORT_SEARCH_VALUE = '1';

export type SageAiMarketReportBootstrapPayload = {
  v: 1;
  /** ISO timestamp when the analyst left the market report page */
  savedAt: string;
  meta: MarketReportMeta;
  sections: MarketReportSections;
  mapPins: MarketReportMapPin[];
  /** Set when pins were dropped to satisfy `sessionStorage` quota */
  mapPinsOmittedDueToSize?: boolean;
};

/**
 * Persist a generated market report for the Sage AI client to pick up on navigation.
 * On `QuotaExceededError`, retries once with `mapPins` cleared (cohort tables remain in `sections`).
 */
export function writeSageAiMarketReportBootstrap(input: {
  meta: MarketReportMeta;
  sections: MarketReportSections;
  mapPins: MarketReportMapPin[];
}): { ok: true } | { ok: false; reason: 'quota' | 'no_window' } {
  if (typeof window === 'undefined') return { ok: false, reason: 'no_window' };

  const base: SageAiMarketReportBootstrapPayload = {
    v: 1,
    savedAt: new Date().toISOString(),
    meta: input.meta,
    sections: input.sections,
    mapPins: input.mapPins,
  };

  const tryWrite = (payload: SageAiMarketReportBootstrapPayload): boolean => {
    try {
      sessionStorage.setItem(SAGE_AI_MARKET_REPORT_BOOTSTRAP_STORAGE_KEY, JSON.stringify(payload));
      return true;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') return false;
      throw e;
    }
  };

  try {
    if (tryWrite(base)) return { ok: true };
    const trimmed: SageAiMarketReportBootstrapPayload = {
      ...base,
      mapPins: [],
      mapPinsOmittedDueToSize: true,
    };
    if (tryWrite(trimmed)) return { ok: true };
    return { ok: false, reason: 'quota' };
  } catch {
    return { ok: false, reason: 'quota' };
  }
}

/** Parse and remove the bootstrap blob (one-shot). */
export function readAndConsumeSageAiMarketReportBootstrap(): SageAiMarketReportBootstrapPayload | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(SAGE_AI_MARKET_REPORT_BOOTSTRAP_STORAGE_KEY);
  if (raw == null || raw === '') return null;
  try {
    const o = JSON.parse(raw) as unknown;
    if (!o || typeof o !== 'object') return null;
    const rec = o as Record<string, unknown>;
    if (rec.v !== 1 || rec.meta == null || rec.sections == null) return null;
    sessionStorage.removeItem(SAGE_AI_MARKET_REPORT_BOOTSTRAP_STORAGE_KEY);
    return o as SageAiMarketReportBootstrapPayload;
  } catch {
    sessionStorage.removeItem(SAGE_AI_MARKET_REPORT_BOOTSTRAP_STORAGE_KEY);
    return null;
  }
}
