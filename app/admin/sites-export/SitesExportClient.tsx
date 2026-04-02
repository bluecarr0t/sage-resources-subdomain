'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import MultiSelect from '@/components/MultiSelect';
import SearchableMultiSelect from '@/components/SearchableMultiSelect';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { STATE_ABBR_TO_NAME } from '@/lib/comps-v2/geo';
import { SITE_EXPORT_TABLES, type SiteExportTable } from '@/lib/sites-export/constants';
import {
  labelRoverpassUnitTypeSlug,
  sitesExportMergedUnitTypeOptionValues,
  sitesExportUnitTypeOptionValuesForTable,
} from '@/lib/sites-export/unit-type-options-by-source';

const ALL_TOKEN = 'all';

/** Same clamp as the server-side payload: 1–500 miles, finite, positive. */
function clampSitesExportRadiusMiles(raw: string): number | null {
  const t = raw.trim();
  if (t === '') return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(500, Math.max(1, n));
}

function isSitesExportDownloadContentType(ct: string): boolean {
  const c = ct.toLowerCase();
  return (
    c.includes('text/csv') ||
    c.includes('spreadsheetml') ||
    c.includes('application/octet-stream')
  );
}

/**
 * Rough server/build duration from last count + format (XLSX is much slower than CSV).
 * Capped so the UI does not promise unrealistic speed for huge exports.
 */
function estimateSitesExportDurationMs(
  siteCount: number | null,
  format: 'xlsx' | 'csv'
): number {
  const n = siteCount != null && siteCount >= 0 ? siteCount : 65_000;
  const msPer1k = format === 'xlsx' ? 3_200 : 520;
  const raw = Math.round((n / 1000) * msPer1k);
  return Math.min(9 * 60 * 1000, Math.max(20_000, raw));
}

function resolveSourcesForApi(selected: string[]): SiteExportTable[] {
  if (selected.includes(ALL_TOKEN)) {
    return [...SITE_EXPORT_TABLES];
  }
  const out = selected.filter((s): s is SiteExportTable =>
    SITE_EXPORT_TABLES.includes(s as SiteExportTable)
  );
  return out.length > 0 ? out : [...SITE_EXPORT_TABLES];
}

/** True when the user has picked every export table (same as choosing “All”). */
function everySiteExportTableSelected(selected: string[]): boolean {
  const picked = new Set(
    selected.filter((s): s is SiteExportTable =>
      SITE_EXPORT_TABLES.includes(s as SiteExportTable)
    )
  );
  return (
    picked.size === SITE_EXPORT_TABLES.length &&
    SITE_EXPORT_TABLES.every((table) => picked.has(table))
  );
}

