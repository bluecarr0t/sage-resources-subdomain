'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useCompsV2Discovery } from '@/app/admin/comps-v2/useCompsV2Discovery';
import { useCompsV2ResultsFilters } from '@/app/admin/comps-v2/useCompsV2ResultsFilters';
import {
  resolveDeepEnrichClientError,
  resolveGapFillClientError,
} from '@/lib/comps-v2/admin-client-errors';
import type { DeepEnrichResult } from '@/lib/comps-v2/deep-enrich';
import { deepEnrichResultsToExportCandidates } from '@/lib/comps-v2/deep-enrich-export';
import { compareCompsV2Candidates } from '@/lib/comps-v2/discover';
import { compsV2CandidatesToCsv } from '@/lib/comps-v2/export-csv';
import { COMPS_V2_GAP_FILL_MAX_EXISTING_CANDIDATES } from '@/lib/comps-v2/gap-fill-limits';
import {
  COMPS_V2_MAX_RESULTS_DEFAULT,
  COMPS_V2_TAVILY_MAX_QUERIES_DEFAULT,
  COMPS_V2_TAVILY_RESULTS_PER_QUERY_DEFAULT,
} from '@/lib/comps-v2/parse-body';
import { compsV2SourceTableLabel } from '@/lib/comps-v2/source-table-i18n';
import type { CompsV2Candidate } from '@/lib/comps-v2/types';
import {
  COMPS_V2_PROPERTY_KINDS,
  type CompsV2PropertyKind,
  type QualityTier,
} from '@/lib/comps-v2/types';
import { computeCompsV2SummaryStats } from '@/lib/comps-v2/comps-summary-stats';
import { dedupeUniqueProperties } from '@/lib/comps-v2/unique-properties';
import type { WebResearchDiagnostics } from '@/lib/comps-v2/web-research-diagnostics';

