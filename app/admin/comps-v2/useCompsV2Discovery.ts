'use client';

import { useCallback, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { ParsedPlaceComponents } from '@/components/CompsV2AddressPlaceInput';
import type { CompsV2Translate } from '@/lib/comps-v2/admin-client-errors';
import { mergeUniqueErrorStrings } from '@/lib/comps-v2/admin-client-errors';
import { consumeCompsV2DiscoveryNdjson } from '@/lib/comps-v2/discovery-ndjson-client';
import {
  clamp,
  COMPS_V2_MAX_RESULTS_MAX,
  COMPS_V2_MAX_RESULTS_MIN,
} from '@/lib/comps-v2/parse-body';
import type { CompsV2SearchStreamEvent } from '@/lib/comps-v2/search-stream-events';
import type { CompsV2Candidate } from '@/lib/comps-v2/types';
import type { CompsV2PropertyKind, QualityTier } from '@/lib/comps-v2/types';
import type { WebResearchDiagnostics } from '@/lib/comps-v2/web-research-diagnostics';
import {
  DATA_SOURCE_KEYS,
  DEFAULT_COMPS_V2_LOCATION_LINE,
  DEFAULT_COMPS_V2_PLACE_ANCHOR,
  type DataSourceKey,
} from '@/app/admin/comps-v2/comps-v2-page-constants';

export type DiscoveryStreamSuccessPayload = {
  geocode: { lat: number; lng: number };
  counts?: Record<string, number> | null;
  candidates?: CompsV2Candidate[];
  webResearch?: WebResearchDiagnostics | null | undefined;
  searchContext?: { anchorCity?: string; stateAbbr?: string };
  correlationId?: string;
  sourceTimingsMs?: Record<string, number>;
};

export interface UseCompsV2DiscoveryParams {
  t: CompsV2Translate;
  kinds: Set<CompsV2PropertyKind>;
  tiers: Set<QualityTier>;
  maxMergedResults: number;
  firecrawlTopN: number;
  maxWebComps: number;
  tavilyMaxQueries: number;
  tavilyResultsPerQuery: number;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  applyDiscoverySuccessPayload: (data: DiscoveryStreamSuccessPayload) => void;
  clearDiscoveryOnFailure: () => void;
  gapFillAbortRef: MutableRefObject<AbortController | null>;
  deepAbortRef: MutableRefObject<AbortController | null>;
  onClearDeepForNewDiscovery: () => void;
  setDiscoveryCorrelationId: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useCompsV2Discovery({
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
}: UseCompsV2DiscoveryParams) {
  const [locationLine, setLocationLine] = useState(DEFAULT_COMPS_V2_LOCATION_LINE);
  const [placeMapAnchor, setPlaceMapAnchor] = useState<{ lat: number; lng: number } | null>(
    () => ({ ...DEFAULT_COMPS_V2_PLACE_ANCHOR })
  );
  const lastPickedPlaceLineRef = useRef<string | null>(DEFAULT_COMPS_V2_LOCATION_LINE);
  const discoveryRequestSeqRef = useRef(0);
  const discoveryAbortRef = useRef<AbortController | null>(null);

  const [radiusMiles, setRadiusMiles] = useState(100);
  const [dataSources, setDataSources] = useState<Set<DataSourceKey>>(
    () => new Set(DATA_SOURCE_KEYS)
  );

  const [loading, setLoading] = useState(false);
  const [discoveryRunId, setDiscoveryRunId] = useState(0);
  const [discoveryServerComplete, setDiscoveryServerComplete] = useState(false);
  const [discoveryStreamStepIndex, setDiscoveryStreamStepIndex] = useState(0);
  const [discoveryStreamWarnings, setDiscoveryStreamWarnings] = useState<string[]>([]);
  const [discoveryLiveWebDiag, setDiscoveryLiveWebDiag] = useState<WebResearchDiagnostics | null>(
    null
  );
  const [discoveryStreamMarketCounts, setDiscoveryStreamMarketCounts] = useState<Record<
    string,
    number
  > | null>(null);
  const [discoveryCancelled, setDiscoveryCancelled] = useState(false);
  const [discoveryEarlyTavilyErrors, setDiscoveryEarlyTavilyErrors] = useState<string[]>([]);
  const [discoveryStreamSourceTimingsMs, setDiscoveryStreamSourceTimingsMs] = useState<Record<
    string,
    number
  > | null>(null);

  const onLocationLineChange = useCallback((value: string) => {
    setLocationLine(value);
    const trimmed = value.trim();
    const last = lastPickedPlaceLineRef.current;
    if (last != null && trimmed !== last) {
      lastPickedPlaceLineRef.current = null;
      setPlaceMapAnchor(null);
    }
  }, []);

  const onPlaceParsed = useCallback((p: ParsedPlaceComponents) => {
    if (p.lat != null && p.lng != null && Number.isFinite(p.lat) && Number.isFinite(p.lng)) {
      setPlaceMapAnchor({ lat: p.lat, lng: p.lng });
      lastPickedPlaceLineRef.current = p.formattedAddress.trim();
      setRadiusMiles(100);
    }
  }, []);

  const onDiscoveryUiFinished = useCallback(() => {
    setLoading(false);
    setDiscoveryServerComplete(false);
    setDiscoveryStreamStepIndex(0);
    setDiscoveryStreamWarnings([]);
    setDiscoveryLiveWebDiag(null);
    setDiscoveryStreamMarketCounts(null);
    setDiscoveryStreamSourceTimingsMs(null);
    setDiscoveryEarlyTavilyErrors([]);
    setDiscoveryCancelled(false);
  }, []);

  const runDiscovery = useCallback(async () => {
    setError(null);
    onClearDeepForNewDiscovery();
    const propertyKinds = [...kinds];
    if (propertyKinds.length === 0) {
      setError(t('errorSelectPropertyKind'));
      return;
    }
    if (dataSources.size === 0) {
      setError(t('sourcesRequired'));
      return;
    }
    const glampingStrictOnlyRun =
      propertyKinds.includes('glamping') &&
      !propertyKinds.includes('rv') &&
      !propertyKinds.includes('campground');

    setDiscoveryServerComplete(false);
    setDiscoveryRunId((n) => n + 1);
    setLoading(true);
    setDiscoveryStreamStepIndex(0);
    setDiscoveryStreamWarnings([]);
    setDiscoveryLiveWebDiag(null);
    setDiscoveryStreamMarketCounts(null);
    setDiscoveryStreamSourceTimingsMs(null);
    setDiscoveryCancelled(false);
    setDiscoveryEarlyTavilyErrors([]);
    setDiscoveryCorrelationId(null);

    discoveryAbortRef.current?.abort();
    gapFillAbortRef.current?.abort();
    deepAbortRef.current?.abort();
    discoveryRequestSeqRef.current += 1;
    const discoverySeq = discoveryRequestSeqRef.current;
    const ac = new AbortController();
    discoveryAbortRef.current = ac;

    const webEnabled = dataSources.has('web_search');
    const finalizeStepIndex = webEnabled ? 4 : 3;
    const seqOk = () => discoverySeq === discoveryRequestSeqRef.current;

    try {
      const mergedCap = clamp(maxMergedResults, COMPS_V2_MAX_RESULTS_MIN, COMPS_V2_MAX_RESULTS_MAX);
      const res = await fetch('/api/admin/comps-v2/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: ac.signal,
        body: JSON.stringify({
          locationLine: locationLine.trim() || undefined,
          radiusMiles,
          maxResults: mergedCap,
          propertyKinds,
          qualityTiers: tiers.size ? [...tiers] : undefined,
          firecrawlTopN,
          maxGapComps: maxWebComps,
          tavilyMaxQueries,
          tavilyResultsPerQuery,
          stream: true,
          sources: {
            pastReports: dataSources.has('pastReports'),
            all_glamping_properties: dataSources.has('all_glamping_properties'),
            hipcamp: dataSources.has('hipcamp'),
            all_roverpass_data_new:
              !glampingStrictOnlyRun && dataSources.has('all_roverpass_data_new'),
            campspot: !glampingStrictOnlyRun && dataSources.has('campspot'),
            web_search: dataSources.has('web_search'),
          },
        }),
      });

      const ct = res.headers.get('content-type') ?? '';
      if (ct.includes('ndjson')) {
        let streamError: string | undefined;
        let gotResult = false;
        const ndjsonMessages = {
          corruptLine: t('errorDiscoveryStreamCorrupt'),
          unexpectedError: t('errorGeneric'),
        };
        const ndjsonResult = await consumeCompsV2DiscoveryNdjson(
          res,
          ac.signal,
          (ev: CompsV2SearchStreamEvent) => {
            if (!seqOk()) return;
            switch (ev.type) {
              case 'meta':
                setDiscoveryCorrelationId(ev.correlationId);
                break;
              case 'phase':
                if (ev.step === 'geocode' && ev.status === 'complete') {
                  setDiscoveryStreamStepIndex(1);
                }
                if (ev.step === 'markets' && ev.status === 'complete') {
                  setDiscoveryStreamStepIndex(2);
                  setDiscoveryStreamMarketCounts(ev.counts);
                  if (ev.sourceTimingsMs && Object.keys(ev.sourceTimingsMs).length > 0) {
                    setDiscoveryStreamSourceTimingsMs(ev.sourceTimingsMs);
                  }
                  if (ev.warnings?.length) setDiscoveryStreamWarnings(ev.warnings);
                }
                if (ev.step === 'merge' && ev.status === 'complete') {
                  setDiscoveryStreamStepIndex(webEnabled ? 3 : finalizeStepIndex);
                }
                if (ev.step === 'web') {
                  if (ev.status === 'started') setDiscoveryStreamStepIndex(3);
                  if (ev.status === 'complete') setDiscoveryStreamStepIndex(finalizeStepIndex);
                }
                break;
              case 'web_progress':
                setDiscoveryLiveWebDiag(ev.diagnostics);
                if (ev.diagnostics.tavily.queryErrors.length > 0) {
                  setDiscoveryEarlyTavilyErrors((prev) =>
                    mergeUniqueErrorStrings(prev, ev.diagnostics.tavily.queryErrors)
                  );
                }
                break;
              case 'result': {
                gotResult = true;
                setDiscoveryStreamStepIndex(finalizeStepIndex);
                setDiscoveryServerComplete(true);
                const { type: _tp, success: _ok, ...payload } = ev;
                applyDiscoverySuccessPayload(payload);
                break;
              }
              case 'error':
                streamError = ev.message || t('errorGeneric');
                setDiscoveryServerComplete(true);
                clearDiscoveryOnFailure();
                setError(streamError);
                break;
              default:
                break;
            }
          },
          ndjsonMessages
        );
        if (!seqOk()) return;
        if (!ndjsonResult.ok) {
          setDiscoveryServerComplete(true);
          clearDiscoveryOnFailure();
          setError(ndjsonResult.message);
          return;
        }
        if (streamError) return;
        if (!gotResult) {
          setDiscoveryServerComplete(true);
          clearDiscoveryOnFailure();
          setError(t('errorGeneric'));
        }
      } else {
        const cid = res.headers.get('X-Discovery-Correlation-Id');
        if (cid) setDiscoveryCorrelationId(cid);
        const data = await res.json();
        if (!seqOk()) return;
        setDiscoveryServerComplete(true);
        if (!data.success) {
          setError(data.message || t('errorGeneric'));
          clearDiscoveryOnFailure();
          return;
        }
        applyDiscoverySuccessPayload(data);
      }
    } catch (e) {
      if (!seqOk()) return;
      const aborted =
        (e instanceof DOMException || e instanceof Error) && e.name === 'AbortError';
      if (aborted) {
        setDiscoveryCancelled(true);
        setDiscoveryServerComplete(true);
        return;
      }
      setDiscoveryServerComplete(true);
      setError(t('errorGeneric'));
      clearDiscoveryOnFailure();
    }
  }, [
    kinds,
    locationLine,
    radiusMiles,
    maxMergedResults,
    tiers,
    dataSources,
    firecrawlTopN,
    maxWebComps,
    tavilyMaxQueries,
    tavilyResultsPerQuery,
    t,
    applyDiscoverySuccessPayload,
    clearDiscoveryOnFailure,
    setError,
    gapFillAbortRef,
    deepAbortRef,
    onClearDeepForNewDiscovery,
    setDiscoveryCorrelationId,
  ]);

  return {
    discoveryAbortRef,
    locationLine,
    onLocationLineChange,
    onPlaceParsed,
    placeMapAnchor,
    radiusMiles,
    setRadiusMiles,
    dataSources,
    setDataSources,
    loading,
    discoveryRunId,
    discoveryServerComplete,
    discoveryStreamStepIndex,
    discoveryStreamWarnings,
    discoveryLiveWebDiag,
    discoveryStreamMarketCounts,
    discoveryStreamSourceTimingsMs,
    discoveryCancelled,
    discoveryEarlyTavilyErrors,
    runDiscovery,
    onDiscoveryUiFinished,
  };
}
