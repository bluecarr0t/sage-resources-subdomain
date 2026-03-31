'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import type { WebResearchDiagnostics } from '@/lib/comps-v2/web-research-diagnostics';
import { compsV2SourceTableLabel } from '@/lib/comps-v2/source-table-i18n';

/** Per-step accent (done / active / pending) for a clearer, modern progress UI. */
const STEP_ACCENTS: Record<
  string,
  {
    doneText: string;
    doneIcon: string;
    activeText: string;
    activeIcon: string;
    activeRow: string;
    activeRing: string;
    pendingText: string;
    pendingIcon: string;
  }
> = {
  geocode: {
    doneText: 'text-sky-700 dark:text-sky-300',
    doneIcon: 'text-sky-500 dark:text-sky-400',
    activeText: 'text-sky-900 dark:text-sky-100',
    activeIcon: 'text-sky-600 dark:text-sky-400',
    activeRow: 'bg-sky-50/90 dark:bg-sky-950/35',
    activeRing: 'ring-sky-200/90 dark:ring-sky-800/50',
    pendingText: 'text-gray-500 dark:text-gray-500',
    pendingIcon: 'text-sky-200 dark:text-sky-900/50',
  },
  databases: {
    doneText: 'text-violet-700 dark:text-violet-300',
    doneIcon: 'text-violet-500 dark:text-violet-400',
    activeText: 'text-violet-900 dark:text-violet-100',
    activeIcon: 'text-violet-600 dark:text-violet-400',
    activeRow: 'bg-violet-50/90 dark:bg-violet-950/35',
    activeRing: 'ring-violet-200/90 dark:ring-violet-800/50',
    pendingText: 'text-gray-500 dark:text-gray-500',
    pendingIcon: 'text-violet-200 dark:text-violet-900/50',
  },
  merge: {
    doneText: 'text-amber-800 dark:text-amber-300',
    doneIcon: 'text-amber-500 dark:text-amber-400',
    activeText: 'text-amber-950 dark:text-amber-100',
    activeIcon: 'text-amber-600 dark:text-amber-400',
    activeRow: 'bg-amber-50/90 dark:bg-amber-950/30',
    activeRing: 'ring-amber-200/90 dark:ring-amber-800/50',
    pendingText: 'text-gray-500 dark:text-gray-500',
    pendingIcon: 'text-amber-200 dark:text-amber-900/50',
  },
  web: {
    doneText: 'text-teal-700 dark:text-teal-300',
    doneIcon: 'text-teal-500 dark:text-teal-400',
    activeText: 'text-teal-950 dark:text-teal-100',
    activeIcon: 'text-teal-600 dark:text-teal-400',
    activeRow: 'bg-teal-50/90 dark:bg-teal-950/35',
    activeRing: 'ring-teal-200/90 dark:ring-teal-800/50',
    pendingText: 'text-gray-500 dark:text-gray-500',
    pendingIcon: 'text-teal-200 dark:text-teal-900/50',
  },
  finalize: {
    doneText: 'text-sage-800 dark:text-sage-300',
    doneIcon: 'text-sage-600 dark:text-sage-400',
    activeText: 'text-sage-900 dark:text-sage-50',
    activeIcon: 'text-sage-600 dark:text-sage-400',
    activeRow: 'bg-sage-50/90 dark:bg-sage-900/35',
    activeRing: 'ring-sage-200/90 dark:ring-sage-800/50',
    pendingText: 'text-gray-500 dark:text-gray-500',
    pendingIcon: 'text-sage-200 dark:text-sage-900/50',
  },
};

function accentsForStep(id: string) {
  return STEP_ACCENTS[id] ?? STEP_ACCENTS.geocode;
}

type StepDef = {
  id: string;
  /** Minimum time this step stays on screen (readability over speed). */
  minDisplayMs: number;
  /** Conservative “seconds left” shown when this step is active (under-promise). */
  tailEstimateSec: number;
};

