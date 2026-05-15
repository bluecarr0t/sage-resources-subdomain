'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useFormatter, useTranslations } from 'next-intl';
import { ChevronDown, ChevronRight, Loader2, MessageSquare, Presentation } from 'lucide-react';
import CompsV2AddressPlaceInput from '@/components/CompsV2AddressPlaceInput';
import { GoogleMapsProvider } from '@/components/GoogleMapsProvider';
import { MarketReportMapPreview } from '@/components/admin/market-report/MarketReportMapPreview';
import { Button } from '@/components/ui';
import {
  adminBodyMuted,
  adminEyebrow,
  adminPageDescription,
  adminPageHeadingMargin,
  adminPageTitle,
  adminSurface,
} from '@/lib/admin-ui';
import type {
  MarketReportFetchMeta,
  MarketReportMapPin,
  MarketReportMeta,
  MarketReportSections,
  MarketReportSegment,
  MarketReportSourceBreakdownRow,
} from '@/lib/market-report/types';

import {
  formatCurrency,
  formatOccupancyPct,
  humanLabel,
} from '@/lib/market-report/format-labels';
import { formatCountyGdpThousands } from '@/lib/market-report/format-county-gdp';
import {
  resolveMarketInsightsModelLabel,
  type MarketInsightsModelLabelResolution,
} from '@/lib/market-report/insights-model-label';
import { unitTypePillSurfaceClasses } from '@/lib/market-report/unit-type-pill-styles';
import { groupPropertySample } from '@/lib/market-report/group-property-sample';
import { downloadMarketReportPdfFromElement } from '@/lib/market-report/download-market-report-pdf';
import { resolveUsStateAbbr } from '@/lib/us-state-centers';
import {
  SAGE_AI_FROM_MARKET_REPORT_SEARCH_PARAM,
  SAGE_AI_FROM_MARKET_REPORT_SEARCH_VALUE,
  writeSageAiMarketReportBootstrap,
} from '@/lib/sage-ai/market-report-bootstrap';

import './market-report-print.css';

function MarketReportChartSkeleton() {
  const t = useTranslations('admin.marketReport');
  return (
    <div
      className="flex h-[260px] w-full items-center justify-center rounded-lg border border-dashed border-neutral-200 bg-neutral-50/50 text-xs text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900/30 dark:text-neutral-400"
      role="status"
      aria-live="polite"
    >
      {t('chartLoading')}
    </div>
  );
}

const SeasonalRatesChart = dynamic(
  () =>
    import('@/components/admin/market-report/SeasonalRatesChart').then((m) => m.SeasonalRatesChart),
  { ssr: false, loading: () => <MarketReportChartSkeleton /> },
);

const UnitTypeRateCountChart = dynamic(
  () =>
    import('@/components/admin/market-report/UnitTypeRateCountChart').then((m) => m.UnitTypeRateCountChart),
  { ssr: false, loading: () => <MarketReportChartSkeleton /> },
);

const UnitTypeRateDumbbellChart = dynamic(
  () =>
    import('@/components/admin/market-report/UnitTypeRateDumbbellChart').then(
      (m) => m.UnitTypeRateDumbbellChart,
    ),
  { ssr: false, loading: () => <MarketReportChartSkeleton /> },
);

/** US full name or mixed case → USPS abbreviation; otherwise unchanged (e.g. provinces). */
function formatMarketReportStateCell(state: string | null | undefined): string {
  const s = (state ?? '').trim();
  if (!s) return '—';
  return resolveUsStateAbbr(s) ?? s;
}

/**
 * Returns the URL only when it parses as http(s) — guards against unsafe
 * schemes (e.g. `javascript:`) leaking into anchor `href` attributes.
 */
function sanitizeHttpUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.toString();
    return null;
  } catch {
    return null;
  }
}

type ApiSuccess = {
  success: true;
  meta: MarketReportMeta;
  sections: MarketReportSections;
  mapPins: MarketReportMapPin[];
};

type ApiError = { success: false; message?: string; code?: string; error?: string };

type InsightsState = {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'failed';
  bullets: string[];
  model: string | null;
  tokensUsed: number | null;
  cached: boolean;
  failedKind?: 'rate_limit' | 'generic';
};

