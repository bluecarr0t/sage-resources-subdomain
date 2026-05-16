'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MarketReportMapPin, MarketReportMeta, MarketReportSections } from '@/lib/market-report/types';
import type { MarketReportInsightsState } from '@/components/admin/market-report/MarketSummaryRedesigned';

type ApiSuccess = {
  success: true;
  meta: MarketReportMeta;
  sections: MarketReportSections;
  mapPins: MarketReportMapPin[];
};

type ApiError = { success: false; message?: string; code?: string; error?: string };

function errorMessageFromApi(
  t: (key: string, values?: Record<string, string | number>) => string,
  json: ApiError,
): string {
  const fallbackMsg = json.message ?? json.error;
  switch (json.code) {
    case 'GEOCODE_FAILED':
      return t('errors.geocodeFailed');
    case 'RV_STATE_REQUIRED':
      return t('errors.rvStateRequired');
    case 'INVALID_JSON':
      return t('errors.invalidJson');
    case 'INVALID_BODY':
      return t('errors.invalidBody');
    case 'RATE_LIMITED':
      return t('errors.rateLimited');
    case 'INTERNAL_ERROR':
      return json.message ?? t('errors.reportGenerationFailed');
    default:
      return fallbackMsg ?? t('errorGeneric');
  }
}

export interface UseMarketReportRunArgs {
  scope: 'local' | 'national';
  addressLine: string;
  radiusMiles: number;
  segment: 'glamping' | 'rv_resort';
  adrMin: string;
  adrMax: string;
  minSiteUnitCount: number;
  t: (key: string, values?: Record<string, string | number>) => string;
}

