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

        {/* Total Properties & Total Units — primary stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-5">
            <p className="text-sm font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
              Total Properties
            </p>
            <p className="text-3xl sm:text-4xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
              {metrics.totalPropertyCount.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              USA: {metrics.usaPropertyCount.toLocaleString()} ({usaPct}%) · Other:{' '}
              {otherPropertyCount.toLocaleString()} ({otherPct}%)
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-5">
            <p className="text-sm font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
              Total Units
            </p>
            <p className="text-3xl sm:text-4xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
              {metrics.totalUnitCount.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Across all properties
            </p>
          </div>
        </div>

        {/* Research pipeline — three phases */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Research pipeline
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {FUNNEL_STAGES.map((stage) => {
              const value = researchValues[stage.key];
              const pct = researchPcts[stage.key];
              return (
                <Link
                  key={stage.key}
                  href={stage.href}
                  className={`group flex flex-col items-center justify-center rounded-xl border-2 px-4 py-4 text-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:ring-offset-2 ${stage.cardClass}`}
                  title={`${stage.label}: ${value.toLocaleString()} (${pct}%) — View in breakdown`}
                >
                  <p
                    className={`text-xs font-medium uppercase tracking-wide mb-1 ${stage.labelClass}`}
                  >
                    {stage.label}
                    {stage.sublabel && (
                      <span className="ml-1 font-normal">· {stage.sublabel}</span>
                    )}
                  </p>
                  <p className="text-2xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
                    {value.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{pct}%</p>
                  <ChevronRight
                    className="mt-2 w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-sage-500 group-hover:translate-x-0.5 transition-all opacity-0 group-hover:opacity-100 sm:opacity-100"
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
