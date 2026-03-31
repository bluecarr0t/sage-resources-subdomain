'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui';
import { Activity, Loader2, RefreshCw } from 'lucide-react';

type CompsTotals = {
  runCount: number;
  tavily_queries_planned: number;
  tavily_queries_completed: number;
  tavily_raw_rows: number;
  firecrawl_attempted: number;
  firecrawl_enriched: number;
  web_geocode_attempts: number;
  web_geocode_hits: number;
  google_geocode_calls: number;
  nominatim_geocode_calls: number;
  searchRuns: number;
  gapFillRuns: number;
};

type CompsDayRow = CompsTotals & { date: string };

type AiTotals = {
  eventCount: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

type AiDayRow = AiTotals & { date: string };

type AdminAiRecentEvent = {
  created_at: string;
  feature: string;
  provider: string | null;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  task: string | null;
  propertyName: string | null;
  latencyMs: number | null;
};

type UsageSummary = {
  range: { from: string; to: string };
  warnings: { compsRunsLoadFailed: boolean; aiEventsLoadFailed: boolean };
  compsV2: { totals: CompsTotals; byDay: CompsDayRow[] };
  adminAi: {
    totals: AiTotals;
    byDay: AiDayRow[];
    byFeature: Record<string, AiTotals>;
    recentEvents?: AdminAiRecentEvent[];
  };
};

function toInputDate(iso: string): string {
  return iso.slice(0, 10);
}

export default function UsagePanelPage() {
  const t = useTranslations('admin.usagePanel');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [feature, setFeature] = useState('');
  const [data, setData] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(
    async (opts: { useFormDates: boolean; useFeatureFilter: boolean }) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (opts.useFormDates) {
          if (from) params.set('from', from);
          if (to) params.set('to', to);
        }
        if (opts.useFeatureFilter && feature.trim()) {
          params.set('feature', feature.trim());
        }
        const q = params.toString();
        const res = await fetch(q ? `/api/admin/usage/summary?${q}` : '/api/admin/usage/summary');
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || t('loadError'));
        }
        setData(json);
        if (!opts.useFormDates && json.range) {
          setFrom(toInputDate(json.range.from));
          setTo(toInputDate(json.range.to));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : t('loadError'));
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [from, to, feature, t]
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/admin/usage/summary');
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          throw new Error(json.error || t('loadError'));
        }
        setData(json);
        if (json.range) {
          setFrom(toInputDate(json.range.from));
          setTo(toInputDate(json.range.to));
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t('loadError'));
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const applyRange = () => {
    void fetchSummary({ useFormDates: true, useFeatureFilter: true });
  };

  const refresh = () => {
    const hasDates = Boolean(from && to);
    void fetchSummary({
      useFormDates: hasDates,
      useFeatureFilter: Boolean(feature.trim()),
    });
  };

  return (
    <main className="pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Activity className="w-10 h-10 text-sage-600" />
              {t('title')}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {t('refresh')}
          </button>
        </div>

        <Card className="p-4 sm:p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('filters')}</h2>
          <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-end">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-gray-600 dark:text-gray-400">{t('from')}</span>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-gray-600 dark:text-gray-400">{t('to')}</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm min-w-[12rem]">
              <span className="text-gray-600 dark:text-gray-400">{t('feature')}</span>
              <input
                type="text"
                value={feature}
                onChange={(e) => setFeature(e.target.value)}
                placeholder={t('featurePlaceholder')}
                className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
              />
            </label>
            <button
              type="button"
              onClick={applyRange}
              disabled={loading}
              className="rounded-lg bg-sage-600 text-white px-4 py-2 text-sm font-medium hover:bg-sage-700 disabled:opacity-50"
            >
              {t('apply')}
            </button>
          </div>
          {data?.warnings?.compsRunsLoadFailed || data?.warnings?.aiEventsLoadFailed ? (
            <p className="mt-4 text-sm text-amber-700 dark:text-amber-300">{t('partialDataWarning')}</p>
          ) : null}
        </Card>

        {error ? (
          <p className="text-red-600 dark:text-red-400 mb-6">{error}</p>
        ) : null}

        {loading && !data ? (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            {t('loading')}
          </div>
        ) : null}

        {data ? (
          <div className="space-y-10">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {t('compsV2Section')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('compsV2Note')}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
                <Stat label={t('runs')} value={data.compsV2.totals.runCount} />
                <Stat label={t('searchRuns')} value={data.compsV2.totals.searchRuns} />
                <Stat label={t('gapFillRuns')} value={data.compsV2.totals.gapFillRuns} />
                <Stat label={t('tavilyCompleted')} value={data.compsV2.totals.tavily_queries_completed} />
                <Stat label={t('tavilyRawRows')} value={data.compsV2.totals.tavily_raw_rows} />
                <Stat label={t('firecrawlAttempted')} value={data.compsV2.totals.firecrawl_attempted} />
                <Stat label={t('firecrawlEnriched')} value={data.compsV2.totals.firecrawl_enriched} />
                <Stat label={t('webGeocodeAttempts')} value={data.compsV2.totals.web_geocode_attempts} />
                <Stat label={t('webGeocodeHits')} value={data.compsV2.totals.web_geocode_hits} />
                <Stat label={t('googleGeocodeCalls')} value={data.compsV2.totals.google_geocode_calls} />
                <Stat label={t('nominatimGeocodeCalls')} value={data.compsV2.totals.nominatim_geocode_calls} />
              </div>
              <Card className="overflow-x-auto p-0">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-white/5">
                    <tr>
                      <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">{t('date')}</th>
                      <th className="text-right p-3 font-medium text-gray-700 dark:text-gray-300">{t('runs')}</th>
                      <th className="text-right p-3 font-medium text-gray-700 dark:text-gray-300">
                        {t('tavilyCompleted')}
                      </th>
                      <th className="text-right p-3 font-medium text-gray-700 dark:text-gray-300">
                        {t('firecrawlEnriched')}
                      </th>
                      <th className="text-right p-3 font-medium text-gray-700 dark:text-gray-300">
                        {t('googleGeocodeCalls')}
                      </th>
                      <th className="text-right p-3 font-medium text-gray-700 dark:text-gray-300">
                        {t('nominatimGeocodeCalls')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.compsV2.byDay.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-gray-500">
                          {t('noCompsData')}
                        </td>
                      </tr>
                    ) : (
                      data.compsV2.byDay.map((row) => (
                        <tr key={row.date} className="border-t border-gray-100 dark:border-gray-800">
                          <td className="p-3 text-gray-900 dark:text-gray-100">{row.date}</td>
                          <td className="p-3 text-right tabular-nums">{row.runCount}</td>
                          <td className="p-3 text-right tabular-nums">{row.tavily_queries_completed}</td>
                          <td className="p-3 text-right tabular-nums">{row.firecrawl_enriched}</td>
                          <td className="p-3 text-right tabular-nums">{row.google_geocode_calls}</td>
                          <td className="p-3 text-right tabular-nums">{row.nominatim_geocode_calls}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </Card>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {t('adminAiSection')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('adminAiNote')}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <Stat label={t('aiEvents')} value={data.adminAi.totals.eventCount} />
                <Stat label={t('inputTokens')} value={data.adminAi.totals.inputTokens} />
                <Stat label={t('outputTokens')} value={data.adminAi.totals.outputTokens} />
                <Stat label={t('totalTokens')} value={data.adminAi.totals.totalTokens} />
              </div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">{t('byFeature')}</h3>
              <Card className="overflow-x-auto p-0 mb-6">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-white/5">
                    <tr>
                      <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">
                        {t('featureColumn')}
                      </th>
                      <th className="text-right p-3 font-medium text-gray-700 dark:text-gray-300">{t('aiEvents')}</th>
                      <th className="text-right p-3 font-medium text-gray-700 dark:text-gray-300">{t('inputTokens')}</th>
                      <th className="text-right p-3 font-medium text-gray-700 dark:text-gray-300">{t('outputTokens')}</th>
                      <th className="text-right p-3 font-medium text-gray-700 dark:text-gray-300">{t('totalTokens')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(data.adminAi.byFeature).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-gray-500">
                          {t('noAiData')}
                        </td>
                      </tr>
                    ) : (
                      Object.entries(data.adminAi.byFeature).map(([feat, row]) => (
                        <tr key={feat} className="border-t border-gray-100 dark:border-gray-800">
                          <td className="p-3 font-mono text-xs text-gray-900 dark:text-gray-100">{feat}</td>
                          <td className="p-3 text-right tabular-nums">{row.eventCount}</td>
                          <td className="p-3 text-right tabular-nums">{row.inputTokens}</td>
                          <td className="p-3 text-right tabular-nums">{row.outputTokens}</td>
                          <td className="p-3 text-right tabular-nums">{row.totalTokens}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </Card>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">{t('byDay')}</h3>
              <Card className="overflow-x-auto p-0 mb-6">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-white/5">
                    <tr>
                      <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">{t('date')}</th>
                      <th className="text-right p-3 font-medium text-gray-700 dark:text-gray-300">{t('aiEvents')}</th>
                      <th className="text-right p-3 font-medium text-gray-700 dark:text-gray-300">{t('totalTokens')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.adminAi.byDay.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-4 text-gray-500">
                          {t('noAiData')}
                        </td>
                      </tr>
                    ) : (
                      data.adminAi.byDay.map((row) => (
                        <tr key={row.date} className="border-t border-gray-100 dark:border-gray-800">
                          <td className="p-3 text-gray-900 dark:text-gray-100">{row.date}</td>
                          <td className="p-3 text-right tabular-nums">{row.eventCount}</td>
                          <td className="p-3 text-right tabular-nums">{row.totalTokens}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </Card>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">{t('recentAiEvents')}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t('recentAiEventsNote')}</p>
              <Card className="overflow-x-auto p-0">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-white/5">
                    <tr>
                      <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">{t('time')}</th>
                      <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">
                        {t('featureColumn')}
                      </th>
                      <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">{t('task')}</th>
                      <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">{t('model')}</th>
                      <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">{t('provider')}</th>
                      <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">
                        {t('property')}
                      </th>
                      <th className="text-right p-3 font-medium text-gray-700 dark:text-gray-300">{t('latency')}</th>
                      <th className="text-right p-3 font-medium text-gray-700 dark:text-gray-300">{t('totalTokens')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!data.adminAi.recentEvents?.length ? (
                      <tr>
                        <td colSpan={8} className="p-4 text-gray-500">
                          {t('noAiData')}
                        </td>
                      </tr>
                    ) : (
                      data.adminAi.recentEvents.map((ev, i) => (
                        <tr key={`${ev.created_at}-${i}`} className="border-t border-gray-100 dark:border-gray-800">
                          <td className="p-3 whitespace-nowrap text-gray-900 dark:text-gray-100">
                            {new Date(ev.created_at).toLocaleString()}
                          </td>
                          <td className="p-3 font-mono text-xs text-gray-900 dark:text-gray-100">{ev.feature}</td>
                          <td className="p-3 text-gray-700 dark:text-gray-300">{ev.task ?? '—'}</td>
                          <td className="p-3 font-mono text-xs text-gray-700 dark:text-gray-300 max-w-[14rem] truncate" title={ev.model ?? ''}>
                            {ev.model ?? '—'}
                          </td>
                          <td className="p-3 font-mono text-xs text-gray-700 dark:text-gray-300">{ev.provider ?? '—'}</td>
                          <td className="p-3 text-gray-700 dark:text-gray-300 max-w-[12rem] truncate" title={ev.propertyName ?? ''}>
                            {ev.propertyName ?? '—'}
                          </td>
                          <td className="p-3 text-right tabular-nums text-gray-700 dark:text-gray-300">
                            {ev.latencyMs != null ? `${ev.latencyMs} ms` : '—'}
                          </td>
                          <td className="p-3 text-right tabular-nums text-gray-700 dark:text-gray-300">
                            {ev.total_tokens ?? '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </Card>
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-900/40">
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
      <div className="text-lg font-semibold tabular-nums text-gray-900 dark:text-gray-100">{value}</div>
    </div>
  );
}
