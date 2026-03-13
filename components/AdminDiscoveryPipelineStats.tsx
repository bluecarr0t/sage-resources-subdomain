'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Rss, FileText, Globe, Search, ChevronRight, Clock } from 'lucide-react';

interface DiscoveryStats {
  totalFromPipeline: number;
  bySource: Record<string, number>;
  byPeriod: {
    last30Days: number;
    last90Days: number;
    last6Months: number;
    allTime: number;
  };
}

interface DiscoveryRun {
  id: string;
  mode: string;
  dry_run: boolean;
  started_at: string;
  completed_at: string | null;
  articles_found: number;
  articles_fetched: number;
  articles_failed: number;
  properties_extracted: number;
  properties_new: number;
  properties_inserted: number;
  error: string | null;
}

const PERIOD_CONFIG: { key: keyof DiscoveryStats['byPeriod']; label: string }[] = [
  { key: 'last30Days', label: 'Last 30 days' },
  { key: 'last90Days', label: 'Last 90 days' },
  { key: 'last6Months', label: 'Last 6 months' },
  { key: 'allTime', label: 'All-time' },
];

const SOURCE_CONFIG: { key: string; label: string; icon: typeof Rss }[] = [
  { key: 'Google News RSS', label: 'Google News RSS', icon: Rss },
  { key: 'Tavily Search', label: 'Tavily Search', icon: Search },
  { key: 'Manual Article', label: 'Manual Article', icon: Globe },
  { key: 'Local Text File', label: 'Local Text File', icon: FileText },
];

export default function AdminDiscoveryPipelineStats() {
  const [stats, setStats] = useState<DiscoveryStats | null>(null);
  const [runs, setRuns] = useState<DiscoveryRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, runsRes] = await Promise.all([
          fetch('/api/admin/sage-glamping-data/discovery-stats'),
          fetch('/api/admin/sage-glamping-data/discovery-runs?limit=10'),
        ]);
        const statsJson = await statsRes.json();
        const runsJson = await runsRes.json();
        if (!statsRes.ok || !statsJson.success) {
          throw new Error(statsJson.error || 'Failed to fetch stats');
        }
        setStats(statsJson.stats);
        setRuns(runsJson.success ? runsJson.runs || [] : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load discovery stats');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <section
        className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden"
        aria-label="Discovery pipeline stats loading"
      >
        <div className="p-6 animate-pulse">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section
        className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-6"
        role="alert"
      >
        <p className="text-red-700 dark:text-red-300 font-medium">{error}</p>
      </section>
    );
  }

  if (!stats) return null;

  return (
    <section
      className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden"
      aria-labelledby="discovery-pipeline-heading"
    >
      <div className="p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h2
              id="discovery-pipeline-heading"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2"
            >
              <Rss className="w-5 h-5 text-sage-600 dark:text-sage-400" aria-hidden />
              Discovery Pipeline (RSS & News)
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              New glamping resorts found and added from RSS feeds, Tavily search, and article processing
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/discovery-candidates"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-sage-600 dark:text-sage-400 hover:text-sage-700 dark:hover:text-sage-300 transition-colors focus:outline-none focus:ring-2 focus:ring-sage-500 focus:ring-offset-2 rounded-md shrink-0"
            >
              Review candidates
              <ChevronRight className="w-4 h-4" aria-hidden />
            </Link>
            <Link
              href="/admin/discovery-pipeline-automation"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-sage-600 dark:text-sage-400 hover:text-sage-700 dark:hover:text-sage-300 transition-colors focus:outline-none focus:ring-2 focus:ring-sage-500 focus:ring-offset-2 rounded-md shrink-0"
            >
              Automation Docs
              <ChevronRight className="w-4 h-4" aria-hidden />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {PERIOD_CONFIG.map(({ key, label }) => (
            <div
              key={key}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-3 text-center"
            >
              <p className="text-2xl font-bold tabular-nums text-sage-600 dark:text-sage-400">
                {(stats.byPeriod?.[key] ?? 0).toLocaleString()}
              </p>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mt-1">
                {label}
              </p>
            </div>
          ))}
        </div>

        {stats.totalFromPipeline > 0 && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
              By source
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SOURCE_CONFIG.map(({ key, label, icon: Icon }) => {
                const count = stats.bySource[key] ?? 0;
                if (count === 0) return null;
                const pct =
                  stats.totalFromPipeline > 0
                    ? Math.round((count / stats.totalFromPipeline) * 100)
                    : 0;
                return (
                  <div
                    key={key}
                    className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-3"
                  >
                    <Icon className="w-4 h-4 text-sage-500 dark:text-sage-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {count.toLocaleString()} ({pct}%)
                      </p>
                    </div>
                    <p className="text-lg font-bold tabular-nums text-sage-600 dark:text-sage-400">
                      {count.toLocaleString()}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {runs.length > 0 && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Run history
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Started</th>
                    <th className="text-left py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Mode</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400">Fetched</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400">Inserted</th>
                    <th className="text-left py-2 pl-4 font-medium text-gray-500 dark:text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => (
                    <tr key={r.id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">
                        {new Date(r.started_at).toLocaleString()}
                      </td>
                      <td className="py-2 pr-4">
                        <span className="font-medium">{r.mode}</span>
                        {r.dry_run && (
                          <span className="ml-1 text-xs text-amber-600 dark:text-amber-400">(dry)</span>
                        )}
                      </td>
                      <td className="text-right py-2 px-2 tabular-nums">{r.articles_fetched}</td>
                      <td className="text-right py-2 px-2 tabular-nums text-sage-600 dark:text-sage-400">
                        {r.properties_inserted}
                      </td>
                      <td className="py-2 pl-4">
                        {r.error ? (
                          <span className="text-red-600 dark:text-red-400 truncate max-w-[200px] block" title={r.error}>
                            Error
                          </span>
                        ) : (
                          <span className="text-green-600 dark:text-green-400">OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
