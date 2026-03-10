'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface PastReportsStats {
  studies: number;
  comparables: number;
  unit_records: number;
  states_covered: number;
}

const STAT_CARDS = [
  { key: 'studies' as const, label: 'Studies' },
  { key: 'comparables' as const, label: 'Comparables' },
  { key: 'unit_records' as const, label: 'Unit Records' },
  { key: 'states_covered' as const, label: 'States Covered' },
] as const;

function formatRelativeTime(ms: number): string {
  if (ms < 60_000) return 'Just now';
  if (ms < 120_000) return '1 min ago';
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs === 1) return '1 hr ago';
  return `${hrs} hrs ago`;
}

export default function AdminPastReportsStats() {
  const [stats, setStats] = useState<PastReportsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<number | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [statsRes, comparablesRes] = await Promise.all([
          fetch('/api/admin/reports/stats'),
          fetch('/api/admin/comparables?per_page=1&page=1'),
        ]);
        const statsData = await statsRes.json();
        const comparablesData = await comparablesRes.json();
        if (!statsRes.ok || !statsData.success) {
          throw new Error(statsData.error || 'Failed to load stats');
        }
        const comparablesCount =
          comparablesData.success && comparablesData.pagination
            ? comparablesData.pagination.total ?? 0
            : statsData.comparables ?? 0;
        setStats({
          studies: statsData.studies ?? 0,
          comparables: comparablesCount,
          unit_records: statsData.unit_records ?? 0,
          states_covered: statsData.states_covered ?? 0,
        });
        setLastFetched(Date.now());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stats');
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <section
        className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden"
        aria-label="Past Reports loading"
      >
        <div className="p-6 sm:p-8">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6 animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse"
              />
            ))}
          </div>
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
      className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden transition-shadow hover:shadow-md"
      aria-labelledby="past-reports-heading"
    >
      <div className="p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2
            id="past-reports-heading"
            className="text-lg font-semibold text-gray-900 dark:text-gray-100"
          >
            Past Reports
          </h2>
          <div className="flex items-center gap-4">
            {lastFetched != null && (
              <span
                className="text-xs text-gray-500 dark:text-gray-400 tabular-nums"
                title={`Data fetched ${new Date(lastFetched).toLocaleString()}`}
              >
                Updated {formatRelativeTime(Date.now() - lastFetched)}
              </span>
            )}
            <Link
              href="/admin/past-reports"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-sage-600 dark:text-sage-400 hover:text-sage-700 dark:hover:text-sage-300 transition-colors focus:outline-none focus:ring-2 focus:ring-sage-500 focus:ring-offset-2 rounded-md"
            >
              View all
              <ChevronRight className="w-4 h-4" aria-hidden />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {STAT_CARDS.map(({ key, label }) => (
            <div
              key={key}
              className="flex flex-col p-4 sm:p-5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800"
            >
              <p className="text-2xl sm:text-3xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
                {stats[key].toLocaleString()}
              </p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