function parseContentDispositionFilename(header: string | null, fallback: string): string {
  if (!header?.trim()) return fallback;
  const star = /filename\*=(?:UTF-8''|)([^;\n]+)/i.exec(header);
  if (star?.[1]) {
    const raw = star[1].trim().replace(/^"+|"+$/g, '');
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  const quoted = /filename="((?:\\.|[^"\\])*)"/i.exec(header);
  if (quoted?.[1]) return quoted[1].replace(/\\(.)/g, '$1');
  const bare = /filename=([^;\n]+)/i.exec(header);
  if (bare?.[1]) return bare[1].trim().replace(/^["']|["']$/g, '');
  return fallback;
}

function errorMessageFromApi(t: (key: string) => string, json: ApiError): string {
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

export default function MarketReportPage() {
  return (
    <GoogleMapsProvider>
      <MarketReportPageInner />
    </GoogleMapsProvider>
  );
}

function MarketReportPageInner() {
  const t = useTranslations('admin.marketReport');
  const tSidebar = useTranslations('admin.sidebar');
  const format = useFormatter();
  const router = useRouter();
  const [addressLine, setAddressLine] = useState('');
  const [radiusMiles, setRadiusMiles] = useState(50);
  const [segment, setSegment] = useState<'glamping' | 'rv_resort'>('glamping');
  const [scope, setScope] = useState<'local' | 'national'>('local');
  const [adrMin, setAdrMin] = useState<string>('');
  const [adrMax, setAdrMax] = useState<string>('');
  const [minSiteUnitCount, setMinSiteUnitCount] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [pdfExportBusy, setPdfExportBusy] = useState(false);
  const [rawExportOpen, setRawExportOpen] = useState(false);
  const [rawExportBusy, setRawExportBusy] = useState(false);
  const rawExportRef = useRef<HTMLDivElement>(null);
  const [presenterMode, setPresenterMode] = useState(false);
  const [result, setResult] = useState<ApiSuccess | null>(null);
  const [lastReportServerMs, setLastReportServerMs] = useState<number | null>(null);
  const [insights, setInsights] = useState<InsightsState>({
    status: 'idle',
    bullets: [],
    model: null,
    tokensUsed: null,
    cached: false,
  });
  const reportFetchAbortRef = useRef<AbortController | null>(null);
  const insightsFetchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setMinSiteUnitCount(segment === 'rv_resort' ? 30 : 3);
  }, [segment]);

  // One row per property in the Property Analysis table, with all observed
  // unit_types collapsed into a single cell. Recomputes only when the report
  // payload changes.
  const groupedPropertyRows = useMemo(
    () => (result ? groupPropertySample(result.sections.propertyAnalysis.sample) : []),
    [result]
  );

  useEffect(() => {
    const onBefore = () => document.documentElement.classList.add('market-report-print-mode');
    const onAfter = () => document.documentElement.classList.remove('market-report-print-mode');
    window.addEventListener('beforeprint', onBefore);
    window.addEventListener('afterprint', onAfter);
    return () => {
      window.removeEventListener('beforeprint', onBefore);
      window.removeEventListener('afterprint', onAfter);
      document.documentElement.classList.remove('market-report-print-mode');
    };
  }, []);

  useEffect(() => {
    if (!rawExportOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (rawExportRef.current?.contains(e.target as Node)) return;
      setRawExportOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setRawExportOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [rawExportOpen]);

  useEffect(() => {
    return () => {
      reportFetchAbortRef.current?.abort();
      insightsFetchAbortRef.current?.abort();
    };
  }, []);

  const parseAdr = (s: string): number | null => {
    const trimmed = s.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };

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
    async (options: { noCache?: boolean } = {}) => {
      reportFetchAbortRef.current?.abort();
      insightsFetchAbortRef.current?.abort();
      const reportAc = new AbortController();
      reportFetchAbortRef.current = reportAc;

      setLoading(true);
      setError(null);
      setExportError(null);
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
        if (reportAc.signal.aborted) return;

        const responseText = await res.text();
        let json: ApiSuccess | ApiError;
        try {
          const parsed = responseText ? JSON.parse(responseText) : null;
          if (
            parsed == null ||
            typeof parsed !== 'object' ||
            Array.isArray(parsed)
          ) {
            setResult(null);
            setLastReportServerMs(null);
            setError(t('errorInvalidResponse', { status: String(res.status) }));
            return;
          }
          json = parsed as ApiSuccess | ApiError;
        } catch {
          setResult(null);
          setLastReportServerMs(null);
          setError(
            res.ok
              ? t('errorGeneric')
              : t('errorInvalidResponse', { status: String(res.status) }),
          );
          return;
        }
        if (res.status === 429) {
          setResult(null);
          setLastReportServerMs(null);
          setError(t('errors.rateLimited'));
          return;
        }
        if (!res.ok || !json.success) {
          const msg = !json.success ? errorMessageFromApi(t, json) : undefined;
          setResult(null);
          setLastReportServerMs(null);
          setError(msg || t('errorGeneric'));
          return;
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
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (err instanceof Error && err.name === 'AbortError') return;
        setResult(null);
        setLastReportServerMs(null);
        setError(t('errorGeneric'));
      } finally {
        if (!reportAc.signal.aborted) {
          setLoading(false);
        }
      }
    },
    [scope, addressLine, radiusMiles, segment, adrMin, adrMax, minSiteUnitCount, t, fetchInsights],
  );

  const retryInsights = useCallback(() => {
    if (!result) return;
    insightsFetchAbortRef.current?.abort();
    const insightsAc = new AbortController();
    insightsFetchAbortRef.current = insightsAc;
    void fetchInsights(result, { noCache: true, signal: insightsAc.signal });
  }, [result, fetchInsights]);

  const fmtNum = (n: number | null | undefined, opts?: { maximumFractionDigits?: number }) =>
    n == null || Number.isNaN(n) ? '—' : format.number(n, opts ?? { maximumFractionDigits: 1 });

  const downloadBlob = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, []);

  const slugifyFilename = useCallback(
    (address: string) =>
      address
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 48) || 'market-report',
    []
  );

  const cohortExportJsonBody = useCallback((meta: MarketReportMeta) => {
    const sc = meta.scope ?? 'local';
    const radiusMiles =
      sc === 'national'
        ? 50
        : Math.max(1, Math.min(250, Math.round(meta.radiusMiles > 0 ? meta.radiusMiles : 50)));
    return {
      scope: sc,
      addressLine: sc === 'national' ? '' : meta.addressLine,
      radiusMiles,
      segment: meta.segment,
      adrMin: meta.adrMin ?? null,
      adrMax: meta.adrMax ?? null,
      minSiteUnitCount: meta.minSiteUnitCount,
      wide: true,
    };
  }, []);

  const downloadCohortExport = useCallback(
    async (format: 'csv' | 'xlsx') => {
      if (!result) return;
      setExportError(null);
      setRawExportOpen(false);
      setRawExportBusy(true);
      try {
        const url =
          format === 'csv'
            ? '/api/admin/market-report/cohort-csv'
            : '/api/admin/market-report/cohort-xlsx';
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(cohortExportJsonBody(result.meta)),
        });
        if (!res.ok) {
          let msg = t('exportRawDataError');
          try {
            const j = (await res.json()) as { message?: string };
            if (typeof j.message === 'string' && j.message.trim()) msg = j.message.trim();
          } catch {
            /* ignore */
          }
          setExportError(msg);
          return;
        }
        const blob = await res.blob();
        const ext = format === 'csv' ? 'csv' : 'xlsx';
        const fallback = `cohort-${slugifyFilename(result.meta.addressLine)}.${ext}`;
        const filename = parseContentDispositionFilename(
          res.headers.get('Content-Disposition'),
          fallback
        );
        downloadBlob(blob, filename);
      } catch {
        setExportError(t('exportRawDataError'));
      } finally {
        setRawExportBusy(false);
      }
    },
    [result, t, downloadBlob, slugifyFilename, cohortExportJsonBody]
  );

  const startAiConvoWithReport = useCallback(() => {
    if (!result) return;
    setExportError(null);
    const w = writeSageAiMarketReportBootstrap({
      meta: result.meta,
      sections: result.sections,
      mapPins: result.mapPins,
    });
    if (!w.ok) {
      setExportError(t('startAiConvoTooLarge'));
      return;
    }
    const q = new URLSearchParams();
    q.set(SAGE_AI_FROM_MARKET_REPORT_SEARCH_PARAM, SAGE_AI_FROM_MARKET_REPORT_SEARCH_VALUE);
    router.push(`/admin/sage-ai?${q.toString()}`);
  }, [result, router, t]);

  const onDownloadPdf = useCallback(async () => {
    if (!result) return;
    const el = document.getElementById('market-report-print-root');
    if (!el) return;
    setExportError(null);
    setPdfExportBusy(true);
    const prevPresenter = presenterMode;
    const root = document.documentElement;
    const hadDark = root.classList.contains('dark');
    try {
      flushSync(() => {
        setPresenterMode(true);
      });
      if (hadDark) root.classList.remove('dark');
      root.classList.add('market-report-pdf-capture');
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      await new Promise((r) => setTimeout(r, 220));
      const day = result.meta.generatedAt.slice(0, 10);
      const filename = `sage-market-report-${slugifyFilename(result.meta.addressLine)}-${day}.pdf`;
      await downloadMarketReportPdfFromElement({ element: el, filename });
    } catch {
      setExportError(t('exportPdfError'));
    } finally {
      root.classList.remove('market-report-pdf-capture');
      if (hadDark) root.classList.add('dark');
      flushSync(() => {
        setPresenterMode(prevPresenter);
      });
      setPdfExportBusy(false);
    }
  }, [result, presenterMode, t, slugifyFilename]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 market-report-page">
      <header className={adminPageHeadingMargin}>
        <p className={`${adminEyebrow} mb-1`}>{tSidebar('tools')}</p>
        <h1 className={adminPageTitle}>{t('title')}</h1>
        <p className={adminPageDescription}>{t('subtitle')}</p>
      </header>

      <div
        className={`market-report-no-print ${adminSurface} max-w-5xl rounded-xl px-5 py-5 sm:px-6 sm:py-6 mb-6`}
      >
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-12">
          <FieldGroup label={t('scopeLabel')} className="md:col-span-6">
            <SegmentedControl
              ariaLabel={t('scopeLabel')}
              name="market-report-scope"
              value={scope}
              onChange={setScope}
              options={[
                { value: 'local', label: t('scopeLocal') },
                { value: 'national', label: t('scopeNational') },
              ]}
            />
          </FieldGroup>

          <FieldGroup label={t('segmentLabel')} className="md:col-span-6">
            <SegmentedControl
              ariaLabel={t('segmentLabel')}
              name="market-report-segment"
              value={segment}
              onChange={setSegment}
              options={[
                { value: 'glamping', label: t('segmentGlamping') },
                { value: 'rv_resort', label: t('segmentRvResort') },
              ]}
            />
          </FieldGroup>

          {scope === 'local' ? (
            <div className="md:col-span-6 [&_label]:!mb-1.5 [&_label]:!text-[11px] [&_label]:!font-semibold [&_label]:!uppercase [&_label]:!tracking-wide [&_label]:!text-neutral-500 dark:[&_label]:!text-neutral-400">
              <CompsV2AddressPlaceInput
                id="mr-address"
                label={t('addressLabel')}
                value={addressLine}
                onChange={setAddressLine}
                placeholder={t('addressPlaceholder')}
                loadingHint={t('placesAutocompleteLoading')}
                noApiKeyHint={t('placesNoApiKeyHint')}
                loadErrorHint={t('placesLoadErrorHint')}
                suggestionsHint={t('placesSuggestionsHint')}
              />
            </div>
          ) : null}

          {scope === 'local' ? (
            <FieldGroup label={t('radiusLabel')} className="md:col-span-3">
              <div className="relative">
                <input
                  id="mr-radius"
                  type="number"
                  min={1}
                  max={250}
                  value={radiusMiles}
                  onChange={(e) => setRadiusMiles(Number(e.target.value) || 1)}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 pr-10 text-sm tabular-nums shadow-sm focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:border-neutral-700 dark:bg-neutral-950 dark:focus:border-neutral-500"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-neutral-400">
                  mi
                </span>
              </div>
            </FieldGroup>
          ) : null}

          {scope === 'local' ? (
            <div
              className="hidden md:block md:col-span-3"
              aria-hidden
            />
          ) : null}

          <div className="flex w-full flex-col gap-y-5 md:col-span-12 md:flex-row md:flex-wrap md:items-start md:gap-x-6">
            <FieldGroup
              label={t('adrRangeLabel')}
              hint={t('adrRangeHint')}
              className="min-w-0 w-full md:max-w-[22rem]"
            >
              <div className="flex items-center gap-2">
                <div className="relative w-full max-w-[8.5rem]">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs text-neutral-400">
                    $
                  </span>
                  <input
                    id="mr-adr-min"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={50000}
                    value={adrMin}
                    onChange={(e) => setAdrMin(e.target.value)}
                    placeholder={t('adrMinPlaceholder')}
                    aria-label={t('adrMinPlaceholder')}
                    className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-6 pr-3 text-sm tabular-nums shadow-sm focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:border-neutral-700 dark:bg-neutral-950 dark:focus:border-neutral-500"
                  />
                </div>
                <span className="text-neutral-400" aria-hidden>
                  –
                </span>
                <div className="relative w-full max-w-[8.5rem]">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs text-neutral-400">
                    $
                  </span>
                  <input
                    id="mr-adr-max"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={50000}
                    value={adrMax}
                    onChange={(e) => setAdrMax(e.target.value)}
                    placeholder={t('adrMaxPlaceholder')}
                    aria-label={t('adrMaxPlaceholder')}
                    className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-6 pr-3 text-sm tabular-nums shadow-sm focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:border-neutral-700 dark:bg-neutral-950 dark:focus:border-neutral-500"
                  />
                </div>
              </div>
            </FieldGroup>

            <FieldGroup
              label={t('minSiteUnitLabel')}
              hint={t('minSiteUnitHint')}
              className="w-full shrink-0 min-w-0 md:w-auto"
              labelClassName="md:whitespace-nowrap"
            >
              <div className="max-w-[7.5rem]">
                <input
                  id="mr-min-site-unit"
                  type="number"
                  min={0}
                  max={100_000}
                  step={1}
                  value={minSiteUnitCount}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      setMinSiteUnitCount(0);
                      return;
                    }
                    const n = Number(raw);
                    if (!Number.isFinite(n)) return;
                    setMinSiteUnitCount(Math.max(0, Math.min(100_000, Math.floor(n))));
                  }}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm tabular-nums shadow-sm focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:border-neutral-700 dark:bg-neutral-950 dark:focus:border-neutral-500"
                  aria-label={t('minSiteUnitLabel')}
                />
              </div>
            </FieldGroup>
          </div>
        </div>

        {scope === 'national' ? (
          <p className="mt-2 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
            {t('scopeNationalHint')}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-4 dark:border-neutral-800">
          {loading ? (
            <p className="sr-only" role="status">
              {t('statusReportLoading')}
            </p>
          ) : null}
          <Button
            type="button"
            onClick={() => runReport()}
            disabled={loading || (scope === 'local' && !addressLine.trim())}
            aria-busy={loading}
            className="inline-flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                <span className="whitespace-nowrap">{t('generating')}</span>
              </>
            ) : (
              t('generate')
            )}
          </Button>
          <button
            type="button"
            onClick={() => runReport({ noCache: true })}
            disabled={loading || (scope === 'local' && !addressLine.trim())}
            className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            title={t('forceRefreshTooltip')}
          >
            {t('forceRefresh')}
          </button>
          {error ? (
            <p className="ml-auto text-sm text-red-600 dark:text-red-400" role="alert" aria-live="assertive">
              {error}
            </p>
          ) : null}
          {exportError ? (
            <p className="ml-auto text-sm text-red-600 dark:text-red-400" role="alert" aria-live="assertive">
              {exportError}
            </p>
          ) : null}
        </div>
        {result && lastReportServerMs != null ? (
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            {t('reportServerTiming', {
              seconds: format.number(lastReportServerMs / 1000, { maximumFractionDigits: 1 }),
            })}
          </p>
        ) : null}
      </div>

      {!result && !loading && !error ? <p className={adminBodyMuted}>{t('emptyState')}</p> : null}

      {result ? (
        <>
          <div className="market-report-no-print mb-4 flex max-w-5xl flex-wrap gap-2 items-center">
            <button
              type="button"
              role="switch"
              aria-checked={presenterMode}
              aria-label={presenterMode ? t('presenterModeOn') : t('presenterModeOff')}
              title={t('presenterModeTooltip')}
              disabled={pdfExportBusy}
              onClick={() => setPresenterMode((v) => !v)}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors ${
                presenterMode
                  ? 'border-amber-500 bg-amber-400 text-neutral-900 shadow-sm shadow-amber-500/30 hover:bg-amber-300 dark:border-amber-400 dark:bg-amber-400 dark:text-neutral-900'
                  : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-900/60'
              }`}
            >
              <Presentation className="h-4 w-4" aria-hidden />
            </button>
            <Button
              type="button"
              variant="secondary"
              disabled={pdfExportBusy}
              className="inline-flex items-center gap-2"
              onClick={() => void onDownloadPdf()}
            >
              {pdfExportBusy ? (
                <>
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                  {t('exportPdfLoading')}
                </>
              ) : (
                t('exportPrint')
              )}
            </Button>
            <div className="relative" ref={rawExportRef}>
              <Button
                type="button"
                variant="secondary"
                disabled={rawExportBusy || pdfExportBusy}
                aria-haspopup="menu"
                aria-expanded={rawExportOpen}
                aria-controls="market-report-raw-export-menu"
                id="market-report-raw-export-trigger"
                title={t('exportRawDataMenuAria')}
                className="inline-flex items-center gap-1.5"
                onClick={() => setRawExportOpen((o) => !o)}
              >
                {rawExportBusy ? (
                  <>
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                    {t('exportRawDataLoading')}
                  </>
                ) : (
                  <>
                    {t('exportRawData')}
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                  </>
                )}
              </Button>
              {rawExportOpen ? (
                <div
                  id="market-report-raw-export-menu"
                  role="menu"
                  aria-labelledby="market-report-raw-export-trigger"
                  className="absolute left-0 top-full z-20 mt-1 min-w-[11rem] rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
                >
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center px-3 py-2 text-left text-sm text-neutral-800 hover:bg-neutral-50 dark:text-neutral-100 dark:hover:bg-neutral-800"
                    onClick={() => void downloadCohortExport('csv')}
                  >
                    {t('exportRawDataCsv')}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center px-3 py-2 text-left text-sm text-neutral-800 hover:bg-neutral-50 dark:text-neutral-100 dark:hover:bg-neutral-800"
                    onClick={() => void downloadCohortExport('xlsx')}
                  >
                    {t('exportRawDataXlsx')}
                  </button>
                </div>
              ) : null}
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={rawExportBusy || pdfExportBusy}
              className="inline-flex items-center gap-2"
              title={t('startAiConvoTitle')}
              onClick={() => startAiConvoWithReport()}
            >
              <MessageSquare className="h-4 w-4 shrink-0" aria-hidden />
              {t('startAiConvo')}
            </Button>
          </div>

          <div id="market-report-print-root" className="market-report-print-root space-y-8 max-w-5xl">
          <div
            aria-hidden
            className="market-report-pdf-cover market-report-pdf-keep mb-6 rounded-lg border border-sage-200 bg-gradient-to-r from-sage-50 to-white px-5 py-4 shadow-sm"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sage-700">
              {t('pdfCoverBrand')}
            </p>
            <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-sage-900">{t('title')}</h2>
            <p className="mt-0.5 text-sm text-neutral-800">
              {result.meta.scope === 'national' ? t('scopeNational') : result.meta.addressLine}
            </p>
            <p className="mt-2 text-xs text-neutral-500">
              {format.dateTime(new Date(result.meta.generatedAt), { dateStyle: 'long' })}
            </p>
          </div>
          <MetaBlock
            t={t}
            meta={result.meta}
            marketSummary={result.sections.marketSummary}
            format={format}
            presenterMode={presenterMode}
          />

          {result.meta.scope !== 'national' ? (
            <SectionCard title={t('sectionMapPreview')}>
              <MarketReportMapPreview
                anchorLat={result.meta.anchorLat}
                anchorLng={result.meta.anchorLng}
                radiusMiles={result.meta.radiusMiles}
                mapPins={result.mapPins}
                mapPinsTotal={result.meta.mapPinsTotal}
                mapPinsTruncated={result.meta.mapPinsTruncated}
                presenterMode={presenterMode}
              />
            </SectionCard>
          ) : null}

          {result.meta.fetchPossiblyIncomplete ? (
            <div
              role="status"
              className="rounded-md border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-800/80 dark:bg-amber-950/40 dark:text-amber-100 max-w-5xl"
            >
              {t('fetchCapWarning')}
            </div>
          ) : null}

          {result.meta.propertyCount === 0 ? (
            <p className={adminBodyMuted}>{t('noPropertiesInRadius')}</p>
          ) : (
            <>
              <SectionCard title={t('sectionMarketSummary')} pdfKeepHeading>
                <MarketSummaryRedesigned
                  t={t}
                  format={format}
                  marketSummary={result.sections.marketSummary}
                  rateAnalysis={result.sections.rateAnalysis}
                  scope={result.meta.scope ?? 'local'}
                  insights={insights}
                  presenterMode={presenterMode}
                  onRetryInsights={retryInsights}
                />
              </SectionCard>

              <SectionCard title={t('sectionPropertyAnalysis')}>
                <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm mb-4">
                  <div>
                    <dt className="text-neutral-500 dark:text-neutral-400">{t('statsMeanSites')}</dt>
                    <dd className="font-medium">{fmtNum(result.sections.propertyAnalysis.meanTotalSites)}</dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500 dark:text-neutral-400">{t('statsMedianSites')}</dt>
                    <dd className="font-medium">{fmtNum(result.sections.propertyAnalysis.medianTotalSites)}</dd>
                  </div>
                </dl>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-200 dark:border-neutral-700 text-left">
                        <th className="py-2 pr-3 font-medium">{t('tableProperty')}</th>
                        {!presenterMode ? (
                          <th className="py-2 pr-3 font-medium">{t('tableSource')}</th>
                        ) : null}
                        <th className="py-2 pr-3 font-medium">{t('tableCity')}</th>
                        <th className="py-2 pr-3 font-medium">{t('tableState')}</th>
                        {result.meta.scope !== 'national' ? (
                          <th className="py-2 pr-3 font-medium">{t('tableDistanceMi')}</th>
                        ) : null}
                        <th className="py-2 pr-3 font-medium">{t('tableSites')}</th>
                        <th className="py-2 pr-3 font-medium">{t('tableUnitType')}</th>
                        <th className="py-2 pr-3 font-medium">{t('tablePropertyArdr')}</th>
                        <th className="py-2 font-medium">{t('tableWebsite')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedPropertyRows.map((group) => {
                        const row = group.rep;
                        const safeUrl = sanitizeHttpUrl(row.url);
                        const unitTypesForDisplay =
                          group.unitTypes.length > 0
                            ? group.unitTypes
                            : (() => {
                                const u = (row.unit_type ?? '').trim();
                                return u ? [u] : [];
                              })();
                        const unitTypeTitle = unitTypesForDisplay
                          .map((ut) => humanLabel(ut))
                          .join(', ');
                        return (
                          <tr key={group.key} className="border-b border-neutral-100 dark:border-neutral-800 align-top">
                            <td className="py-2 pr-3 max-w-[12rem] truncate" title={row.property_name}>
                              {row.property_name}
                            </td>
                            {!presenterMode ? (
                              <td className="py-2 pr-3 text-neutral-600 dark:text-neutral-400">{row.sourceLabel}</td>
                            ) : null}
                            <td className="py-2 pr-3">{row.city}</td>
                            <td className="py-2 pr-3">{formatMarketReportStateCell(row.state)}</td>
                            {result.meta.scope !== 'national' ? (
                              <td className="py-2 pr-3">{fmtNum(row.distance_miles)}</td>
                            ) : null}
                            <td className="py-2 pr-3 tabular-nums">
                              {group.propertyTotalSites != null
                                ? format.number(group.propertyTotalSites)
                                : '—'}
                            </td>
                            <td className="py-2 pr-3 max-w-[14rem]" title={unitTypeTitle}>
                              {unitTypesForDisplay.length === 0 ? (
                                <span className="text-neutral-400">—</span>
                              ) : (
                                <span className="flex flex-wrap gap-1">
                                  {unitTypesForDisplay.map((canonical) => (
                                    <span
                                      key={`${group.key}-ut-${canonical}`}
                                      className={`inline-block rounded border px-1.5 py-0.5 text-[11px] leading-none ${unitTypePillSurfaceClasses(canonical)}`}
                                    >
                                      {humanLabel(canonical)}
                                    </span>
                                  ))}
                                </span>
                              )}
                            </td>
                            <td className="py-2 pr-3 tabular-nums">
                              {formatCurrency(group.avgRetailDailyRate)}
                            </td>
                            <td className="py-2">
                              {safeUrl ? (
                                <a
                                  href={safeUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline dark:text-blue-400"
                                  title={safeUrl}
                                >
                                  {t('tableWebsiteVisit')} ↗
                                </a>
                              ) : (
                                <span className="text-neutral-400">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </SectionCard>

              <SectionCard title={t('sectionRateAnalysis')}>
                <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Stat label={t('ratesCoverage')} value={format.number(result.sections.rateAnalysis.propertiesWithPrimaryRate)} />
                  <Stat label={t('ratesMean')} value={formatCurrency(result.sections.rateAnalysis.meanAdr)} />
                  <Stat label={t('ratesMedian')} value={formatCurrency(result.sections.rateAnalysis.medianAdr)} />
                  <Stat label={t('ratesMin')} value={formatCurrency(result.sections.rateAnalysis.minAdr)} />
                  <Stat label={t('ratesMax')} value={formatCurrency(result.sections.rateAnalysis.maxAdr)} />
                  <Stat label={t('ratesP25')} value={formatCurrency(result.sections.rateAnalysis.p25)} />
                  <Stat label={t('ratesP75')} value={formatCurrency(result.sections.rateAnalysis.p75)} />
                </div>
                {result.sections.rateAnalysis.occupancySummary ? (
                  <div className="mb-5 rounded-md border border-neutral-200/80 bg-neutral-50/60 p-3 dark:border-neutral-700 dark:bg-neutral-900/40">
                    <p className="mb-2 text-sm font-medium text-neutral-800 dark:text-neutral-200">
                      {t('ratesOccupancyHeading')}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <Stat
                        label={t('ratesOccupancyCount')}
                        value={format.number(result.sections.rateAnalysis.occupancySummary.countWithOccupancy)}
                        plain
                      />
                      <Stat
                        label={t('ratesOccupancyMean')}
                        value={formatOccupancyPct(result.sections.rateAnalysis.occupancySummary.meanOccupancy)}
                        plain
                      />
                      <Stat
                        label={t('ratesOccupancyMedian')}
                        value={formatOccupancyPct(result.sections.rateAnalysis.occupancySummary.medianOccupancy)}
                        plain
                      />
                    </div>
                  </div>
                ) : null}
                <p className="mb-2 text-sm font-medium text-neutral-800 dark:text-neutral-200">
                  {t('ratesSeasonalNote')}
                </p>
                <div className="market-report-pdf-keep">
                  <SeasonalRatesChart
                    seasonalAverages={result.sections.rateAnalysis.seasonalAverages}
                    emptyLabel={t('noPropertiesInRadius')}
                  />
                </div>
              </SectionCard>

              <SectionCard title={t('sectionAmenityAnalysis')}>
                {result.sections.amenityAnalysis.mode === 'rv_limited' ? (
                  <p className={adminBodyMuted}>{t('amenitiesLimitedRv')}</p>
                ) : (
                  <>
                    <p className={`${adminBodyMuted} mb-1`}>
                      {t('amenityCohortSize')}: {format.number(result.sections.amenityAnalysis.cohortSize ?? 0)}
                    </p>
                    <p className={`${adminBodyMuted} mb-3`}>{t('amenitiesDenominatorNote')}</p>
                    <p className={`${adminBodyMuted} mb-3`}>{t('amenitiesIntro')}</p>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b border-neutral-200 dark:border-neutral-700 text-left">
                            <th className="py-2 pr-3 font-medium">{t('tableAmenity')}</th>
                            <th className="py-2 pr-3 font-medium">{t('tablePctCohort')}</th>
                            <th className="py-2 pr-3 font-medium">{t('tablePctKnown')}</th>
                            <th className="py-2 pr-3 font-medium">{t('tableKnownCount')}</th>
                            <th className="py-2 font-medium" title={t('tableRateImpactTooltip')}>{t('tableRateImpact')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(result.sections.amenityAnalysis.amenityRates ?? [])
                            .filter((a) => a.withKnownValue >= 10)
                            .map((a) => (
                            <tr key={a.column} className="border-b border-neutral-100 dark:border-neutral-800">
                              <td className="py-2 pr-3">{a.label}</td>
                              <td className="py-2 pr-3">{fmtNum(a.pctOfCohort, { maximumFractionDigits: 1 })}%</td>
                              <td className="py-2 pr-3">{fmtNum(a.pctOfKnown, { maximumFractionDigits: 1 })}%</td>
                              <td className="py-2 pr-3">{format.number(a.withKnownValue)}</td>
                              <td className="py-2">
                                <RateImpactCell
                                  impactUsd={a.rateImpactUsd}
                                  sample={a.rateImpactSampleSize}
                                  t={t}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </SectionCard>

              <SectionCard title={t('sectionSiteUnitAnalysis')}>
                <p className="mb-2 text-sm font-medium text-neutral-800 dark:text-neutral-200">
                  {t('siteUnitChartTitle')}
                </p>
                <div className="mb-5 market-report-pdf-keep">
                  <UnitTypeRateCountChart
                    rows={result.sections.siteUnitAnalysis.topUnitTypes}
                    emptyLabel={t('siteUnitChartEmpty')}
                    ariaLabel={t('siteUnitChartTitle')}
                  />
                </div>
                <p className="mb-2 text-sm font-medium text-neutral-800 dark:text-neutral-200">
                  {t('siteUnitDumbbellTitle')}
                </p>
                <div className="mb-5 market-report-pdf-keep">
                  <UnitTypeRateDumbbellChart
                    rows={result.sections.siteUnitAnalysis.topUnitTypes}
                    emptyLabel={t('siteUnitDumbbellEmpty')}
                    ariaLabel={t('siteUnitDumbbellTitle')}
                    legendMin={t('siteUnitDumbbellLegendMin')}
                    legendAvg={t('siteUnitDumbbellLegendAvg')}
                    legendMax={t('siteUnitDumbbellLegendMax')}
                    valueLabelMin={t('siteUnitDumbbellValueMin')}
                    valueLabelAvg={t('siteUnitDumbbellValueAvg')}
                    valueLabelMax={t('siteUnitDumbbellValueMax')}
                  />
                </div>
                {result.meta.segment !== 'glamping' && result.sections.siteUnitAnalysis.rvFieldPresence?.length ? (
                  <>
                    <p className="mb-2 text-sm font-medium text-neutral-800 dark:text-neutral-200">
                      {t('rvFieldCoverageTitle')}
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {result.sections.siteUnitAnalysis.rvFieldPresence.map((r) => (
                        <div
                          key={r.field}
                          className="flex items-center justify-between rounded-md border border-neutral-200/80 bg-neutral-50/60 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900/40"
                        >
                          <span className="text-neutral-700 dark:text-neutral-300">{humanLabel(r.label)}</span>
                          <span className="tabular-nums font-medium text-neutral-900 dark:text-neutral-100">
                            {fmtNum(r.pct)}%
                            <span className="ml-1 text-xs text-neutral-500 dark:text-neutral-400">
                              ({t('propertiesCount', { count: r.withData })})
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}
              </SectionCard>
            </>
          )}
        </div>
        </>
      ) : null}
    </div>
  );
}

function SectionCard({
  title,
  children,
  pdfKeepHeading = false,
}: {
  title: string;
  children: ReactNode;
  /** Wraps the section title for PDF slicing so html2canvas page cuts do not split the heading. */
  pdfKeepHeading?: boolean;
}) {
  const heading = (
    <h2 className="market-report-section-title mb-4 flex items-center gap-2 border-b border-neutral-200/80 pb-3 text-lg font-semibold tracking-tight text-neutral-900 dark:border-neutral-700 dark:text-neutral-100 sm:text-xl">
      <span aria-hidden className="inline-block h-4 w-1 rounded-sm bg-amber-400" />
      {title}
    </h2>
  );

  return (
    <section
      className={`${adminSurface} p-4 sm:p-5 market-report-section${
        pdfKeepHeading ? ' market-report-pdf-break-before-export' : ''
      }`}
    >
      {pdfKeepHeading ? <div className="market-report-pdf-keep">{heading}</div> : heading}
      {children}
    </section>
  );
}

/** Compact label/value tile used throughout the report sections. */
function Stat({
  label,
  value,
  plain = false,
}: {
  label: string;
  value: string;
  /** Renders without the surrounding card (use inside an already-bordered group). */
  plain?: boolean;
}) {
  const wrapper = plain
    ? 'flex flex-col gap-0.5'
    : 'flex flex-col gap-0.5 rounded-md border border-neutral-200/80 bg-neutral-50/60 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900/40';
  return (
    <div className={wrapper}>
      <span className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {label}
      </span>
      <span className="tabular-nums text-base font-semibold text-neutral-900 dark:text-neutral-100">
        {value}
      </span>
    </div>
  );
}

/**
 * Form field wrapper with a small uppercase label and optional hint. Keeps the
 * Market Report filter card visually consistent with the section stat tiles.
 */
function FieldGroup({
  label,
  hint,
  className = '',
  labelClassName = '',
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  labelClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label
        className={`mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 ${labelClassName}`}
      >
        {label}
      </label>
      {children}
      {hint ? (
        <p className="mt-1.5 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Generic 2-or-more-option segmented pill control. Used in the filter card
 * for Scope and Property Type. Renders as a single rounded container with
 * inline pills and a sliding active state, replacing the previous bordered-radio
 * fieldset. Falls back to a real radio group for accessibility.
 */
function SegmentedControl<T extends string>({
  ariaLabel,
  name,
  value,
  onChange,
  options,
}: {
  ariaLabel: string;
  name: string;
  value: T;
  onChange: (next: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex w-full rounded-lg border border-neutral-300 bg-neutral-200 p-0.5 dark:border-neutral-600 dark:bg-neutral-800 sm:w-auto"
    >
      {options.map((opt) => {
        const checked = opt.value === value;
        return (
          <label
            key={opt.value}
            className={`flex flex-1 cursor-pointer items-center justify-center rounded-md px-3.5 py-1.5 text-sm font-medium transition-all sm:flex-none ${
              checked
                ? 'bg-white text-neutral-900 shadow-sm ring-1 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-100 dark:ring-neutral-700'
                : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
            }`}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={checked}
              onChange={() => onChange(opt.value)}
              className="sr-only"
            />
            {opt.label}
          </label>
        );
      })}
    </div>
  );
}

/**
 * Small inline badge showing whether the response came from the in-memory
 * cache and how stale it is. Hidden in presenter mode.
 */
function CacheFreshnessBadge({
  cache,
  t,
  format,
}: {
  cache: NonNullable<MarketReportMeta['cache']>;
  t: (key: string, values?: Record<string, string | number>) => string;
  format: ReturnType<typeof useFormatter>;
}) {
  if (!cache.cached && !cache.partiallyCached) return null;
  const ageLabel = cache.oldestCachedAt
    ? format.relativeTime(new Date(cache.oldestCachedAt), { now: new Date() })
    : null;
  const label = cache.cached ? t('cacheServedFrom') : t('cachePartial');
  const tooltip = ageLabel
    ? `${label} · ${ageLabel}`
    : label;
  return (
    <span
      className="ml-2 inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200"
      title={tooltip}
    >
      <span aria-hidden>⚡</span>
      {label}
      {ageLabel ? <span className="font-normal text-amber-700 dark:text-amber-300">{ageLabel}</span> : null}
    </span>
  );
}

/**
 * Renders the signed dollar delta between mean ARDR for properties with this
 * amenity and the cohort mean. Color-coded (green/red) with the sample size
 * shown as a small caption so the reader can judge confidence.
 */
function RateImpactCell({
  impactUsd,
  sample,
  t,
}: {
  impactUsd: number | null;
  sample: number;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  if (impactUsd == null) {
    return (
      <span
        className="text-neutral-400"
        title={t('tableRateImpactInsufficient', { n: sample })}
      >
        —
      </span>
    );
  }
  const sign = impactUsd > 0 ? '+' : impactUsd < 0 ? '−' : '';
  const abs = Math.abs(impactUsd);
  const colorClass =
    impactUsd > 0
      ? 'text-emerald-700 dark:text-emerald-400'
      : impactUsd < 0
      ? 'text-rose-700 dark:text-rose-400'
      : 'text-neutral-700 dark:text-neutral-300';
  return (
    <span
      className={`tabular-nums font-medium ${colorClass}`}
      title={`${t('tableRateImpactTooltip')} (n=${sample})`}
    >{`${sign}$${abs}`}</span>
  );
}

function formatInsightsOperatorLabel(
  t: (key: string, values?: Record<string, string | number>) => string,
  res: MarketInsightsModelLabelResolution,
): string {
  if (res.operatorLabelKey === 'insightsModelOtherProviderViaGateway') {
    return t('insightsModelOtherProviderViaGateway', {
      provider: res.otherProvider ?? 'Unknown',
    });
  }
  return t(res.operatorLabelKey);
}

function AiInsightsBlock({
  t,
  format,
  insights,
  presenterMode,
  onRetryInsights,
}: {
  t: (key: string, values?: Record<string, string | number>) => string;
  format: ReturnType<typeof useFormatter>;
  insights: InsightsState;
  presenterMode: boolean;
  onRetryInsights: () => void;
}) {
  const modelLabel = useMemo(() => {
    if (insights.status !== 'ready' || !insights.model) return null;
    return resolveMarketInsightsModelLabel(insights.model);
  }, [insights.status, insights.model]);

  if (insights.status === 'idle' || insights.status === 'empty') return null;
  if (presenterMode && insights.status === 'failed') return null;

  return (
    <section
      aria-labelledby="market-summary-ai-insights"
      className="market-report-pdf-keep rounded-lg border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/60 dark:bg-amber-950/20"
    >
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h3
          id="market-summary-ai-insights"
          className="text-xs font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200"
        >
          {t('summaryAiBulletsTitle')}
        </h3>
        {!presenterMode && insights.status === 'ready' && modelLabel ? (
          <div className="flex max-w-[min(100%,20rem)] flex-col items-end gap-0.5 text-right">
            <p className="text-[10px] leading-snug text-amber-900/75 dark:text-amber-200/75">
              <span>{t('summaryAiBulletsAttributionPrefix')}</span>
              {insights.cached ? (
                <>
                  {' '}
                  · <span className="text-amber-900/60 dark:text-amber-200/60">{t('summaryAiBulletsAttributionCachedBadge')}</span>
                </>
              ) : null}
              {' · '}
              <span
                className="cursor-help border-b border-dotted border-amber-900/35 dark:border-amber-200/35"
                title={t('insightsModelRawIdTooltip', { id: modelLabel.rawModelId })}
              >
                {formatInsightsOperatorLabel(t, modelLabel)}
              </span>
            </p>
            {insights.tokensUsed != null ? (
              <p className="text-[10px] tabular-nums text-amber-900/55 dark:text-amber-200/55">
                {t('summaryAiBulletsTokensUsed', { tokens: format.number(insights.tokensUsed) })}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
      {insights.status === 'loading' ? (
        <div
          className="flex items-center gap-2 text-sm text-amber-900/80 dark:text-amber-200/80"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden />
          <span>{t('summaryAiBulletsLoading')}</span>
        </div>
      ) : null}
      {insights.status === 'failed' ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-amber-950 dark:text-amber-100" role="alert">
            {insights.failedKind === 'rate_limit'
              ? t('summaryAiBulletsFailedRateLimited')
              : t('summaryAiBulletsFailed')}
          </p>
          {!presenterMode ? (
            <Button type="button" variant="secondary" className="shrink-0 self-start sm:self-auto" onClick={onRetryInsights}>
              {t('summaryAiBulletsRetry')}
            </Button>
          ) : null}
        </div>
      ) : null}
      {insights.status === 'ready' ? (
        <>
          <ul className="space-y-1.5 text-sm text-neutral-800 dark:text-neutral-100">
            {insights.bullets.map((b, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden="true" className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[10px] leading-relaxed text-amber-950/65 dark:text-amber-100/60">
            {presenterMode
              ? t('summaryAiBulletsAttributionFootnotePresenter')
              : t('summaryAiBulletsAttributionFootnote')}
          </p>
        </>
      ) : null}
    </section>
  );
}

function MarketSummaryRedesigned({
  t,
  format,
  marketSummary,
  rateAnalysis,
  scope,
  insights,
  presenterMode,
  onRetryInsights,
}: {
  t: (key: string, values?: Record<string, string | number>) => string;
  format: ReturnType<typeof useFormatter>;
  marketSummary: MarketReportSections['marketSummary'];
  rateAnalysis: MarketReportSections['rateAnalysis'];
  scope: 'local' | 'national';
  insights: InsightsState;
  presenterMode: boolean;
  onRetryInsights: () => void;
}) {
  const score = marketSummary.opportunityScore ?? null;
  const drivers = marketSummary.demandDrivers ?? null;
  const county = marketSummary.countyMetrics ?? null;
  const isLocal = scope === 'local';
  const [expandedTopUnitType, setExpandedTopUnitType] = useState<string | null>(null);

  useEffect(() => {
    if (presenterMode) setExpandedTopUnitType(null);
  }, [presenterMode]);

  const toggleTopUnitType = useCallback((unitType: string) => {
    setExpandedTopUnitType((prev) => (prev === unitType ? null : unitType));
  }, []);

  return (
    <div className="space-y-5">
      {isLocal && score ? (
        <OpportunityScoreCard score={score} county={county} t={t} />
      ) : null}

      <AiInsightsBlock
        t={t}
        format={format}
        insights={insights}
        presenterMode={presenterMode}
        onRetryInsights={onRetryInsights}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label={t('summaryStatProperties')}
          value={format.number(marketSummary.distinctListingCount)}
        />
        <Stat
          label={t('summaryStatTotalSites')}
          value={
            marketSummary.totalSites != null ? format.number(marketSummary.totalSites) : '—'
          }
        />
        <Stat
          label={t('summaryStatMeanArdr')}
          value={
            rateAnalysis.meanAdr != null ? formatCurrency(rateAnalysis.meanAdr) : '—'
          }
        />
        <Stat
          label={t('summaryStatMedianArdr')}
          value={
            rateAnalysis.medianAdr != null ? formatCurrency(rateAnalysis.medianAdr) : '—'
          }
        />
      </div>

      {marketSummary.topUnitTypesWithAdr.length > 0 ? (
        <div>
          <div className="overflow-x-auto rounded-md border border-neutral-200 dark:border-neutral-700">
            <table className="w-full min-w-[20rem] border-collapse text-sm">
              <thead className="bg-neutral-50/80 dark:bg-neutral-900/40">
                <tr className="text-left">
                  <th className="px-3 py-2 font-medium text-neutral-600 dark:text-neutral-300">
                    {t('summaryTopUnitTypesColType')}
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-neutral-600 dark:text-neutral-300">
                    {t('summaryTopUnitTypesColCount')}
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-neutral-600 dark:text-neutral-300">
                    {t('summaryTopUnitTypesColUnitCount')}
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-neutral-600 dark:text-neutral-300">
                    {t('summaryTopUnitTypesColMeanAdr')}
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-neutral-600 dark:text-neutral-300">
                    {t('summaryTopUnitTypesColMedianAdr')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {marketSummary.topUnitTypesWithAdr.map((row) => {
                  const expanded = expandedTopUnitType === row.unit_type;
                  const details = row.details ?? [];
                  const hasDetails = details.length > 0;
                  return (
                    <Fragment key={row.unit_type}>
                      <tr
                        className={`border-t border-neutral-200 dark:border-neutral-700 ${
                          hasDetails && !presenterMode
                            ? 'hover:bg-neutral-50/80 dark:hover:bg-neutral-900/50'
                            : ''
                        }`}
                      >
                        <td className="px-3 py-2 text-neutral-900 dark:text-neutral-100">
                          {hasDetails && !presenterMode ? (
                            <button
                              type="button"
                              onClick={() => toggleTopUnitType(row.unit_type)}
                              aria-expanded={expanded}
                              aria-label={
                                expanded
                                  ? t('summaryTopUnitTypesCollapseRow', {
                                      unitType: humanLabel(row.unit_type),
                                    })
                                  : t('summaryTopUnitTypesExpandRow', {
                                      unitType: humanLabel(row.unit_type),
                                    })
                              }
                              className="flex w-full max-w-[min(100%,20rem)] items-center gap-2 rounded-md py-0.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-500"
                            >
                              <ChevronRight
                                className={`h-4 w-4 shrink-0 text-neutral-500 transition-transform dark:text-neutral-400 ${
                                  expanded ? 'rotate-90' : ''
                                }`}
                                aria-hidden
                              />
                              <span
                                className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-medium ${unitTypePillSurfaceClasses(row.unit_type)}`}
                              >
                                {humanLabel(row.unit_type)}
                              </span>
                            </button>
                          ) : (
                            <span
                              className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-medium ${unitTypePillSurfaceClasses(row.unit_type)}`}
                            >
                              {humanLabel(row.unit_type)}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {format.number(row.count)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {row.unitCount != null ? format.number(row.unitCount) : '—'}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {row.meanAdr != null ? formatCurrency(row.meanAdr) : '—'}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {row.medianAdr != null ? formatCurrency(row.medianAdr) : '—'}
                        </td>
                      </tr>
                      {expanded && hasDetails ? (
                        <tr className="border-t border-neutral-100 bg-neutral-50/70 dark:border-neutral-800 dark:bg-neutral-900/35">
                          <td colSpan={5} className="px-3 py-3 align-top">
                            <div className="overflow-x-auto rounded-md border border-neutral-200/80 bg-white dark:border-neutral-700 dark:bg-neutral-950/80">
                              <table className="w-full min-w-[32rem] border-collapse text-xs">
                                <thead className="bg-neutral-50/90 dark:bg-neutral-900/60">
                                  <tr className="text-left text-neutral-600 dark:text-neutral-300">
                                    <th className="px-3 py-2 font-medium">{t('tableProperty')}</th>
                                    <th className="px-3 py-2 font-medium">{t('summaryTopUnitTypesColSiteName')}</th>
                                    <th className="px-3 py-2 font-medium">{t('tableCity')}</th>
                                    <th className="px-3 py-2 font-medium">{t('tableState')}</th>
                                    {!presenterMode ? (
                                      <th className="px-3 py-2 font-medium">{t('tableSource')}</th>
                                    ) : null}
                                    {isLocal ? (
                                      <th className="px-3 py-2 font-medium">{t('tableDistanceMi')}</th>
                                    ) : null}
                                    <th className="px-3 py-2 text-right font-medium">
                                      {t('summaryTopUnitTypesDetailUnits')}
                                    </th>
                                    <th className="px-3 py-2 text-right font-medium">
                                      {t('tablePropertyArdr')}
                                    </th>
                                    <th className="px-3 py-2 font-medium">{t('tableWebsite')}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {details.map((d) => {
                                    const safeUrl = sanitizeHttpUrl(d.url);
                                    return (
                                      <tr
                                        key={d.key}
                                        className="border-t border-neutral-100 dark:border-neutral-800"
                                      >
                                        <td
                                          className="max-w-[11rem] truncate px-3 py-2 font-medium text-neutral-900 dark:text-neutral-100"
                                          title={d.property_name}
                                        >
                                          {d.property_name}
                                        </td>
                                        <td
                                          className="max-w-[10rem] truncate px-3 py-2 text-neutral-800 dark:text-neutral-200"
                                          title={d.site_name ?? undefined}
                                        >
                                          {d.site_name != null && d.site_name.trim() !== ''
                                            ? d.site_name
                                            : '—'}
                                        </td>
                                        <td className="px-3 py-2 text-neutral-800 dark:text-neutral-200">
                                          {d.city}
                                        </td>
                                        <td className="px-3 py-2 text-neutral-800 dark:text-neutral-200">
                                          {formatMarketReportStateCell(d.state)}
                                        </td>
                                        {!presenterMode ? (
                                          <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400">
                                            {d.sourceLabel}
                                          </td>
                                        ) : null}
                                        {isLocal ? (
                                          <td className="px-3 py-2 tabular-nums text-neutral-800 dark:text-neutral-200">
                                            {format.number(d.distance_miles)}
                                          </td>
                                        ) : null}
                                        <td className="px-3 py-2 text-right tabular-nums text-neutral-800 dark:text-neutral-200">
                                          {d.quantity_of_units != null
                                            ? format.number(d.quantity_of_units)
                                            : '—'}
                                        </td>
                                        <td className="px-3 py-2 text-right tabular-nums text-neutral-800 dark:text-neutral-200">
                                          {d.rate_avg != null ? formatCurrency(d.rate_avg) : '—'}
                                        </td>
                                        <td className="px-3 py-2">
                                          {safeUrl ? (
                                            <a
                                              href={safeUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-blue-600 hover:underline dark:text-blue-400"
                                            >
                                              {t('tableWebsiteVisit')} ↗
                                            </a>
                                          ) : (
                                            <span className="text-neutral-400">—</span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                            {row.detailsTruncated ? (
                              <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                                {t('summaryTopUnitTypesTruncated', {
                                  shown: details.length,
                                  total: row.count,
                                })}
                              </p>
                            ) : null}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {isLocal && (drivers || county) ? (
        <DemandDriversBlock t={t} format={format} drivers={drivers} county={county} />
      ) : null}

    </div>
  );
}

function gradeColors(grade: 'A' | 'B' | 'C' | 'D' | 'F'): { ring: string; bg: string; text: string } {
  switch (grade) {
    case 'A':
      return { ring: 'ring-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-300' };
    case 'B':
      return { ring: 'ring-lime-300', bg: 'bg-lime-50 dark:bg-lime-950/30', text: 'text-lime-700 dark:text-lime-300' };
    case 'C':
      return { ring: 'ring-amber-300', bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-300' };
    case 'D':
      return { ring: 'ring-orange-300', bg: 'bg-orange-50 dark:bg-orange-950/30', text: 'text-orange-700 dark:text-orange-300' };
    case 'F':
      return { ring: 'ring-rose-300', bg: 'bg-rose-50 dark:bg-rose-950/30', text: 'text-rose-700 dark:text-rose-300' };
  }
}

function opportunityPillarBarFillClass(available: boolean, points: number, maxPoints: number): string {
  if (!available || maxPoints <= 0) {
    return 'fill-neutral-400 dark:fill-neutral-600';
  }
  const ratio = points / maxPoints;
  if (ratio >= 2 / 3) {
    return 'fill-emerald-600 dark:fill-emerald-500';
  }
  if (ratio >= 1 / 3) {
    return 'fill-amber-500 dark:fill-amber-400';
  }
  return 'fill-rose-600 dark:fill-rose-500';
}

function OpportunityScoreCard({
  score,
  county,
  t,
}: {
  score: NonNullable<MarketReportSections['marketSummary']['opportunityScore']>;
  county: MarketReportSections['marketSummary']['countyMetrics'] | null | undefined;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const colors = gradeColors(score.grade);
  return (
    <div
      className={`market-report-pdf-keep rounded-lg border border-neutral-200 ${colors.bg} p-4 dark:border-neutral-700`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
        <div
          className={`flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-full ring-4 ${colors.ring} bg-white shadow-sm dark:bg-neutral-900`}
        >
          <span className={`text-3xl font-bold tabular-nums ${colors.text}`}>{score.score}</span>
          <span className="text-[10px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {t('opportunityScoreOutOf')}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {t('opportunityScoreLabel')}
            </p>
            <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${colors.text} ${colors.bg}`}>
              {score.grade}
            </span>
            <span
              title={t('opportunityScoreBetaTooltip')}
              className="rounded border border-amber-300/80 bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:border-amber-700/60 dark:bg-neutral-900 dark:text-amber-300"
            >
              {t('opportunityScoreBetaLabel')}
            </span>
          </div>
          <p className="mt-1 text-sm text-neutral-800 dark:text-neutral-200">{score.headline}</p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {score.components.map((c) => (
              <OpportunityComponentBar
                key={c.key}
                component={c}
                county={c.key === 'economy' ? county ?? null : null}
                fillClassName={opportunityPillarBarFillClass(c.available, c.points, c.maxPoints)}
                t={t}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function OpportunityComponentBar({
  component,
  county,
  fillClassName,
  t,
}: {
  component: NonNullable<MarketReportSections['marketSummary']['opportunityScore']>['components'][number];
  county: MarketReportSections['marketSummary']['countyMetrics'] | null;
  fillClassName: string;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const pct =
    !component.available || component.maxPoints === 0
      ? 0
      : Math.round((component.points / component.maxPoints) * 100);
  const showCountyLowConfidence =
    component.key === 'economy' && county != null && county.highConfidence === false;
  const barFillW = component.available ? Math.min(100, Math.max(0, pct)) : 0;

  return (
    <div className="text-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span className="font-medium text-neutral-700 dark:text-neutral-300">{component.label}</span>
            {showCountyLowConfidence ? (
              <span
                title={t('countyMetricsLowConfidenceTooltip')}
                className="inline-flex max-w-full shrink-0 rounded border border-amber-200/90 bg-amber-50/90 px-1 py-px text-[9px] font-semibold uppercase tracking-wide text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/50 dark:text-amber-200"
              >
                {t('countyMetricsLowConfidenceBadge')}
              </span>
            ) : null}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <span className="tabular-nums text-neutral-600 dark:text-neutral-400">
            {component.available ? `${component.points}/${component.maxPoints}` : '—'}
          </span>
          {component.available && component.maxPoints > 0 ? (
            <p className="mt-0.5 text-[10px] tabular-nums text-neutral-500 dark:text-neutral-400">
              {t('opportunityPillarPercentOfMax', { pct })}
            </p>
          ) : null}
        </div>
      </div>
      <div
        className="relative mt-1 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200/80 dark:bg-neutral-800"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={component.available ? pct : 0}
        aria-label={component.label}
      >
        {component.available && barFillW > 0 ? (
          <svg
            className="absolute inset-0 block h-full w-full"
            viewBox="0 0 100 6"
            preserveAspectRatio="none"
            aria-hidden
          >
            <rect x="0" y="0" width={barFillW} height="6" className={fillClassName} />
          </svg>
        ) : null}
      </div>
      <p className="mt-1 leading-snug text-neutral-500 dark:text-neutral-400">{component.detail}</p>
      {component.key === 'premium' && component.available ? (
        <p className="mt-1 leading-snug text-neutral-600 dark:text-neutral-500">
          {t('opportunityPremiumPositioningInterpretation')}
        </p>
      ) : null}
    </div>
  );
}

function DemandDriversBlock({
  t,
  format,
  drivers,
  county,
}: {
  t: (key: string, values?: Record<string, string | number>) => string;
  format: ReturnType<typeof useFormatter>;
  drivers: NonNullable<MarketReportSections['marketSummary']['demandDrivers']> | null;
  county: NonNullable<MarketReportSections['marketSummary']['countyMetrics']> | null;
}) {
  return (
    <div className="market-report-pdf-keep">
      <p className="mb-2 text-sm font-medium text-neutral-800 dark:text-neutral-200">
        {t('summaryDemandDriversTitle')}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {drivers ? (
          <>
            <DriverTile
              label={t('driverNationalParks')}
              count={drivers.nationalParks.count}
              radiusMiles={drivers.nationalParks.radiusMiles}
              top={drivers.nationalParks.top.slice(0, 3).map((p) => p.name)}
              format={format}
              t={t}
            />
            <DriverTile
              label={t('driverSkiResorts')}
              count={drivers.skiResorts.count}
              radiusMiles={drivers.skiResorts.radiusMiles}
              top={drivers.skiResorts.top.slice(0, 3).map((p) => p.name)}
              format={format}
              t={t}
            />
            <DriverTile
              label={t('driverWineries')}
              count={drivers.wineries.count}
              radiusMiles={drivers.wineries.radiusMiles}
              top={drivers.wineries.top.slice(0, 3).map((p) => p.name)}
              format={format}
              t={t}
            />
            <DriverTile
              label={t('driverMajorLargeCities')}
              count={drivers.majorAndLargeCities.count}
              radiusMiles={drivers.majorAndLargeCities.radiusMiles}
              top={drivers.majorAndLargeCities.top.slice(0, 3).map((p) =>
                p.siteType ? `${p.name} · ${p.siteType}` : p.name,
              )}
              format={format}
              t={t}
            />
          </>
        ) : null}
      </div>
      {county ? (
        <div className="mt-3 rounded-md border border-neutral-200 bg-neutral-50/60 p-3 text-sm dark:border-neutral-700 dark:bg-neutral-900/40">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {t('summaryCountyTitle')}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="font-semibold text-neutral-900 dark:text-neutral-100">{county.countyName}</p>
            {!county.highConfidence ? (
              <span
                title={t('countyMetricsLowConfidenceTooltip')}
                className="inline-flex max-w-full items-center rounded-md border border-amber-200/90 bg-amber-50/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/50 dark:text-amber-200"
              >
                {t('countyMetricsLowConfidenceBadge')}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-neutral-700 dark:text-neutral-300">
            {county.population2020 != null
              ? t('countyPopulationLine', {
                  pop: format.number(county.population2020),
                  change:
                    county.populationChangePct != null
                      ? `${county.populationChangePct >= 0 ? '+' : ''}${county.populationChangePct.toFixed(1)}%`
                      : '—',
                })
              : '—'}
          </p>
          <p className="mt-0.5 text-neutral-700 dark:text-neutral-300">
            {county.gdp2023 != null
              ? t('countyGdpLine', {
                  gdp: formatCountyGdpThousands(county.gdp2023),
                  growth:
                    county.gdpGrowthMaaPct != null
                      ? `${county.gdpGrowthMaaPct >= 0 ? '+' : ''}${county.gdpGrowthMaaPct.toFixed(2)}%`
                      : '—',
                })
              : t('countyGdpUnknown')}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function DriverTile({
  label,
  count,
  radiusMiles,
  top,
  format,
  t,
}: {
  label: string;
  count: number;
  radiusMiles: number;
  top: string[];
  format: ReturnType<typeof useFormatter>;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  return (
    <div className="rounded-md border border-neutral-200 bg-neutral-50/60 p-3 text-sm dark:border-neutral-700 dark:bg-neutral-900/40">
      <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
        {format.number(count)}
      </p>
      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
        {t('driverWithinRadius', { miles: format.number(radiusMiles) })}
      </p>
      {top.length > 0 ? (
        <ul className="mt-1.5 space-y-0.5 text-xs text-neutral-700 dark:text-neutral-300">
          {top.map((name, i) => (
            <li key={`${i}-${name}`} className="truncate">
              · {name}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function fetchPartnerMessageKey(source: keyof MarketReportFetchMeta): string {
  switch (source) {
    case 'glamping':
      return 'fetchPartnerGlamping';
    case 'roverpass':
      return 'fetchPartnerRoverpass';
    case 'campspot':
      return 'fetchPartnerCampspot';
    case 'hipcamp':
      return 'fetchPartnerHipcamp';
    default: {
      const _exhaustive: never = source;
      return _exhaustive;
    }
  }
}

function MarketReportFetchHealth({
  fetch: fetchMeta,
  t,
  format,
}: {
  fetch: NonNullable<MarketReportMeta['fetch']>;
  t: (key: string, values?: Record<string, string | number>) => string;
  format: ReturnType<typeof useFormatter>;
}) {
  const ordered: (keyof MarketReportFetchMeta)[] = ['glamping', 'roverpass', 'campspot', 'hipcamp'];
  const lines: ReactNode[] = [];
  for (const key of ordered) {
    const slice = fetchMeta[key];
    if (!slice) continue;
    lines.push(
      <li key={key}>
        {t('fetchSliceLine', {
          partner: t(fetchPartnerMessageKey(key)),
          candidates: format.number(slice.candidatesInBBox),
          chunks: format.number(slice.chunksUsed),
          capped: slice.hitRowCap ? t('fetchHitCapSuffix') : '',
        })}
      </li>,
    );
  }
  if (lines.length === 0) return null;
  return (
    <div className="mt-2 rounded-md border border-neutral-200 bg-neutral-50/80 p-2 text-xs dark:border-neutral-700 dark:bg-neutral-900/40">
      <p className="font-medium text-neutral-700 dark:text-neutral-200">{t('fetchHealthTitle')}</p>
      <ul className="mt-1 list-inside list-disc space-y-0.5 text-neutral-600 dark:text-neutral-400">{lines}</ul>
    </div>
  );
}

function MetaBlock({
  t,
  meta,
  marketSummary,
  format,
  presenterMode = false,
}: {
  t: (key: string, values?: Record<string, string | number>) => string;
  meta: MarketReportMeta;
  marketSummary: MarketReportSections['marketSummary'];
  format: ReturnType<typeof useFormatter>;
  presenterMode?: boolean;
}) {
  const when = format.dateTime(new Date(meta.generatedAt), { dateStyle: 'medium', timeStyle: 'short' });
  const showSourceTable = !presenterMode && marketSummary.sourceBreakdown.length > 0;

  const isNational = meta.scope === 'national';
  const adrRangeLine = (() => {
    if (meta.adrMin == null && meta.adrMax == null) return null;
    const lo = meta.adrMin != null ? `$${format.number(meta.adrMin)}` : '$0';
    const hi = meta.adrMax != null ? `$${format.number(meta.adrMax)}` : '∞';
    return `${lo} – ${hi}`;
  })();

  return (
    <div className={`${adminSurface} p-4 text-sm space-y-1 market-report-pdf-keep`}>
      {!isNational ? (
        <p>
          <span className="text-neutral-500 dark:text-neutral-400">{t('metaAnchor')}: </span>
          <span className="font-medium text-neutral-900 dark:text-neutral-100">{meta.addressLine}</span>
        </p>
      ) : null}
      {!isNational ? (
        <p>
          <span className="text-neutral-500 dark:text-neutral-400">{t('metaRadius')}: </span>
          <span className="font-medium">{format.number(meta.radiusMiles)} mi</span>
        </p>
      ) : (
        <p>
          <span className="text-neutral-500 dark:text-neutral-400">{t('scopeLabel')}: </span>
          <span className="font-medium">{t('scopeNational')}</span>
        </p>
      )}
      <p>
        <span className="text-neutral-500 dark:text-neutral-400">{t('metaSegment')}: </span>
        <span className="font-medium">{meta.segment === 'glamping' ? t('segmentGlamping') : t('segmentRvResort')}</span>
      </p>
      {meta.minSiteUnitCount != null && meta.minSiteUnitCount > 0 ? (
        <p>
          <span className="text-neutral-500 dark:text-neutral-400">{t('metaMinSiteUnit')}: </span>
          <span className="font-medium">{format.number(meta.minSiteUnitCount)}</span>
        </p>
      ) : null}
      {adrRangeLine ? (
        <p>
          <span className="text-neutral-500 dark:text-neutral-400">{t('adrRangeLabel')}: </span>
          <span className="font-medium">{adrRangeLine}</span>
        </p>
      ) : null}
      <p>
        <span className="text-neutral-500 dark:text-neutral-400">{t('metaGeneratedAt')}: </span>
        <span className="font-medium">{when}</span>
        {!presenterMode && meta.cache && (meta.cache.cached || meta.cache.partiallyCached) ? (
          <CacheFreshnessBadge cache={meta.cache} t={t} format={format} />
        ) : null}
      </p>
      {!presenterMode ? (
        <>
          <p>
            <span className="text-neutral-500 dark:text-neutral-400">{t('metaSources')}: </span>
            <span className="font-medium">{meta.sources.join(', ')}</span>
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('metaSourcesHipcampNote')}</p>
          {meta.fetch ? <MarketReportFetchHealth fetch={meta.fetch} t={t} format={format} /> : null}
        </>
      ) : null}

      {showSourceTable ? (
        <div className="mt-3 border-t border-neutral-200 pt-3 dark:border-neutral-700">
          <p className="mb-1 text-sm font-medium text-neutral-800 dark:text-neutral-200">{t('dataBySourceTitle')}</p>
          <p className="mb-2 text-xs text-neutral-500 dark:text-neutral-400">{t('dataBySourceIntro')}</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-200 text-left dark:border-neutral-700">
                  <th className="py-1.5 pr-2 font-medium text-neutral-600 dark:text-neutral-300">{t('dataBySourceColSource')}</th>
                  <th className="py-1.5 pr-2 font-medium text-neutral-600 dark:text-neutral-300">{t('dataBySourceColListings')}</th>
                  <th className="py-1.5 pr-2 font-medium text-neutral-600 dark:text-neutral-300">
                    {meta.segment === 'glamping'
                      ? t('dataBySourceColUnits')
                      : t('dataBySourceColSites')}
                  </th>
                  <th className="py-1.5 pr-2 font-medium text-neutral-600 dark:text-neutral-300">{t('dataBySourceColAvgAdr')}</th>
                  <th className="py-1.5 font-medium text-neutral-600 dark:text-neutral-300">{t('dataBySourceColAvgOccupancy')}</th>
                </tr>
              </thead>
              <tbody>
                {marketSummary.sourceBreakdown.map((row) => (
                  <SourceBreakdownRow
                    key={row.source}
                    row={row}
                    segment={meta.segment}
                    t={t}
                    format={format}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatSitesUnitsCell(
  row: MarketReportSourceBreakdownRow,
  segment: MarketReportSegment,
  t: (key: string, values?: Record<string, string | number>) => string,
  format: ReturnType<typeof useFormatter>
): string {
  const { totalSites, totalUnits } = row;
  if (segment === 'glamping') {
    if (totalUnits != null) {
      return t('dataBySourceUnitsOnly', { n: format.number(totalUnits) });
    }
    return t('dataBySourceDash');
  }
  if (totalSites != null) {
    return t('dataBySourceSitesOnly', { n: format.number(totalSites) });
  }
  return t('dataBySourceDash');
}

function SourceBreakdownRow({
  row,
  segment,
  t,
  format,
}: {
  row: MarketReportSourceBreakdownRow;
  segment: MarketReportSegment;
  t: (key: string, values?: Record<string, string | number>) => string;
  format: ReturnType<typeof useFormatter>;
}) {
  const adr =
    row.avgRetailDailyRate != null
      ? format.number(row.avgRetailDailyRate, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
      : t('dataBySourceDash');
  const occ =
    row.avgOccupancy != null
      ? formatOccupancyPct(row.avgOccupancy)
      : t('dataBySourceDash');

  return (
    <tr className="border-b border-neutral-100 dark:border-neutral-800">
      <th scope="row" className="py-1.5 pr-2 text-left font-medium text-neutral-800 dark:text-neutral-200">
        {row.sourceLabel}
      </th>
      <td className="py-1.5 pr-2 tabular-nums">{format.number(row.distinctListingCount)}</td>
      <td className="py-1.5 pr-2">{formatSitesUnitsCell(row, segment, t, format)}</td>
      <td className="py-1.5 pr-2 tabular-nums">{adr}</td>
      <td className="py-1.5 tabular-nums">{occ}</td>
    </tr>
  );
}
