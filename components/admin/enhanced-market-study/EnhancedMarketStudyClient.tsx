'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useFormatter, useTranslations } from 'next-intl';
import { Loader2, Presentation } from 'lucide-react';
import CompsV2AddressPlaceInput from '@/components/CompsV2AddressPlaceInput';
import { MarketReportMapPreview } from '@/components/admin/market-report/MarketReportMapPreview';
import { Stat } from '@/components/admin/market-report/MarketReportStat';
import { MarketSummaryRedesigned } from '@/components/admin/market-report/MarketSummaryRedesigned';
import {
  formatMarketReportStateCell,
  sanitizeHttpUrl,
} from '@/components/admin/market-report/report-table-utils';
import { Button } from '@/components/ui';
import {
  marketReportUrlStateDefaults,
  parseMarketReportUrlState,
  serializeMarketReportUrlState,
  shouldAutoRunFromUrlState,
  urlHasStudyParams,
  type MarketReportUrlState,
} from '@/lib/admin/market-report-url-state';
import { useMarketReportRun } from '@/lib/admin/use-market-report-run';
import {
  adminBodyMuted,
  adminEyebrow,
  adminPageDescription,
  adminPageHeadingMargin,
  adminPageTitle,
  adminSurface,
} from '@/lib/admin-ui';
import {
  formatCurrency,
  formatOccupancyPct,
  humanLabel,
} from '@/lib/market-report/format-labels';
import { groupPropertySample } from '@/lib/market-report/group-property-sample';
import type {
  MarketReportFetchMeta,
  MarketReportMeta,
  MarketReportSections,
} from '@/lib/market-report/types';
import { unitTypePillSurfaceClasses } from '@/lib/market-report/unit-type-pill-styles';

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

function StudySection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={`${adminSurface} scroll-mt-24 p-4 sm:p-5`}
      aria-labelledby={`${id}-heading`}
    >
      <h2
        id={`${id}-heading`}
        className="mb-4 flex items-center gap-2 border-b border-neutral-200/80 pb-3 text-lg font-semibold tracking-tight text-neutral-900 dark:border-neutral-700 dark:text-neutral-100 sm:text-xl"
      >
        <span aria-hidden className="inline-block h-4 w-1 rounded-sm bg-amber-400" />
        {title}
      </h2>
      {children}
    </section>
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