function buildSteps(
  webSearch: boolean,
  firecrawlTopN?: number,
  tavilyMaxQueries?: number
): StepDef[] {
  const core: StepDef[] = [
    { id: 'geocode', minDisplayMs: 2200, tailEstimateSec: 78 },
    { id: 'databases', minDisplayMs: 3400, tailEstimateSec: 58 },
    { id: 'merge', minDisplayMs: 2600, tailEstimateSec: 38 },
  ];
  if (webSearch) {
    const n = Math.min(8, Math.max(0, firecrawlTopN ?? 4));
    const q = Math.min(10, Math.max(1, tavilyMaxQueries ?? 10));
    const tailEstimateSec = Math.min(130, 18 + q * 9 + n * 12);
    const minDisplayMs = Math.min(18000, 2800 + q * 700 + n * 950);
    core.push({ id: 'web', minDisplayMs, tailEstimateSec });
  }
  core.push({ id: 'finalize', minDisplayMs: 400, tailEstimateSec: 0 });
  return core;
}

function sleep(ms: number, timers: number[]): Promise<void> {
  return new Promise((resolve) => {
    const id = window.setTimeout(resolve, ms);
    timers.push(id);
  });
}

/** Waits up to `maxMs` but ends early when the server has already responded. */
async function sleepUpTo(
  maxMs: number,
  serverCompleteRef: MutableRefObject<boolean>,
  timers: number[],
  pollMs = 120
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    if (serverCompleteRef.current) return;
    const elapsed = Date.now() - start;
    const chunk = Math.min(pollMs, maxMs - elapsed);
    await sleep(chunk, timers);
    if (serverCompleteRef.current) return;
  }
}

const MARKET_COUNT_KEYS = [
  'past_reports',
  'all_glamping_properties',
  'hipcamp',
  'all_roverpass_data_new',
  'campspot',
] as const;

function formatMarketCountsLine(
  counts: Record<string, number>,
  label: (table: string) => string
): string {
  const parts: string[] = [];
  for (const k of MARKET_COUNT_KEYS) {
    if (typeof counts[k] === 'number' && Number.isFinite(counts[k])) {
      parts.push(`${label(k)}: ${counts[k]}`);
    }
  }
  return parts.join(' · ');
}

function formatSourceTimingsLine(
  timings: Record<string, number>,
  label: (table: string) => string
): string {
  return Object.entries(timings)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, ms]) => `${label(k)} ${ms}ms`)
    .join(' · ');
}

interface CompsV2DiscoveryProgressProps {
  runId: number;
  serverComplete: boolean;
  webSearchEnabled: boolean;
  /** When true, step index follows server NDJSON phases instead of the heuristic timer. */
  streamDriven?: boolean;
  /** Active step index (0..n-1) from streamed phases; ignored when not streamDriven. */
  streamActiveStepIndex?: number;
  /** Warnings from market queries (e.g. 0-row sources). */
  streamWarnings?: string[];
  /** Latest web-research diagnostics snapshot (partial during Firecrawl). */
  streamWebDiagnostics?: WebResearchDiagnostics | null;
  /** Row counts after market phase (for the databases step). */
  streamMarketCounts?: Record<string, number> | null;
  /** Per-source query duration after market phase (ms). */
  streamSourceTimingsMs?: Record<string, number> | null;
  /** User aborted the fetch. */
  streamCancelled?: boolean;
  /** When web search runs, scales the web step estimate with Firecrawl page cap (fallback timer only). */
  firecrawlTopN?: number;
  /** Distinct Tavily API calls budgeted (1–10); scales the web step estimate (fallback timer only). */
  tavilyMaxQueries?: number;
  /** Max raw SERP rows per Tavily call (1–10); shown in Web research sub-steps. */
  tavilyResultsPerQuery?: number;
  onComplete: () => void;
}

/**
 * Step-by-step discovery progress with conservative time remaining (fallback) or live server phases (stream).
 */
