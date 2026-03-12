'use client';

import { useState, useEffect } from 'react';
import { Rss, FileText, Globe, Search } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/admin/sage-glamping-data/discovery-stats');
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to fetch');
        }
        setStats(json.stats);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load discovery stats');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
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
      </div>
    </section>
  );
}