export function useCompsV2PageState() {
  const t = useTranslations('admin.compsV2');
  const sourceLabel = useCallback((table: string) => compsV2SourceTableLabel(table, t), [t]);

  const gapFillRequestSeqRef = useRef(0);
  const gapFillAbortRef = useRef<AbortController | null>(null);
  const deepRequestSeqRef = useRef(0);
  const deepAbortRef = useRef<AbortController | null>(null);

  const [maxMergedResults] = useState(COMPS_V2_MAX_RESULTS_DEFAULT);
  const [kinds, setKinds] = useState<Set<CompsV2PropertyKind>>(
    () => new Set<CompsV2PropertyKind>(['glamping'])
  );
  const [tiers, setTiers] = useState<Set<QualityTier>>(new Set());
  const [firecrawlTopN] = useState(4);
  const [maxWebComps] = useState(12);
  const [tavilyMaxQueries] = useState(COMPS_V2_TAVILY_MAX_QUERIES_DEFAULT);
  const [tavilyResultsPerQuery] = useState(COMPS_V2_TAVILY_RESULTS_PER_QUERY_DEFAULT);
  const [lastRunWebOptions, setLastRunWebOptions] = useState<{
    firecrawlTopN: number;
    maxWebComps: number;
    tavilyMaxQueries: number;
    tavilyResultsPerQuery: number;
  } | null>(null);

  const [discoveryCorrelationId, setDiscoveryCorrelationId] = useState<string | null>(null);
  const [discoverySourceTimingsMs, setDiscoverySourceTimingsMs] = useState<Record<
    string,
    number
  > | null>(null);
  const [deepLoading, setDeepLoading] = useState(false);
  const [deepCancelling, setDeepCancelling] = useState(false);
  const [deepRunId, setDeepRunId] = useState(0);
  const [deepServerComplete, setDeepServerComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geocode, setGeocode] = useState<{ lat: number; lng: number } | null>(null);
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [webResearch, setWebResearch] = useState<WebResearchDiagnostics | null>(null);
  const [searchContext, setSearchContext] = useState<{
    anchorCity: string;
    stateAbbr: string;
  } | null>(null);
  const [gapFillLoading, setGapFillLoading] = useState(false);
  const [candidates, setCandidates] = useState<CompsV2Candidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deepResults, setDeepResults] = useState<DeepEnrichResult[] | null>(null);
  const [deepSourceCandidates, setDeepSourceCandidates] = useState<CompsV2Candidate[] | null>(null);

  const webResearchFirecrawlTopNUsed = lastRunWebOptions?.firecrawlTopN ?? firecrawlTopN;

  const glampingStrictOnly = useMemo(
    () => kinds.has('glamping') && !kinds.has('rv') && !kinds.has('campground'),
    [kinds]
  );

  const kindLabels = useMemo(
    () =>
      ({
        glamping: t('kindGlamping'),
        rv: t('kindRv'),
        marina: t('kindMarina'),
        landscape_hotel: t('kindLandscapeHotel'),
        campground: t('kindCampground'),
      }) satisfies Record<CompsV2PropertyKind, string>,
    [t]
  );

  const tierLabels = useMemo(
    () =>
      ({
        budget: t('tierBudget'),
        economy: t('tierEconomy'),
        mid: t('tierMid'),
        upscale: t('tierUpscale'),
        luxury: t('tierLuxury'),
      }) satisfies Record<QualityTier, string>,
    [t]
  );

  const dataSourceOptions = useMemo(
    () => [
      { value: 'pastReports' as const, label: t('sourcePastReports') },
      { value: 'all_glamping_properties' as const, label: t('sourceGlamping') },
      { value: 'hipcamp' as const, label: t('sourceHipcamp') },
      { value: 'all_roverpass_data_new' as const, label: t('sourceRoverpass') },
      { value: 'campspot' as const, label: t('sourceCampspot') },
      { value: 'web_search' as const, label: t('sourceWebSearch') },
    ],
    [t]
  );

  const results = useCompsV2ResultsFilters({
    candidates,
    tierLabels,
    sourceLabel,
  });

  const clearDiscoveryOnFailure = useCallback(() => {
    setCandidates([]);
    setGeocode(null);
    setCounts(null);
    setWebResearch(null);
    setSearchContext(null);
    setLastRunWebOptions(null);
    setDiscoveryCorrelationId(null);
    setDiscoverySourceTimingsMs(null);
    results.resetResultsUi();
  }, [results.resetResultsUi]);

  const onClearDeepForNewDiscovery = useCallback(() => {
    setDeepResults(null);
    setDeepSourceCandidates(null);
  }, []);

  const applyDiscoverySuccessPayload = useCallback(
    (data: {
      geocode: { lat: number; lng: number };
      counts?: Record<string, number> | null;
      candidates?: CompsV2Candidate[];
      webResearch?: WebResearchDiagnostics | null | undefined;
      searchContext?: { anchorCity?: string; stateAbbr?: string };
      correlationId?: string;
      sourceTimingsMs?: Record<string, number>;
    }) => {
      results.resetResultsUi();
      setGeocode(data.geocode);
      setCounts(data.counts ?? null);
      setCandidates(data.candidates ?? []);
      setWebResearch(data.webResearch ?? null);
      if (typeof data.correlationId === 'string' && data.correlationId.length > 0) {
        setDiscoveryCorrelationId(data.correlationId);
      }
      setDiscoverySourceTimingsMs(
        data.sourceTimingsMs && Object.keys(data.sourceTimingsMs).length > 0
          ? data.sourceTimingsMs
          : null
      );
      setLastRunWebOptions({
        firecrawlTopN,
        maxWebComps,
        tavilyMaxQueries,
        tavilyResultsPerQuery,
      });
      const sc = data.searchContext;
      if (sc && typeof sc.anchorCity === 'string' && typeof sc.stateAbbr === 'string') {
        setSearchContext({
          anchorCity: sc.anchorCity,
          stateAbbr: sc.stateAbbr.toUpperCase().slice(0, 2),
        });
      } else {
        setSearchContext(null);
      }
      setSelected(new Set());
    },
    [firecrawlTopN, maxWebComps, tavilyMaxQueries, tavilyResultsPerQuery, results.resetResultsUi]
  );

  const discovery = useCompsV2Discovery({
    t,
    kinds,
    tiers,
    maxMergedResults,
    firecrawlTopN,
    maxWebComps,
    tavilyMaxQueries,
    tavilyResultsPerQuery,
    setError,
    applyDiscoverySuccessPayload,
    clearDiscoveryOnFailure,
    gapFillAbortRef,
    deepAbortRef,
    onClearDeepForNewDiscovery,
    setDiscoveryCorrelationId,
  });

  const summaryStats = useMemo(() => computeCompsV2SummaryStats(candidates), [candidates]);

  const compositionRawRowsTotal = useMemo(() => {
    if (!counts) return 0;
    const keys = [
      'all_glamping_properties',
      'hipcamp',
      'all_roverpass_data_new',
      'campspot',
      'past_reports',
    ] as const;
    return keys.reduce(
      (sum, k) =>
        sum +
        (typeof counts[k] === 'number' && Number.isFinite(counts[k]) ? counts[k]! : 0),
      0
    );
  }, [counts]);

  const summaryCurrency = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }),
    []
  );

  const toggleKind = useCallback((k: CompsV2PropertyKind) => {
    setKinds((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  }, []);

  const toggleTier = useCallback((q: QualityTier) => {
    setTiers((prev) => {
      const n = new Set(prev);
      if (n.has(q)) n.delete(q);
      else n.add(q);
      return n;
    });
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else {
        if (n.size >= 5) return prev;
        n.add(id);
      }
      return n;
    });
  }, []);

  const runGapFillOnly = useCallback(async () => {
    if (!searchContext || searchContext.stateAbbr.length !== 2) {
      setError(t('gapFillOnlyDisabled'));
      return;
    }
    if (!searchContext.anchorCity.trim()) {
      setError(t('errorGapFillCityRequired'));
      return;
    }
    if (candidates.length > COMPS_V2_GAP_FILL_MAX_EXISTING_CANDIDATES) {
      setError(t('errorGapFillExistingTooLarge', { max: COMPS_V2_GAP_FILL_MAX_EXISTING_CANDIDATES }));
      return;
    }
    setGapFillLoading(true);
    setError(null);
    gapFillAbortRef.current?.abort();
    gapFillRequestSeqRef.current += 1;
    const gapSeq = gapFillRequestSeqRef.current;
    const ac = new AbortController();
    gapFillAbortRef.current = ac;

    try {
      const res = await fetch('/api/admin/comps-v2/gap-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: ac.signal,
        body: JSON.stringify({
          city: searchContext.anchorCity,
          state: searchContext.stateAbbr,
          propertyKinds: [...kinds],
          qualityTiers: tiers.size ? [...tiers] : null,
          radiusMiles: discovery.radiusMiles,
          firecrawlTopN,
          maxGapComps: maxWebComps,
          tavilyMaxQueries,
          tavilyResultsPerQuery,
          existingCandidates: candidates.map((c) => ({
            stable_id: c.stable_id,
            property_name: c.property_name,
            city: c.city,
            url: c.url ?? undefined,
          })),
          anchorLat: geocode?.lat,
          anchorLng: geocode?.lng,
        }),
      });
      const data = await res.json();
      if (gapSeq !== gapFillRequestSeqRef.current) return;
      if (!data.success) {
        setError(resolveGapFillClientError(data as { errorCode?: string; message?: string }, t));
        return;
      }
      const added = (data.added as CompsV2Candidate[] | undefined) ?? [];
      const merged = dedupeUniqueProperties([...candidates, ...added]);
      merged.sort(compareCompsV2Candidates);
      setCandidates(merged);
      setWebResearch((data.webResearch as WebResearchDiagnostics | null | undefined) ?? null);
      setLastRunWebOptions({
        firecrawlTopN,
        maxWebComps,
        tavilyMaxQueries,
        tavilyResultsPerQuery,
      });
    } catch (e) {
      if (gapSeq !== gapFillRequestSeqRef.current) return;
      if (e instanceof Error && e.name === 'AbortError') return;
      setError(t('errorGeneric'));
    } finally {
      if (gapSeq === gapFillRequestSeqRef.current) {
        setGapFillLoading(false);
      }
    }
  }, [
    searchContext,
    kinds,
    tiers,
    discovery.radiusMiles,
    firecrawlTopN,
    maxWebComps,
    tavilyMaxQueries,
    tavilyResultsPerQuery,
    candidates,
    geocode,
    t,
  ]);

  const cancelDeepEnrich = useCallback(() => {
    setDeepCancelling(true);
    deepAbortRef.current?.abort();
    deepRequestSeqRef.current += 1;
    setDeepServerComplete(true);
  }, []);

  const onDeepEnrichUiFinished = useCallback(() => {
    setDeepLoading(false);
    setDeepServerComplete(false);
    setDeepCancelling(false);
  }, []);

  const runDeep = useCallback(async () => {
    const picked = candidates.filter((c) => selected.has(c.stable_id));
    if (picked.length < 3) {
      setError(t('errorDeepEnrichMinCount', { min: 3, max: 5 }));
      return;
    }
    discovery.discoveryAbortRef.current?.abort();
    gapFillAbortRef.current?.abort();
    deepAbortRef.current?.abort();
    deepRequestSeqRef.current += 1;
    const deepSeq = deepRequestSeqRef.current;
    const ac = new AbortController();
    deepAbortRef.current = ac;
    setDeepCancelling(false);
    setDeepServerComplete(false);
    setDeepRunId((n) => n + 1);
    setDeepLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/comps-v2/enrich-selection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(discoveryCorrelationId ? { 'X-Correlation-Id': discoveryCorrelationId } : {}),
        },
        credentials: 'include',
        signal: ac.signal,
        body: JSON.stringify({
          items: picked.map((c) => ({
            property_name: c.property_name,
            city: c.city,
            state: c.state,
            url: c.url,
          })),
          ...(discoveryCorrelationId ? { correlationId: discoveryCorrelationId } : {}),
        }),
      });
      let data: {
        success?: boolean;
        results?: DeepEnrichResult[];
        errorCode?: string;
        message?: string;
      };
      try {
        data = await res.json();
      } catch {
        data = { success: false };
      }
      if (deepSeq !== deepRequestSeqRef.current) return;
      setDeepServerComplete(true);
      if (!data.success) {
        setError(resolveDeepEnrichClientError(data as { errorCode?: string; message?: string }, t));
        setDeepResults(null);
        setDeepSourceCandidates(null);
        return;
      }
      setDeepSourceCandidates(picked);
      setDeepResults(data.results ?? []);
    } catch (e) {
      if (deepSeq !== deepRequestSeqRef.current) return;
      setDeepServerComplete(true);
      if (e instanceof Error && e.name === 'AbortError') {
        return;
      }
      setError(t('errorGeneric'));
      setDeepResults(null);
      setDeepSourceCandidates(null);
    }
  }, [candidates, selected, discoveryCorrelationId, t]);

  const downloadXlsx = useCallback(async () => {
    const { writeCompsV2CandidatesXlsx } = await import('@/lib/comps-v2/export-csv');
    await writeCompsV2CandidatesXlsx(results.sortedFilteredCandidates);
  }, [results.sortedFilteredCandidates]);

  const downloadCsv = useCallback(() => {
    const csv = compsV2CandidatesToCsv(results.sortedFilteredCandidates);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'comps-v2-export.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [results.sortedFilteredCandidates]);

  const deepExportCandidates = useMemo(
    () =>
      deepResults?.length
        ? deepEnrichResultsToExportCandidates(deepResults, deepSourceCandidates)
        : [],
    [deepResults, deepSourceCandidates]
  );

  const downloadDeepXlsx = useCallback(async () => {
    if (!deepExportCandidates.length) return;
    const { writeCompsV2CandidatesXlsx } = await import('@/lib/comps-v2/export-csv');
    const day = new Date().toISOString().slice(0, 10);
    await writeCompsV2CandidatesXlsx(deepExportCandidates, `comps-v2-deep-enrich-${day}.xlsx`);
  }, [deepExportCandidates]);

  const downloadDeepCsv = useCallback(() => {
    if (!deepExportCandidates.length) return;
    const csv = compsV2CandidatesToCsv(deepExportCandidates);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const day = new Date().toISOString().slice(0, 10);
    a.download = `comps-v2-deep-enrich-${day}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [deepExportCandidates]);

  return {
    t,
    sourceLabel,
    locationLine: discovery.locationLine,
    onLocationLineChange: discovery.onLocationLineChange,
    onPlaceParsed: discovery.onPlaceParsed,
    placeMapAnchor: discovery.placeMapAnchor,
    radiusMiles: discovery.radiusMiles,
    setRadiusMiles: discovery.setRadiusMiles,
    kinds,
    toggleKind,
    tiers,
    toggleTier,
    dataSources: discovery.dataSources,
    setDataSources: discovery.setDataSources,
    dataSourceOptions,
    glampingStrictOnly,
    loading: discovery.loading,
    discoveryRunId: discovery.discoveryRunId,
    discoveryServerComplete: discovery.discoveryServerComplete,
    discoveryStreamStepIndex: discovery.discoveryStreamStepIndex,
    discoveryStreamWarnings: discovery.discoveryStreamWarnings,
    discoveryLiveWebDiag: discovery.discoveryLiveWebDiag,
    discoveryStreamMarketCounts: discovery.discoveryStreamMarketCounts,
    discoveryStreamSourceTimingsMs: discovery.discoveryStreamSourceTimingsMs,
    discoveryCancelled: discovery.discoveryCancelled,
    discoveryEarlyTavilyErrors: discovery.discoveryEarlyTavilyErrors,
    error,
    webResearch,
    webResearchFirecrawlTopNUsed,
    gapFillLoading,
    runDiscovery: discovery.runDiscovery,
    runGapFillOnly,
    onDiscoveryUiFinished: discovery.onDiscoveryUiFinished,
    counts,
    geocode,
    searchContext,
    summaryStats,
    summaryCurrency,
    compositionRawRowsTotal,
    discoveryCorrelationId,
    discoverySourceTimingsMs,
    tierLabels,
    kindLabels,
    downloadXlsx,
    downloadCsv,
    sortedFilteredCandidates: results.sortedFilteredCandidates,
    candidates,
    filteredCandidates: results.filteredCandidates,
    resultsSearch: results.resultsSearch,
    setResultsSearch: results.setResultsSearch,
    filterSourceTables: results.filterSourceTables,
    setFilterSourceTables: results.setFilterSourceTables,
    dataSourceFilterOptions: results.dataSourceFilterOptions,
    filterTiers: results.filterTiers,
    setFilterTiers: results.setFilterTiers,
    tierFilterOptions: results.tierFilterOptions,
    resultsViewMode: results.resultsViewMode,
    setResultsViewMode: results.setResultsViewMode,
    resultsSort: results.resultsSort,
    onResultsSortHeaderClick: results.onResultsSortHeaderClick,
    selected,
    toggleSelect,
    firecrawlTopN,
    tavilyMaxQueries,
    tavilyResultsPerQuery,
    deepLoading,
    deepCancelling,
    deepRunId,
    deepServerComplete,
    runDeep,
    cancelDeepEnrich,
    onDeepEnrichUiFinished,
    deepResults,
    deepExportCandidates,
    downloadDeepXlsx,
    downloadDeepCsv,
    COMPS_V2_PROPERTY_KINDS,
  };
}