export default function CompsV2DiscoveryProgress({
  runId,
  serverComplete,
  webSearchEnabled,
  streamDriven = false,
  streamActiveStepIndex = 0,
  streamWarnings = [],
  streamWebDiagnostics = null,
  streamMarketCounts = null,
  streamSourceTimingsMs = null,
  streamCancelled = false,
  firecrawlTopN,
  tavilyMaxQueries,
  tavilyResultsPerQuery,
  onComplete,
}: CompsV2DiscoveryProgressProps) {
  const t = useTranslations('admin.compsV2');
  const steps = useMemo(
    () => buildSteps(webSearchEnabled, firecrawlTopN, tavilyMaxQueries),
    [webSearchEnabled, firecrawlTopN, tavilyMaxQueries]
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const serverCompleteRef = useRef(serverComplete);
  const onCompleteRef = useRef(onComplete);
  const stepsRef = useRef(steps);
  const finishedRef = useRef(false);

  const tavilyQ = Math.min(10, Math.max(1, tavilyMaxQueries ?? 10));
  const tavilyRows = Math.min(10, Math.max(1, tavilyResultsPerQuery ?? 10));
  const fcPages = Math.min(8, Math.max(0, firecrawlTopN ?? 0));

  serverCompleteRef.current = serverComplete;
  onCompleteRef.current = onComplete;
  stepsRef.current = steps;

  const mergedWarnings = useMemo(() => {
    const fromTavily = streamWebDiagnostics?.tavily?.queryErrors ?? [];
    const set = new Set<string>();
    const out: string[] = [];
    for (const w of [...streamWarnings, ...fromTavily]) {
      const s = w.trim();
      if (!s || set.has(s)) continue;
      set.add(s);
      out.push(s);
    }
    return out;
  }, [streamWarnings, streamWebDiagnostics]);

  const sourceLabel = useCallback((table: string) => compsV2SourceTableLabel(table, t), [t]);

  const webTallyLine =
    streamWebDiagnostics && webSearchEnabled
      ? t('discoveryLiveWebTallies', {
          tavilyDone: streamWebDiagnostics.tavily.queriesCompleted,
          tavilyPlanned: streamWebDiagnostics.tavily.queriesPlanned,
          tavilyRaw: streamWebDiagnostics.tavily.rawResultRowsFromApi,
          fcEnriched: streamWebDiagnostics.firecrawl.enriched,
          fcAttempted: streamWebDiagnostics.firecrawl.attempted,
          gGeo: streamWebDiagnostics.googleGeocodeCalls ?? 0,
          nGeo: streamWebDiagnostics.nominatimGeocodeCalls ?? 0,
          distHits: streamWebDiagnostics.webDistanceGeocodeHits ?? 0,
          distAttempts: streamWebDiagnostics.webDistanceGeocodeAttempts ?? 0,
        })
      : null;

  const databasesSubtitle = useMemo(
    () =>
      streamMarketCounts && Object.keys(streamMarketCounts).length > 0
        ? formatMarketCountsLine(streamMarketCounts, sourceLabel)
        : null,
    [streamMarketCounts, sourceLabel]
  );
  const databasesTimingsSubtitle = useMemo(
    () =>
      streamSourceTimingsMs && Object.keys(streamSourceTimingsMs).length > 0
        ? formatSourceTimingsLine(streamSourceTimingsMs, sourceLabel)
        : null,
    [streamSourceTimingsMs, sourceLabel]
  );

  /** NDJSON-driven: sync active step; finish after server complete. */
  useEffect(() => {
    if (!streamDriven) return;
    finishedRef.current = false;
    if (streamCancelled) {
      const id = window.setTimeout(() => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        onCompleteRef.current();
      }, 320);
      return () => window.clearTimeout(id);
    }
    const fin = stepsRef.current.length - 1;
    if (!serverComplete) {
      setActiveIndex(Math.min(Math.max(0, streamActiveStepIndex), fin));
      setSecondsLeft(0);
    }
  }, [streamDriven, streamCancelled, streamActiveStepIndex, serverComplete, runId]);

  useEffect(() => {
    if (!streamDriven || streamCancelled || !serverComplete) return;
    const fin = stepsRef.current.length - 1;
    setActiveIndex(fin);
    setSecondsLeft(0);
    const ms = stepsRef.current[fin]?.minDisplayMs ?? 400;
    const id = window.setTimeout(() => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      onCompleteRef.current();
    }, ms);
    return () => window.clearTimeout(id);
  }, [streamDriven, streamCancelled, serverComplete, runId]);

  /** Heuristic timer when streaming is off (tests / legacy). */
  useEffect(() => {
    if (streamDriven) return;
    finishedRef.current = false;
    const finalizeIdx = steps.length - 1;
    const lastWorkIdx = finalizeIdx - 1;

    setActiveIndex(0);
    setSecondsLeft(steps[0]?.tailEstimateSec ?? 0);

    const timers: number[] = [];
    let cancelled = false;

    void (async () => {
      for (let i = 0; i < finalizeIdx; i++) {
        if (cancelled) return;
        setActiveIndex(i);
        setSecondsLeft(steps[i].tailEstimateSec);
        await sleepUpTo(steps[i].minDisplayMs, serverCompleteRef, timers);
        if (cancelled) return;
        if (serverCompleteRef.current) break;
      }

      if (!serverCompleteRef.current && !cancelled) {
        setActiveIndex(lastWorkIdx);
        setSecondsLeft(steps[lastWorkIdx].tailEstimateSec);
        while (!cancelled && !serverCompleteRef.current) {
          await sleep(500, timers);
          if (cancelled) return;
          setSecondsLeft((s) => Math.max(8, s > 15 ? s - 1 : s));
        }
      }

      if (cancelled) return;

      const fin = stepsRef.current.length - 1;
      setActiveIndex(fin);
      setSecondsLeft(0);
      await sleepUpTo(stepsRef.current[fin].minDisplayMs, serverCompleteRef, timers);
      if (cancelled || finishedRef.current) return;
      finishedRef.current = true;
      onCompleteRef.current();
    })();

    return () => {
      cancelled = true;
      timers.forEach((tid) => window.clearTimeout(tid));
    };
  }, [runId, steps, streamDriven]);

  const stepLabel = (id: string) => {
    switch (id) {
      case 'geocode':
        return t('discoveryStepGeocode');
      case 'databases':
        return t('discoveryStepDatabases');
      case 'merge':
        return t('discoveryStepMerge');
      case 'web':
        return t('discoveryStepWeb');
      case 'finalize':
        return t('discoveryStepFinalize');
      default:
        return id;
    }
  };

  const busy = !serverComplete && !streamCancelled;
  const headerRight = streamCancelled
    ? null
    : streamDriven && busy
      ? t('discoveryLiveProgressLabel')
      : secondsLeft > 0
        ? t('discoveryTimeRemaining', { seconds: Math.max(8, secondsLeft) })
        : serverComplete
          ? t('discoveryAlmostDone')
          : t('discoveryLiveProgressLabel');

  return (
    <div
      className="rounded-xl border border-gray-200/90 dark:border-gray-700 bg-gradient-to-b from-white to-gray-50/90 dark:from-gray-900/80 dark:to-gray-950/60 p-4 space-y-3 shadow-sm"
      role="status"
      aria-live="polite"
      aria-busy={busy}
    >
      {streamCancelled ? (
        <p className="text-sm font-medium text-amber-800 dark:text-amber-200 m-0">{t('discoveryCancelledBanner')}</p>
      ) : null}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('discoveryProgressTitle')}</p>
        {headerRight ? (
          <p className="text-sm tabular-nums font-medium text-sage-700 dark:text-sage-400">{headerRight}</p>
        ) : null}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{t('discoveryProgressHint')}</p>
      {mergedWarnings.length > 0 ? (
        <div className="rounded-lg border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/90 dark:bg-amber-950/25 px-3 py-2">
          <p className="text-xs font-semibold text-amber-900 dark:text-amber-100 m-0 mb-1">
            {t('discoveryStreamWarningsHeading')}
          </p>
          <ul className="m-0 pl-4 list-disc text-xs text-amber-950/90 dark:text-amber-100/90 space-y-0.5">
            {mergedWarnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <ol className="space-y-1.5">
        {steps.map((step, i) => {
          const done = i < activeIndex;
          const active = i === activeIndex;
          const a = accentsForStep(step.id);
          const rowClass = done
            ? a.doneText
            : active
              ? streamCancelled
                ? a.pendingText
                : `${a.activeText} font-medium ${a.activeRow} ring-1 ${a.activeRing} shadow-sm`
              : a.pendingText;
          const isWeb = step.id === 'web';
          const isDb = step.id === 'databases';
          return (
            <li
              key={step.id}
              className={`rounded-lg px-3 py-2.5 text-sm transition-colors duration-200 ${
                isWeb ? 'flex flex-col gap-2' : 'flex gap-3 items-center'
              } ${rowClass}`}
            >
              <div className={`flex gap-3 items-center min-w-0 ${isWeb ? '' : 'w-full'}`}>
                <span className="shrink-0" aria-hidden>
                  {done ? (
                    <CheckCircle2 className={`h-5 w-5 ${a.doneIcon}`} strokeWidth={2.25} />
                  ) : active ? (
                    streamCancelled ? (
                      <Circle className={`h-5 w-5 ${a.pendingIcon}`} strokeWidth={1.75} />
                    ) : (
                      <Loader2 className={`h-5 w-5 animate-spin ${a.activeIcon}`} strokeWidth={2.25} />
                    )
                  ) : (
                    <Circle className={`h-5 w-5 ${a.pendingIcon}`} strokeWidth={1.75} />
                  )}
                </span>
                <span className="min-w-0 leading-snug flex flex-col gap-0.5">
                  <span>{stepLabel(step.id)}</span>
                  {isDb && databasesSubtitle ? (
                    <span className="text-[11px] font-normal text-violet-800/85 dark:text-violet-200/80">
                      {t('discoveryLiveMarketCounts')}: {databasesSubtitle}
                    </span>
                  ) : null}
                  {isDb && databasesTimingsSubtitle ? (
                    <span className="text-[11px] font-normal text-violet-700/75 dark:text-violet-300/70">
                      {t('discoveryLiveSourceTimings')}: {databasesTimingsSubtitle}
                    </span>
                  ) : null}
                </span>
              </div>
              {isWeb ? (
                <div className="ml-8 sm:ml-11 space-y-1.5 border-l-2 border-teal-200/70 dark:border-teal-800/50 pl-3 -mt-0.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-800/90 dark:text-teal-200/90 m-0">
                    {t('discoveryWebSubheading')}
                  </p>
                  <ul className="m-0 pl-4 list-disc text-xs text-teal-900/85 dark:text-teal-100/80 space-y-1 leading-snug">
                    <li>
                      <span className="block">
                        {streamWebDiagnostics
                          ? t('discoveryWebSubTavilyLive', {
                              completed: streamWebDiagnostics.tavily.queriesCompleted,
                              planned: streamWebDiagnostics.tavily.queriesPlanned,
                              raw: streamWebDiagnostics.tavily.rawResultRowsFromApi,
                              maxQueries: tavilyQ,
                              resultsPerQuery: tavilyRows,
                            })
                          : t('discoveryWebSubTavily', { maxQueries: tavilyQ, resultsPerQuery: tavilyRows })}
                      </span>
                      {streamWebDiagnostics && streamWebDiagnostics.tavily.queryErrors.length > 0 ? (
                        <span className="block text-amber-800 dark:text-amber-200 mt-0.5 font-medium">
                          {t('discoveryWebSubTavilyLiveErrors', {
                            count: streamWebDiagnostics.tavily.queryErrors.length,
                          })}
                        </span>
                      ) : null}
                    </li>
                    <li>
                      {streamWebDiagnostics
                        ? t('discoveryWebSubFirecrawlLive', {
                            enriched: streamWebDiagnostics.firecrawl.enriched,
                            attempted: streamWebDiagnostics.firecrawl.attempted,
                            cap: fcPages,
                          })
                        : t('discoveryWebSubFirecrawl', { firecrawlPages: fcPages })}
                    </li>
                    <li>
                      {streamWebDiagnostics
                        ? t('discoveryWebSubGeocodeLive', {
                            gGeo: streamWebDiagnostics.googleGeocodeCalls ?? 0,
                            nGeo: streamWebDiagnostics.nominatimGeocodeCalls ?? 0,
                            distHits: streamWebDiagnostics.webDistanceGeocodeHits ?? 0,
                            distAttempts: streamWebDiagnostics.webDistanceGeocodeAttempts ?? 0,
                          })
                        : t('discoveryWebSubGeocode')}
                    </li>
                    <li>{t('discoveryWebSubDedupe')}</li>
                  </ul>
                  {webTallyLine ? (
                    <p className="text-[11px] text-teal-900/90 dark:text-teal-100/85 m-0 leading-snug tabular-nums">
                      {webTallyLine}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
