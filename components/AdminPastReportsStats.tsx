'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface PastReportsStats {
  studies: number;
  comparables: number;
  unit_records: number;
  states_covered: number;
}

export default function AdminPastReportsStats() {
  const [stats, setStats] = useState<PastReportsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/admin/reports/stats');
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to load stats');
        }
        setStats({
          studies: data.studies ?? 0,
          comparables: data.comparables ?? 0,
          unit_records: data.unit_records ?? 0,
          states_covered: data.states_covered ?? 0,
        });
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
      <section className="mb-10 rounded-xl border-2 border-sage-200 dark:border-sage-800 bg-white dark:bg-gray-900 p-5 animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/3 mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-600 rounded" />
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-800 p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300">
        {error}
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    { value: stats.studies, label: 'Studies' },
    { value: stats.comparables, label: 'Comparables' },
    { value: stats.unit_records, label: 'Unit Records' },
    { value: stats.states_covered, label: 'States Covered' },
  ];

  return (
    <section className="mb-10 rounded-xl border-2 border-sage-200 dark:border-sage-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
      <div className="border-b border-sage-200 dark:border-sage-800 bg-sage-50/80 dark:bg-sage-950/40 px-5 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-sage-800 dark:text-sage-200 tracking-tight">
            Past Reports
          </h2>
          <Link
            href="/admin/past-reports"
            className="text-sm font-medium text-sage-600 dark:text-sage-400 hover:underline"
          >
            View all
          </Link>
        </div>
      </div>
      <div className="p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {statCards.map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {value.toLocaleString()}
              </p>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 mt-0.5">
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
