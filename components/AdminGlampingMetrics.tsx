'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ChevronRight, Database } from 'lucide-react';

interface Metrics {
  usaPropertyCount: number;
  usaUnitCount: number;
  totalPropertyCount: number;
  totalUnitCount: number;
  researchStatusNew: number;
  researchStatusInProgress: number;
  researchStatusPublished: number;
}

const FUNNEL_STAGES = [
  {
    key: 'new' as const,
    label: 'New',
    sublabel: null,
    href: '/admin/sage-glamping-data-breakdown',
    cardClass:
      'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800',
    labelClass: 'text-slate-600 dark:text-slate-400',
  },
  {
    key: 'inProgress' as const,
    label: 'In Progress',
    sublabel: 'Work queue',
    href: '/admin/sage-glamping-data-breakdown',
    cardClass:
      'border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/40 hover:bg-amber-100/80 dark:hover:bg-amber-950/60 ring-1 ring-amber-200/80 dark:ring-amber-800/50',
    labelClass: 'text-amber-700 dark:text-amber-400',
  },
  {
    key: 'published' as const,
    label: 'Published',
    sublabel: null,
    href: '/admin/sage-glamping-data-breakdown',
    cardClass:
      'border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-100/80 dark:hover:bg-emerald-950/60',
    labelClass: 'text-emerald-700 dark:text-emerald-400',
  },
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

export default function AdminGlampingMetrics() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<number | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const { data: raw, error: rpcError } = await supabase.rpc('get_glamping_metrics');

        if (rpcError) {
          throw new Error(rpcError.message);
        }

        setMetrics({
          usaPropertyCount: Number(raw?.usa_property_count ?? 0),
          usaUnitCount: Number(raw?.usa_unit_count ?? 0),
          totalPropertyCount: Number(raw?.total_property_count ?? 0),
          totalUnitCount: Number(raw?.total_unit_count ?? 0),
          researchStatusNew: Number(raw?.research_status_new ?? 0),
          researchStatusInProgress: Number(raw?.research_status_in_progress ?? 0),
          researchStatusPublished: Number(raw?.research_status_published ?? 0),
        });
        setLastFetched(Date.now());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load metrics');
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <section
        className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden"
        aria-label="Sage Glamping Database loading"
      >
        <div className="p-6 sm:p-8 animate-pulse">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-4" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-6" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6" />
          <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
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

  if (!metrics) return null;

  const otherPropertyCount = Math.max(0, metrics.totalPropertyCount - metrics.usaPropertyCount);
  const usaPct =
    metrics.totalPropertyCount > 0
      ? Math.round((metrics.usaPropertyCount / metrics.totalPropertyCount) * 100)
      : 0;
  const otherPct =
    metrics.totalPropertyCount > 0
      ? Math.round((otherPropertyCount / metrics.totalPropertyCount) * 100)
      : 0;

  const researchTotal =
    metrics.researchStatusNew + metrics.researchStatusInProgress + metrics.researchStatusPublished;
  const researchValues = {
    new: metrics.researchStatusNew,
    inProgress: metrics.researchStatusInProgress,
    published: metrics.researchStatusPublished,
  };
  const researchPcts =
    researchTotal > 0
      ? {
          new: Math.round((metrics.researchStatusNew / researchTotal) * 100),
          inProgress: Math.round((metrics.researchStatusInProgress / researchTotal) * 100),
          published: Math.round((metrics.researchStatusPublished / researchTotal) * 100),
        }
      : { new: 0, inProgress: 0, published: 0 };
  const completionRate =
    metrics.totalPropertyCount > 0
      ? Math.round((metrics.researchStatusPublished / metrics.totalPropertyCount) * 100)
      : 0;

  return (
    <section
      className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden transition-shadow hover:shadow-md"
      aria-labelledby="glamping-db-heading"
    >
      <div className="p-6 sm:p-8 space-y-8">
        {/* Header with data freshness */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sage-100 dark:bg-sage-900/50">
              <Database className="w-5 h-5 text-sage-600 dark:text-sage-400" aria-hidden />
            </div>
            <div>
              <h2
                id="glamping-db-heading"
                className="text-lg font-semibold text-gray-900 dark:text-gray-100"
              >
                Sage Glamping Database
              </h2>
              {lastFetched != null && (
                <p
                  className="text-xs text-gray-500 dark:text-gray-400 tabular-nums mt-0.5"
                  title={`Data fetched ${new Date(lastFetched).toLocaleString()}`}
                >
                  Updated {formatRelativeTime(Date.now() - lastFetched)}
                </p>
              )}
            </div>
          </div>
          <Link
            href="/admin/sage-glamping-data-breakdown"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-sage-600 dark:text-sage-400 hover:text-sage-700 dark:hover:text-sage-300 transition-colors focus:outline-none focus:ring-2 focus:ring-sage-500 focus:ring-offset-2 rounded-md"
          >
            View breakdown
            <ChevronRight className="w-4 h-4" aria-hidden />
          </Link>
        </div>

        {/* Database size */}
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
            Database size
          </h3>
          <p className="text-2xl sm:text-3xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
            {metrics.totalPropertyCount.toLocaleString()}{' '}
            <span className="font-semibold text-sage-600 dark:text-sage-400">properties</span>
            <span className="text-lg font-normal text-gray-500 dark:text-gray-400 ml-1">
              ({metrics.totalUnitCount.toLocaleString()} units)
            </span>
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-sm text-gray-600 dark:text-gray-300">
            <span>
              <span className="font-medium">USA:</span>{' '}
              {metrics.usaPropertyCount.toLocaleString()} ({usaPct}%)
            </span>
            <span className="text-gray-400 dark:text-gray-500">|</span>
            <span>
              <span className="font-medium">Other:</span>{' '}
              {otherPropertyCount.toLocaleString()} ({otherPct}%)
            </span>
          </div>
          <div
            className="mt-3 flex h-2.5 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700"
            role="img"
            aria-label={`USA ${usaPct}%, Other ${otherPct}%`}
          >
            <div
              className="bg-sage-500 dark:bg-sage-500 transition-all duration-300"
              style={{ width: `${usaPct}%` }}
              title={`USA: ${metrics.usaPropertyCount.toLocaleString()} (${usaPct}%)`}
            />
            <div
              className="bg-gray-400 dark:bg-gray-500 transition-all duration-300"
              style={{ width: `${otherPct}%` }}
              title={`Other: ${otherPropertyCount.toLocaleString()} (${otherPct}%)`}
            />
          </div>
        </div>

        {/* Research Pipeline - clickable stages */}
        <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Research Pipeline
            </h3>
            <span className="text-sm font-medium text-sage-600 dark:text-sage-400 tabular-nums">
              {completionRate}% published
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {FUNNEL_STAGES.map((stage, i) => {
              const value = researchValues[stage.key];
              const pct = researchPcts[stage.key];
              return (
                <Link
                  key={stage.key}
                  href={stage.href}
                  className={`group flex flex-col items-center justify-center rounded-xl border-2 px-4 py-3 text-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:ring-offset-2 ${stage.cardClass}`}
                  title={`${stage.label}: ${value.toLocaleString()} (${pct}%) — View in breakdown`}
                >
                  <p className={`text-xs font-medium uppercase tracking-wide mb-0.5 ${stage.labelClass}`}>
                    {stage.label}
                    {stage.sublabel && (
                      <span className="ml-1.5 font-semibold">· {stage.sublabel}</span>
                    )}
                  </p>
                  <p className="text-xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
                    {value.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{pct}%</p>
                  <ChevronRight
                    className="mt-1 w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-sage-500 group-hover:translate-x-0.5 transition-all opacity-0 group-hover:opacity-100 sm:opacity-100"
                    aria-hidden
                  />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