export default function SitesExportClient() {
  const t = useTranslations('admin.sitesExport');

  const [selectedSources, setSelectedSources] = useState<string[]>([ALL_TOKEN]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedUnitTypes, setSelectedUnitTypes] = useState<string[]>([]);
  const [zip, setZip] = useState('');
  const [radius, setRadius] = useState('');
  const [format, setFormat] = useState<'xlsx' | 'csv'>('xlsx');

  const [count, setCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);
  const [countError, setCountError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportPhase, setExportPhase] = useState<'server' | 'download'>('server');
  const [exportEtaText, setExportEtaText] = useState<string | null>(null);
  const exportRunPhaseRef = useRef<'server' | 'download'>('server');
  /** From last successful count; sent with export to reuse server-side refs cache. */
  const [exportCacheKey, setExportCacheKey] = useState<string | null>(null);

  const stateOptions = useMemo(
    () =>
      Object.entries(STATE_ABBR_TO_NAME).map(([abbr, name]) => ({
        value: abbr,
        label: `${name} (${abbr})`,
      })),
    []
  );

  const resolvedSources = useMemo(
    () => resolveSourcesForApi(selectedSources),
    [selectedSources]
  );

  /** Country, state, or zip+miles — required so an empty multiselect cannot export the full table. */
  const hasRegionScope = useMemo(
    () =>
      selectedCountries.length > 0 ||
      selectedStates.length > 0 ||
      (zip.trim() !== '' && clampSitesExportRadiusMiles(radius) != null),
    [selectedCountries, selectedStates, zip, radius]
  );

  const roverpassSlugSet = useMemo(
    () => new Set(sitesExportUnitTypeOptionValuesForTable('all_roverpass_data_new')),
    []
  );

  const unitTypeOptions = useMemo(() => {
    const values = sitesExportMergedUnitTypeOptionValues(resolvedSources);
    return values.map((value) => {
      let label: string;
      if (value === 'Lodging') label = t('unitTypeLodging');
      else if (value === 'Tent Sites') label = t('unitTypeTentSites');
      else if (value === 'RV Site') label = t('unitTypeRvSite');
      else if (roverpassSlugSet.has(value)) label = labelRoverpassUnitTypeSlug(value);
      else label = value;
      return { value, label };
    });
  }, [resolvedSources, t, roverpassSlugSet]);

  useEffect(() => {
    const allowed = new Set(sitesExportMergedUnitTypeOptionValues(resolvedSources));
    setSelectedUnitTypes((prev) => prev.filter((x) => allowed.has(x)));
  }, [resolvedSources]);

  const countryOptions = useMemo(
    () => [
      { value: 'United States', label: t('countryUnitedStates') },
      { value: 'Canada', label: t('countryCanada') },
      { value: 'Mexico', label: t('countryMexico') },
    ],
    [t]
  );

  const sourceOptions = useMemo(
    () => [
      { value: ALL_TOKEN, label: t('sourceAll') },
      { value: 'hipcamp', label: t('sourceHipcamp') },
      { value: 'campspot', label: t('sourceCampspot') },
      { value: 'all_glamping_properties', label: t('sourceSage') },
      { value: 'all_roverpass_data_new', label: t('sourceRoverpass') },
    ],
    [t]
  );

  const toggleSource = useCallback((v: string) => {
    if (v === ALL_TOKEN) {
      setSelectedSources([ALL_TOKEN]);
      return;
    }
    setSelectedSources((prev) => {
      const withoutAll = prev.filter((x) => x !== ALL_TOKEN);
      if (withoutAll.includes(v)) {
        const next = withoutAll.filter((x) => x !== v);
        return next.length === 0 ? [ALL_TOKEN] : next;
      }
      const next = [...withoutAll, v];
      return everySiteExportTableSelected(next) ? [ALL_TOKEN] : next;
    });
  }, []);

  const buildPayload = useCallback(() => {
    const sources = resolveSourcesForApi(selectedSources);
    const radiusNum = clampSitesExportRadiusMiles(radius);
    const zipTrim = zip.trim();
    return {
      sources,
      countries: selectedCountries,
      states: selectedStates,
      unitTypes: selectedUnitTypes,
      zip: zipTrim,
      radiusMiles: zipTrim && radiusNum != null ? radiusNum : null,
      format,
      ...(exportCacheKey ? { cacheKey: exportCacheKey } : {}),
    };
  }, [
    selectedSources,
    selectedCountries,
    selectedStates,
    selectedUnitTypes,
    zip,
    radius,
    format,
    exportCacheKey,
  ]);

  useEffect(() => {
    setExportCacheKey(null);
  }, [selectedSources, selectedCountries, selectedStates, selectedUnitTypes, zip, radius]);

  const proximityFieldsActive = zip.trim() !== '' || radius.trim() !== '';

  useEffect(() => {
    if (!proximityFieldsActive) return;
    setSelectedCountries([]);
    setSelectedStates([]);
  }, [proximityFieldsActive]);

  const geoValid =
    (zip.trim() === '' && radius.trim() === '') ||
    (zip.trim() !== '' && clampSitesExportRadiusMiles(radius) != null);

  useEffect(() => {
    if (!geoValid) {
      setCountError(null);
      setCount(null);
      setCountLoading(false);
      return;
    }

    if (!hasRegionScope) {
      setCount(null);
      setCountLoading(false);
      setCountError(null);
      setExportCacheKey(null);
      return;
    }

    const payload = buildPayload();
    if (payload.sources.length === 0) {
      setCount(null);
      setCountLoading(false);
      return;
    }

    setCount(null);
    setCountLoading(true);

    const ctrl = new AbortController();
    const tmr = window.setTimeout(async () => {
      setCountError(null);
      try {
        const res = await fetch('/api/admin/sites-export/count', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(payload),
          signal: ctrl.signal,
        });
        const data = (await res.json().catch(() => null)) as {
          success?: boolean;
          count?: number;
          cacheKey?: string;
          message?: string;
        } | null;
        if (!res.ok || !data?.success) {
          setExportCacheKey(null);
          setCount(null);
          const fallback =
            res.status === 422
              ? t('countLimitExceeded')
              : res.status === 504 || res.status === 408
                ? t('dbQueryTimeout')
                : t('countError');
          setCountError(data?.message ?? fallback);
          return;
        }
        setCount(typeof data.count === 'number' ? data.count : 0);
        setExportCacheKey(typeof data.cacheKey === 'string' ? data.cacheKey : null);
      } catch {
        if (!ctrl.signal.aborted) {
          setCount(null);
          setCountError(t('countError'));
        }
      } finally {
        if (!ctrl.signal.aborted) setCountLoading(false);
      }
    }, 400);

    return () => {
      ctrl.abort();
      window.clearTimeout(tmr);
    };
  }, [buildPayload, geoValid, hasRegionScope, t]);

  const handleExport = async () => {
    if (!geoValid || !hasRegionScope) return;
    setExportError(null);
    setExporting(true);
    setExportProgress(0);
    setExportPhase('server');
    setExportEtaText(null);
    exportRunPhaseRef.current = 'server';

    const estimateMs = estimateSitesExportDurationMs(count, format);
    const started = Date.now();

    const tick = window.setInterval(() => {
      const elapsed = Date.now() - started;
      const cap = exportRunPhaseRef.current === 'download' ? 98 : 94;
      const denom = estimateMs * 1.25;
      const nextPct = Math.min(cap, (elapsed / denom) * 100);
      setExportProgress((prev) => Math.max(prev, nextPct));

      const remaining = estimateMs - elapsed;
      if (remaining > 90_000) {
        setExportEtaText(
          t('exportProgressEtaMinutes', {
            minutes: Math.max(1, Math.ceil(remaining / 60_000)),
          })
        );
      } else if (remaining > 0) {
        setExportEtaText(
          t('exportProgressEtaSeconds', { seconds: Math.max(1, Math.ceil(remaining / 1000)) })
        );
      } else {
        setExportEtaText(t('exportProgressOvertime'));
      }
    }, 220);

    try {
      const payload = buildPayload();
      const res = await fetch('/api/admin/sites-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        if (res.status === 504 || res.status === 408) {
          setExportError(data?.message ?? t('exportGatewayTimeout'));
        } else {
          const fallback =
            res.status === 422 ? t('countLimitExceeded') : t('exportError');
          setExportError(data?.message ?? fallback);
        }
        return;
      }

      exportRunPhaseRef.current = 'download';
      setExportPhase('download');

      const buf = await res.arrayBuffer();
      const ct = res.headers.get('Content-Type') ?? '';
      if (!isSitesExportDownloadContentType(ct)) {
        try {
          const text = new TextDecoder().decode(buf);
          const j = JSON.parse(text) as { message?: string };
          setExportError(j.message ?? t('exportError'));
        } catch {
          setExportError(t('exportError'));
        }
        return;
      }

      setExportProgress(100);
      const blob = new Blob([buf], { type: ct || undefined });
      const cd = res.headers.get('Content-Disposition');
      const m = cd?.match(/filename="([^"]+)"/);
      const filename = m?.[1] ?? `sites-export.${format}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      if (err instanceof TypeError) {
        setExportError(t('exportNetworkError'));
      } else {
        setExportError(t('exportError'));
      }
    } finally {
      window.clearInterval(tick);
      setExporting(false);
      setExportProgress(0);
      setExportEtaText(null);
      exportRunPhaseRef.current = 'server';
    }
  };

  const countSummaryValue = countLoading
    ? t('countLoading')
    : count != null
      ? String(count)
      : t('countEmpty');

  return (
    <main className="pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            {t('title')}
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">{t('subtitle')}</p>
          {geoValid && hasRegionScope && (
            <p className="mt-3 text-sm text-gray-700 dark:text-gray-300" aria-live="polite">
              {t('countSummary', { count: countSummaryValue })}
            </p>
          )}
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
          <MultiSelect
            id="sites-export-source"
            label={t('sourceLabel')}
            options={sourceOptions}
            selectedValues={selectedSources}
            onToggle={toggleSource}
            onClear={() => setSelectedSources([ALL_TOKEN])}
            placeholder={t('sourcePlaceholder')}
            allSelectedText={t('sourceAllSelected')}
            activeColor="sage"
          />
          <SearchableMultiSelect
            id="sites-export-country"
            label={t('countryLabel')}
            options={countryOptions}
            selectedValues={selectedCountries}
            onToggle={(v) =>
              setSelectedCountries((p) =>
                p.includes(v) ? p.filter((x) => x !== v) : [...p, v]
              )
            }
            placeholder={t('countryPlaceholder')}
            allSelectedText={t('countryAllSelected')}
            searchPlaceholder={t('countrySearchPlaceholder')}
            activeColor="sage"
            disabled={proximityFieldsActive}
            disabledTitle={proximityFieldsActive ? t('regionFiltersDisabledHint') : undefined}
          />
          <SearchableMultiSelect
            id="sites-export-state"
            label={t('stateLabel')}
            options={stateOptions}
            selectedValues={selectedStates}
            onToggle={(v) =>
              setSelectedStates((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]))
            }
            placeholder={t('statePlaceholder')}
            allSelectedText={t('stateAllSelected')}
            searchPlaceholder={t('stateSearchPlaceholder')}
            activeColor="sage"
            disabled={proximityFieldsActive}
            disabledTitle={proximityFieldsActive ? t('regionFiltersDisabledHint') : undefined}
          />
          <SearchableMultiSelect
            id="sites-export-unit-type"
            label={t('unitTypeLabel')}
            options={unitTypeOptions}
            selectedValues={selectedUnitTypes}
            onToggle={(v) =>
              setSelectedUnitTypes((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]))
            }
            placeholder={
              resolvedSources.length === 1
                ? t('unitTypePlaceholder')
                : t('unitTypePlaceholderAllSources')
            }
            allSelectedText={t('unitTypeAllSelected')}
            searchPlaceholder={t('unitTypeSearchPlaceholder')}
            activeColor="sage"
          />
          <Input
            id="sites-export-zip"
            label={t('zipLabel')}
            placeholder={t('zipPlaceholder')}
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            autoComplete="postal-code"
          />
          <Input
            id="sites-export-radius"
            label={t('radiusLabel')}
            placeholder={t('radiusPlaceholder')}
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            inputMode="numeric"
          />
          <Select
            id="sites-export-format"
            label={t('formatLabel')}
            value={format}
            onChange={(e) => setFormat(e.target.value as 'xlsx' | 'csv')}
          >
            <option value="xlsx">{t('formatXlsx')}</option>
            <option value="csv">{t('formatCsv')}</option>
          </Select>
          <div className="lg:col-span-1">
            <Button
              type="button"
              variant="primary"
              className="w-full inline-flex items-center justify-center !bg-[#60775a] !text-white hover:!bg-[#556952] focus:!ring-[#60775a] border-0"
              disabled={!geoValid || !hasRegionScope || exporting}
              onClick={() => void handleExport()}
            >
              {exporting ? t('exporting') : t('exportButton')}
            </Button>
          </div>
        </div>

        {exporting && (
          <div
            className="mt-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-4"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {exportPhase === 'server' ? t('exportProgressServer') : t('exportProgressDownload')}
            </p>
            {exportEtaText && (
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{exportEtaText}</p>
            )}
            <div
              className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(exportProgress)}
              aria-label={t('exporting')}
            >
              <div
                className="h-full rounded-full bg-[#60775a] transition-[width] duration-300 ease-out"
                style={{ width: `${Math.min(100, exportProgress)}%` }}
              />
            </div>
          </div>
        )}

        {(countError || exportError || !geoValid || (geoValid && !hasRegionScope)) && (
          <div className="mt-4 space-y-1 text-sm">
            {geoValid && !hasRegionScope && (
              <p className="text-amber-700 dark:text-amber-300">{t('regionScopeRequired')}</p>
            )}
            {!geoValid && (zip.trim() || radius.trim()) && (
              <p className="text-amber-700 dark:text-amber-300">{t('geoZipRadiusHint')}</p>
            )}
            {countError && <p className="text-red-600 dark:text-red-400">{countError}</p>}
            {exportError && <p className="text-red-600 dark:text-red-400">{exportError}</p>}
          </div>
        )}
      </div>
    </main>
  );
}