export function useMarketReportRun({
  scope,
  addressLine,
  radiusMiles,
  segment,
  adrMin,
  adrMax,
  minSiteUnitCount,
  t,
}: UseMarketReportRunArgs) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiSuccess | null>(null);
  const [lastReportServerMs, setLastReportServerMs] = useState<number | null>(null);
  const [insights, setInsights] = useState<MarketReportInsightsState>({
    status: 'idle',
    bullets: [],
    model: null,
    tokensUsed: null,
    cached: false,
  });
  const reportFetchAbortRef = useRef<AbortController | null>(null);
  const insightsFetchAbortRef = useRef<AbortController | null>(null);

  const parseAdr = useCallback((s: string): number | null => {
    const trimmed = s.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }, []);

  const fetchInsights = useCallback(
    async (
      ok: ApiSuccess,
      options: { noCache?: boolean; signal?: AbortSignal } = {},
    ) => {
      const inventoryRows =
        ok.sections.marketSummary.inventoryRowCount ?? ok.meta.propertyCount ?? 0;
      if (inventoryRows === 0) {
        setInsights({ status: 'empty', bullets: [], model: null, tokensUsed: null, cached: false });
        return;
      }
      setInsights({ status: 'loading', bullets: [], model: null, tokensUsed: null, cached: false });
      try {
        const res = await fetch('/api/admin/market-report/insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          signal: options.signal,
          body: JSON.stringify({
            segment,
            scope: ok.meta.scope ?? scope,
            addressLine: ok.meta.addressLine,
            radiusMiles: ok.meta.radiusMiles ?? 0,
            adrMin: ok.meta.adrMin ?? null,
            adrMax: ok.meta.adrMax ?? null,
            minSiteUnitCount: ok.meta.minSiteUnitCount ?? minSiteUnitCount,
            summary: ok.sections.marketSummary,
            noCache: options.noCache ?? false,
          }),
        });
        if (options.signal?.aborted) return;
        if (!res.ok) {
          const failedKind = res.status === 429 ? 'rate_limit' : 'generic';
          setInsights({
            status: 'failed',
            bullets: [],
            model: null,
            tokensUsed: null,
            cached: false,
            failedKind,
          });
          return;
        }
        let json: {
          success: boolean;
          bullets?: string[];
          model?: string | null;
          cached?: boolean;
          tokensUsed?: number | null;
        };
        try {
          json = await res.json();
        } catch {
          setInsights({
            status: 'failed',
            bullets: [],
            model: null,
            tokensUsed: null,
            cached: false,
            failedKind: 'generic',
          });
          return;
        }
        if (options.signal?.aborted) return;
        if (!json || typeof json !== 'object' || !json.success) {
          setInsights({
            status: 'failed',
            bullets: [],
            model: null,
            tokensUsed: null,
            cached: false,
            failedKind: 'generic',
          });
          return;
        }
        const bullets = Array.isArray(json.bullets) ? json.bullets : [];
        const tokensRaw = json.tokensUsed;
        const tokensUsed =
          typeof tokensRaw === 'number' && Number.isFinite(tokensRaw) && tokensRaw > 0
            ? Math.round(tokensRaw)
            : null;
        setInsights({
          status: bullets.length > 0 ? 'ready' : 'empty',
          bullets,
          model: json.model ?? null,
          tokensUsed,
          cached: !!json.cached,
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (err instanceof Error && err.name === 'AbortError') return;
        if (options.signal?.aborted) return;
        setInsights({
          status: 'failed',
          bullets: [],
          model: null,
          tokensUsed: null,
          cached: false,
          failedKind: 'generic',
        });
      }
    },
    [segment, scope, minSiteUnitCount],
  );

  const runReport = useCallback(
    async (options: { noCache?: boolean } = {}): Promise<ApiSuccess | null> => {
      reportFetchAbortRef.current?.abort();
      insightsFetchAbortRef.current?.abort();
      const reportAc = new AbortController();
      reportFetchAbortRef.current = reportAc;

      setLoading(true);
      setError(null);
      setLastReportServerMs(null);
      setInsights({ status: 'idle', bullets: [], model: null, tokensUsed: null, cached: false });
      try {
        const res = await fetch('/api/admin/market-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          signal: reportAc.signal,
          body: JSON.stringify({
            scope,
            addressLine: addressLine.trim(),
            radiusMiles,
            segment,
            adrMin: parseAdr(adrMin),
            adrMax: parseAdr(adrMax),
            minSiteUnitCount,
            noCache: options.noCache ?? false,
          }),
        });
        if (reportAc.signal.aborted) return null;

        const responseText = await res.text();
        let json: ApiSuccess | ApiError;
        try {
          const parsed = responseText ? JSON.parse(responseText) : null;
          if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
            setResult(null);
            setLastReportServerMs(null);
            setError(t('errorInvalidResponse', { status: String(res.status) }));
            return null;
          }
          json = parsed as ApiSuccess | ApiError;
        } catch {
          setResult(null);
          setLastReportServerMs(null);
          setError(
            res.ok ? t('errorGeneric') : t('errorInvalidResponse', { status: String(res.status) }),
          );
          return null;
        }
        if (res.status === 429) {
          setResult(null);
          setLastReportServerMs(null);
          setError(t('errors.rateLimited'));
          return null;
        }
        if (!res.ok || !json.success) {
          const msg = !json.success ? errorMessageFromApi(t, json) : undefined;
          setResult(null);
          setLastReportServerMs(null);
          setError(msg || t('errorGeneric'));
          return null;
        }
        const headerMs = res.headers.get('X-Market-Report-Ms');
        const parsedHeader = headerMs != null ? Number(headerMs) : NaN;
        setLastReportServerMs(Number.isFinite(parsedHeader) ? parsedHeader : null);

        const ok = json as ApiSuccess;
        const normalized: ApiSuccess = {
          ...ok,
          mapPins: ok.mapPins ?? [],
          meta: {
            ...ok.meta,
            mapPinsTotal: ok.meta.mapPinsTotal ?? ok.mapPins?.length ?? 0,
            mapPinsTruncated: ok.meta.mapPinsTruncated ?? false,
            distinctListingCount:
              ok.meta.distinctListingCount ?? ok.sections.marketSummary.distinctListingCount,
          },
        };
        setResult(normalized);
        const insightsAc = new AbortController();
        insightsFetchAbortRef.current = insightsAc;
        void fetchInsights(normalized, { noCache: options.noCache, signal: insightsAc.signal });
        return normalized;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return null;
        if (err instanceof Error && err.name === 'AbortError') return null;
        setResult(null);
        setLastReportServerMs(null);
        setError(t('errorGeneric'));
        return null;
      } finally {
        if (!reportAc.signal.aborted) {
          setLoading(false);
        }
      }
    },
    [scope, addressLine, radiusMiles, segment, adrMin, adrMax, minSiteUnitCount, t, parseAdr, fetchInsights],
  );

  const retryInsights = useCallback(() => {
    if (!result) return;
    insightsFetchAbortRef.current?.abort();
    const insightsAc = new AbortController();
    insightsFetchAbortRef.current = insightsAc;
    void fetchInsights(result, { noCache: true, signal: insightsAc.signal });
  }, [result, fetchInsights]);

  useEffect(() => {
    return () => {
      reportFetchAbortRef.current?.abort();
      insightsFetchAbortRef.current?.abort();
    };
  }, []);

  return {
    loading,
    error,
    result,
    setError,
    insights,
    lastReportServerMs,
    runReport,
    retryInsights,
  };
}
