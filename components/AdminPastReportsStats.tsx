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
  { key: 'comparables' as const, label: 'Comps' },
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
        className="rounded-lg border border-neutral-200/60 dark:border-neutral-800/80 bg-neutral-50/30 dark:bg-neutral-900/20"
        aria-label="Past Reports loading"
      >
        <div className="px-1 py-4">
          <div className="h-3.5 bg-neutral-200/70 dark:bg-neutral-800 rounded w-24 mb-4 animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-md overflow-hidden bg-neutral-200/50 dark:bg-neutral-800/50">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-16 sm:h-[4.25rem] bg-neutral-50 dark:bg-neutral-950/40 animate-pulse"
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
        className="rounded-lg border border-red-200/80 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 px-5 py-4"
        role="alert"
      >
        <p className="text-sm text-red-800 dark:text-red-200/90">{error}</p>
      </section>
    );
  }

  if (!stats) return null;

  return (
    <section aria-labelledby="past-reports-heading">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1.5 sm:gap-2 mb-3">
        <h2
          id="past-reports-heading"
          className="text-xs sm:text-sm font-medium text-neutral-900 dark:text-neutral-100"
        >
          Past reports
        </h2>
        <div className="flex items-center gap-3 text-[11px] text-neutral-500 dark:text-neutral-500">
          {lastFetched != null && (
            <span
              className="tabular-nums"
              title={`Data fetched ${new Date(lastFetched).toLocaleString()}`}
            >
              Updated {formatRelativeTime(Date.now() - lastFetched)}
            </span>
          )}
          <Link
            href="/admin/past-reports"
            className="inline-flex items-center gap-0.5 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-950 rounded-sm"
          >
            View all
            <ChevronRight className="w-3.5 h-3.5 opacity-60" aria-hidden />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-lg overflow-hidden border border-neutral-200/70 dark:border-neutral-800 bg-neutral-200/60 dark:bg-neutral-800/80">
        {STAT_CARDS.map(({ key, label }) => (
          <div
            key={key}
            className="flex flex-col justify-center px-3 sm:px-4 py-2.5 sm:py-3 bg-white dark:bg-neutral-950/50"
          >
            <p className="text-xl sm:text-2xl font-semibold tabular-nums tracking-tight text-neutral-900 dark:text-neutral-100 leading-none">
              {stats[key].toLocaleString()}
            </p>
            <p className="mt-1 text-[10px] sm:text-[11px] text-neutral-500 dark:text-neutral-500 leading-none">
              {label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