function StudyMethodologySummary({
  meta,
  marketSummary,
}: {
  meta: MarketReportMeta;
  marketSummary: MarketReportSections['marketSummary'];
}) {
  const t = useTranslations('admin.marketReport');
  const format = useFormatter();
  const when = format.dateTime(new Date(meta.generatedAt), { dateStyle: 'medium', timeStyle: 'short' });
  const ordered: (keyof MarketReportFetchMeta)[] = ['glamping', 'roverpass', 'campspot', 'hipcamp'];

  return (
    <div className={`${adminSurface} space-y-2 p-4 text-sm`}>
      <p>
        <span className="text-neutral-500 dark:text-neutral-400">{t('metaGeneratedAt')}: </span>
        <span className="font-medium text-neutral-900 dark:text-neutral-100">{when}</span>
      </p>
      <p>
        <span className="text-neutral-500 dark:text-neutral-400">{t('metaSources')}: </span>
        <span className="font-medium">{meta.sources.join(', ')}</span>
      </p>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('metaSourcesHipcampNote')}</p>
      {meta.fetch ? (
        <div className="mt-2 rounded-md border border-neutral-200 bg-neutral-50/80 p-2 text-xs dark:border-neutral-700 dark:bg-neutral-900/40">
          <p className="font-medium text-neutral-700 dark:text-neutral-200">{t('fetchHealthTitle')}</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-neutral-600 dark:text-neutral-400">
            {ordered.map((key) => {
              const slice = meta.fetch?.[key];
              if (!slice) return null;
              return (
                <li key={key}>
                  {t('fetchSliceLine', {
                    partner: t(fetchPartnerMessageKey(key)),
                    candidates: format.number(slice.candidatesInBBox),
                    chunks: format.number(slice.chunksUsed),
                    capped: slice.hitRowCap ? t('fetchHitCapSuffix') : '',
                  })}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      {marketSummary.sourceBreakdown.length > 0 ? (
        <p className="text-xs text-neutral-600 dark:text-neutral-400">
          {t('dataBySourceTitle')}: {marketSummary.sourceBreakdown.map((r) => r.sourceLabel).join(', ')}.
        </p>
      ) : null}
    </div>
  );
}

function FieldGroup({
  label,
  hint,
  className = '',
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {label}
      </label>
      {children}
      {hint ? (
        <p className="mt-1.5 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">{hint}</p>
      ) : null}
    </div>
  );
}

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
      <span className="text-neutral-400" title={t('tableRateImpactInsufficient', { n: sample })}>
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

export function EnhancedMarketStudyClient() {
  const t = useTranslations('admin.marketReport');
  const tStudy = useTranslations('admin.enhancedMarketStudy');
  const tSidebar = useTranslations('admin.sidebar');
  const format = useFormatter();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [draft, setDraft] = useState<MarketReportUrlState>(marketReportUrlStateDefaults);

  useLayoutEffect(() => {
    setDraft(parseMarketReportUrlState(searchParams));
  }, [searchParams]);

  const { loading, error, result, insights, lastReportServerMs, runReport, retryInsights } =
    useMarketReportRun({
      scope: draft.scope,
      addressLine: draft.addressLine,
      radiusMiles: draft.radiusMiles,
      segment: draft.segment,
      adrMin: draft.adrMin,
      adrMax: draft.adrMax,
      minSiteUnitCount: draft.minSiteUnitCount,
      t,
    });

  const pushUrl = useCallback(
    (next: MarketReportUrlState) => {
      const q = serializeMarketReportUrlState(next).toString();
      if (q !== searchParams.toString()) {
        router.replace(`${pathname}?${q}`, { scroll: false });
      }
    },
    [pathname, router, searchParams],
  );

  const autoRunHydratedRef = useRef(false);
  useEffect(() => {
    if (autoRunHydratedRef.current) return;
    autoRunHydratedRef.current = true;
    if (!urlHasStudyParams(searchParams)) return;
    const parsed = parseMarketReportUrlState(searchParams);
    if (!shouldAutoRunFromUrlState(parsed)) return;
    void (async () => {
      const ok = await runReport();
      if (ok) {
        pushUrl({
          ...parsed,
          addressLine: ok.meta.addressLine || parsed.addressLine,
        });
      }
    })();
  }, [runReport, searchParams, pushUrl]);

  const groupedPropertyRows = useMemo(
    () => (result ? groupPropertySample(result.sections.propertyAnalysis.sample) : []),
    [result],
  );

  const fmtNum = (n: number | null | undefined, opts?: { maximumFractionDigits?: number }) =>
    n == null || Number.isNaN(n) ? '—' : format.number(n, opts ?? { maximumFractionDigits: 1 });

  const runAndSyncUrl = useCallback(async () => {
    const ok = await runReport();
    if (ok) {
      const next: MarketReportUrlState = {
        ...draft,
        addressLine: ok.meta.addressLine || draft.addressLine,
      };
      setDraft(next);
      pushUrl(next);
    }
  }, [draft, pushUrl, runReport]);

  const runFreshAndSyncUrl = useCallback(async () => {
    const ok = await runReport({ noCache: true });
    if (ok) {
      const next: MarketReportUrlState = {
        ...draft,
        addressLine: ok.meta.addressLine || draft.addressLine,
      };
      setDraft(next);
      pushUrl(next);
    }
  }, [draft, pushUrl, runReport]);

  const tocItems = useMemo(
    () => [
      { id: 'study-summary', label: tStudy('tocSummary') },
      { id: 'study-map', label: tStudy('tocMap') },
      { id: 'study-property', label: tStudy('tocProperty') },
      { id: 'study-rates', label: tStudy('tocRates') },
      { id: 'study-amenities', label: tStudy('tocAmenities') },
      { id: 'study-units', label: tStudy('tocUnits') },
      { id: 'study-methodology', label: tStudy('tocMethodology') },
    ],
    [tStudy],
  );

  const [linkCopied, setLinkCopied] = useState(false);
  const copyShareLink = useCallback(() => {
    const q = serializeMarketReportUrlState(draft).toString();
    const url = `${window.location.origin}${pathname}?${q}`;
    void navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2000);
    });
  }, [draft, pathname]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className={adminPageHeadingMargin}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={`${adminEyebrow} mb-1`}>{tSidebar('tools')}</p>
            <h1 className={adminPageTitle}>{tStudy('title')}</h1>
            <p className={adminPageDescription}>{tStudy('subtitle')}</p>
            <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">{tStudy('phase2Note')}</p>
          </div>
          <span className="shrink-0 rounded-full border border-amber-200/90 bg-amber-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/50 dark:text-amber-200">
            {tStudy('studyMvpBadge')}
          </span>
        </div>
        <p className="mt-3 text-sm">
          <Link
            href="/admin/market-report"
            className="text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
          >
            {t('openClassicMarketReport')}
          </Link>
        </p>
      </header>

      <div className={`${adminSurface} mb-6 max-w-6xl rounded-xl px-5 py-5 sm:px-6 sm:py-6`}>
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-12">
          <FieldGroup label={t('scopeLabel')} className="md:col-span-6">
            <SegmentedControl
              ariaLabel={t('scopeLabel')}
              name="ems-scope"
              value={draft.scope}
              onChange={(scope) => setDraft((d) => ({ ...d, scope }))}
              options={[
                { value: 'local', label: t('scopeLocal') },
                { value: 'national', label: t('scopeNational') },
              ]}
            />
          </FieldGroup>

          <FieldGroup label={t('segmentLabel')} className="md:col-span-6">
            <SegmentedControl
              ariaLabel={t('segmentLabel')}
              name="ems-segment"
              value={draft.segment}
              onChange={(segment) =>
                setDraft((d) => ({
                  ...d,
                  segment,
                  minSiteUnitCount: segment === 'rv_resort' ? 30 : 3,
                }))
              }
              options={[
                { value: 'glamping', label: t('segmentGlamping') },
                { value: 'rv_resort', label: t('segmentRvResort') },
              ]}
            />
          </FieldGroup>

          {draft.scope === 'local' ? (
            <div className="md:col-span-6 [&_label]:!mb-1.5 [&_label]:!text-[11px] [&_label]:!font-semibold [&_label]:!uppercase [&_label]:!tracking-wide [&_label]:!text-neutral-500 dark:[&_label]:!text-neutral-400">
              <CompsV2AddressPlaceInput
                id="ems-address"
                label={t('addressLabel')}
                value={draft.addressLine}
                onChange={(addressLine) => setDraft((d) => ({ ...d, addressLine }))}
                placeholder={t('addressPlaceholder')}
                loadingHint={t('placesAutocompleteLoading')}
                noApiKeyHint={t('placesNoApiKeyHint')}
                loadErrorHint={t('placesLoadErrorHint')}
                suggestionsHint={t('placesSuggestionsHint')}
              />
            </div>
          ) : null}

          {draft.scope === 'local' ? (
            <FieldGroup label={t('radiusLabel')} className="md:col-span-3">
              <div className="relative">
                <input
                  id="ems-radius"
                  type="number"
                  min={1}
                  max={250}
                  value={draft.radiusMiles}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, radiusMiles: Number(e.target.value) || 1 }))
                  }
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 pr-10 text-sm tabular-nums shadow-sm focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:border-neutral-700 dark:bg-neutral-950 dark:focus:border-neutral-500"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-neutral-400">
                  mi
                </span>
              </div>
            </FieldGroup>
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
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={50000}
                    value={draft.adrMin}
                    onChange={(e) => setDraft((d) => ({ ...d, adrMin: e.target.value }))}
                    placeholder={t('adrMinPlaceholder')}
                    className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-6 pr-3 text-sm tabular-nums shadow-sm dark:border-neutral-700 dark:bg-neutral-950"
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
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={50000}
                    value={draft.adrMax}
                    onChange={(e) => setDraft((d) => ({ ...d, adrMax: e.target.value }))}
                    placeholder={t('adrMaxPlaceholder')}
                    className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-6 pr-3 text-sm tabular-nums shadow-sm dark:border-neutral-700 dark:bg-neutral-950"
                  />
                </div>
              </div>
            </FieldGroup>

            <FieldGroup label={t('minSiteUnitLabel')} hint={t('minSiteUnitHint')} className="w-full md:w-auto">
              <input
                type="number"
                min={0}
                max={100_000}
                value={draft.minSiteUnitCount}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') {
                    setDraft((d) => ({ ...d, minSiteUnitCount: 0 }));
                    return;
                  }
                  const n = Number(raw);
                  if (!Number.isFinite(n)) return;
                  setDraft((d) => ({
                    ...d,
                    minSiteUnitCount: Math.max(0, Math.min(100_000, Math.floor(n))),
                  }));
                }}
                className="w-full max-w-[7.5rem] rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm tabular-nums dark:border-neutral-700 dark:bg-neutral-950"
              />
            </FieldGroup>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-neutral-100 pt-4 dark:border-neutral-800">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-800 dark:text-neutral-200">
            <input
              type="checkbox"
              className="rounded border-neutral-300"
              checked={draft.anonymize}
              onChange={(e) => {
                const anonymize = e.target.checked;
                setDraft((d) => {
                  const next = { ...d, anonymize };
                  queueMicrotask(() => {
                    pushUrl(next);
                  });
                  return next;
                });
              }}
            />
            <span>{tStudy('anonymizeLabel')}</span>
          </label>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{tStudy('anonymizeHint')}</p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={() => void runAndSyncUrl()}
            disabled={loading || (draft.scope === 'local' && !draft.addressLine.trim())}
            className="inline-flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                {t('generating')}
              </>
            ) : (
              t('generate')
            )}
          </Button>
          <button
            type="button"
            onClick={() => void runFreshAndSyncUrl()}
            disabled={loading || (draft.scope === 'local' && !draft.addressLine.trim())}
            className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            {t('forceRefresh')}
          </button>
          <button
            type="button"
            onClick={() => copyShareLink()}
            className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            {linkCopied ? tStudy('linkCopied') : tStudy('copyShareableLink')}
          </button>
          <button
            type="button"
            role="switch"
            aria-checked={draft.presenterMode}
            title={t('presenterModeTooltip')}
            onClick={() => {
              setDraft((d) => {
                const presenterMode = !d.presenterMode;
                const next = { ...d, presenterMode };
                queueMicrotask(() => {
                  pushUrl(next);
                });
                return next;
              });
            }}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-md border ${
              draft.presenterMode
                ? 'border-amber-500 bg-amber-400 text-neutral-900'
                : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-950'
            }`}
          >
            <Presentation className="h-4 w-4" aria-hidden />
          </button>
          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          ) : null}
        </div>
        {result && lastReportServerMs != null ? (
          <p className="mt-2 text-xs text-neutral-500">
            {t('reportServerTiming', {
              seconds: format.number(lastReportServerMs / 1000, { maximumFractionDigits: 1 }),
            })}
          </p>
        ) : null}
      </div>

      {!result && !loading && !error ? <p className={adminBodyMuted}>{t('emptyState')}</p> : null}

      {result ? (
        <div className="mx-auto flex max-w-6xl flex-col gap-8 lg:flex-row lg:items-start">
          <aside className="lg:w-52 lg:shrink-0">
            <nav
              aria-label={tStudy('tocLabel')}
              className="sticky top-4 rounded-lg border border-neutral-200 bg-white/90 p-3 text-sm backdrop-blur dark:border-neutral-700 dark:bg-neutral-950/90"
            >
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                {tStudy('tocLabel')}
              </p>
              <ul className="space-y-1">
                {tocItems.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className="block rounded px-2 py-1 text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          <div className="min-w-0 flex-1 space-y-8">
            <StudySection id="study-summary" title={tStudy('tocSummary')}>
              <MarketSummaryRedesigned
                marketSummary={result.sections.marketSummary}
                rateAnalysis={result.sections.rateAnalysis}
                scope={result.meta.scope ?? 'local'}
                insights={insights}
                presenterMode={draft.presenterMode}
                onRetryInsights={retryInsights}
                anonymizeComps={draft.anonymize}
              />
            </StudySection>

            {result.meta.scope !== 'national' ? (
              <StudySection id="study-map" title={tStudy('tocMap')}>
                <MarketReportMapPreview
                  anchorLat={result.meta.anchorLat}
                  anchorLng={result.meta.anchorLng}
                  radiusMiles={result.meta.radiusMiles}
                  mapPins={result.mapPins}
                  mapPinsTotal={result.meta.mapPinsTotal}
                  mapPinsTruncated={result.meta.mapPinsTruncated}
                  presenterMode={draft.presenterMode}
                  anonymizePins={draft.anonymize}
                />
              </StudySection>
            ) : null}

            {result.meta.fetchPossiblyIncomplete ? (
              <div
                role="status"
                className="rounded-md border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-800/80 dark:bg-amber-950/40 dark:text-amber-100"
              >
                {t('fetchCapWarning')}
              </div>
            ) : null}

            {result.meta.propertyCount === 0 ? (
              <p className={adminBodyMuted}>{t('noPropertiesInRadius')}</p>
            ) : (
              <>
                <StudySection id="study-property" title={tStudy('tocProperty')}>
                  <dl className="mb-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-neutral-500 dark:text-neutral-400">{t('statsMeanSites')}</dt>
                      <dd className="font-medium">
                        {fmtNum(result.sections.propertyAnalysis.meanTotalSites)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-neutral-500 dark:text-neutral-400">{t('statsMedianSites')}</dt>
                      <dd className="font-medium">
                        {fmtNum(result.sections.propertyAnalysis.medianTotalSites)}
                      </dd>
                    </div>
                  </dl>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-neutral-200 text-left dark:border-neutral-700">
                          <th className="py-2 pr-3 font-medium">{t('tableProperty')}</th>
                          {!draft.presenterMode ? (
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
                          {!draft.anonymize ? (
                            <th className="py-2 font-medium">{t('tableWebsite')}</th>
                          ) : null}
                        </tr>
                      </thead>
                      <tbody>
                        {groupedPropertyRows.map((group, idx) => {
                          const row = group.rep;
                          const safeUrl = sanitizeHttpUrl(row.url);
                          const unitTypesForDisplay =
                            group.unitTypes.length > 0
                              ? group.unitTypes
                              : (() => {
                                  const u = (row.unit_type ?? '').trim();
                                  return u ? [u] : [];
                                })();
                          const unitTypeTitle = unitTypesForDisplay.map((ut) => humanLabel(ut)).join(', ');
                          const displayName = draft.anonymize
                            ? t('anonymizedListingLabel', { n: idx + 1 })
                            : row.property_name;
                          return (
                            <tr
                              key={group.key}
                              className="border-b border-neutral-100 align-top dark:border-neutral-800"
                            >
                              <td className="max-w-[12rem] truncate py-2 pr-3" title={draft.anonymize ? undefined : row.property_name}>
                                {displayName}
                              </td>
                              {!draft.presenterMode ? (
                                <td className="py-2 pr-3 text-neutral-600 dark:text-neutral-400">
                                  {row.sourceLabel}
                                </td>
                              ) : null}
                              <td className="py-2 pr-3">{draft.anonymize ? '—' : row.city}</td>
                              <td className="py-2 pr-3">{formatMarketReportStateCell(row.state)}</td>
                              {result.meta.scope !== 'national' ? (
                                <td className="py-2 pr-3">{fmtNum(row.distance_miles)}</td>
                              ) : null}
                              <td className="py-2 pr-3 tabular-nums">
                                {group.propertyTotalSites != null
                                  ? format.number(group.propertyTotalSites)
                                  : '—'}
                              </td>
                              <td className="max-w-[14rem] py-2 pr-3" title={unitTypeTitle}>
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
                              {!draft.anonymize ? (
                                <td className="py-2">
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
                              ) : null}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </StudySection>

                <StudySection id="study-rates" title={tStudy('tocRates')}>
                  <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Stat
                      label={t('ratesCoverage')}
                      value={format.number(result.sections.rateAnalysis.propertiesWithPrimaryRate)}
                    />
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
                  <SeasonalRatesChart
                    seasonalAverages={result.sections.rateAnalysis.seasonalAverages}
                    emptyLabel={t('noPropertiesInRadius')}
                  />
                </StudySection>

                <StudySection id="study-amenities" title={tStudy('tocAmenities')}>
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
                            <tr className="border-b border-neutral-200 text-left dark:border-neutral-700">
                              <th className="py-2 pr-3 font-medium">{t('tableAmenity')}</th>
                              <th className="py-2 pr-3 font-medium">{t('tablePctCohort')}</th>
                              <th className="py-2 pr-3 font-medium">{t('tablePctKnown')}</th>
                              <th className="py-2 pr-3 font-medium">{t('tableKnownCount')}</th>
                              <th className="py-2 font-medium" title={t('tableRateImpactTooltip')}>
                                {t('tableRateImpact')}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {(result.sections.amenityAnalysis.amenityRates ?? [])
                              .filter((a) => a.withKnownValue >= 10)
                              .map((a) => (
                                <tr key={a.column} className="border-b border-neutral-100 dark:border-neutral-800">
                                  <td className="py-2 pr-3">{a.label}</td>
                                  <td className="py-2 pr-3">
                                    {fmtNum(a.pctOfCohort, { maximumFractionDigits: 1 })}%
                                  </td>
                                  <td className="py-2 pr-3">
                                    {fmtNum(a.pctOfKnown, { maximumFractionDigits: 1 })}%
                                  </td>
                                  <td className="py-2 pr-3">{format.number(a.withKnownValue)}</td>
                                  <td className="py-2">
                                    <RateImpactCell impactUsd={a.rateImpactUsd} sample={a.rateImpactSampleSize} t={t} />
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </StudySection>

                <StudySection id="study-units" title={tStudy('tocUnits')}>
                  <p className="mb-2 text-sm font-medium text-neutral-800 dark:text-neutral-200">
                    {t('siteUnitChartTitle')}
                  </p>
                  <div className="mb-5">
                    <UnitTypeRateCountChart
                      rows={result.sections.siteUnitAnalysis.topUnitTypes}
                      emptyLabel={t('siteUnitChartEmpty')}
                      ariaLabel={t('siteUnitChartTitle')}
                    />
                  </div>
                  <p className="mb-2 text-sm font-medium text-neutral-800 dark:text-neutral-200">
                    {t('siteUnitDumbbellTitle')}
                  </p>
                  <div className="mb-5">
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
                </StudySection>

                <StudySection id="study-methodology" title={tStudy('tocMethodology')}>
                  <StudyMethodologySummary
                    meta={result.meta}
                    marketSummary={result.sections.marketSummary}
                  />
                </StudySection>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
