'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ChevronRight } from 'lucide-react';

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
    href: '/admin/sage-data',
    accentClass: 'bg-neutral-400 dark:bg-neutral-500',
  },
  {
    key: 'inProgress' as const,
    label: 'In progress',
    sublabel: 'Queue',
    href: '/admin/sage-data',
    accentClass: 'bg-amber-500/90 dark:bg-amber-500/70',
  },
  {
    key: 'published' as const,
    label: 'Published',
    sublabel: null,
    href: '/admin/sage-data',
    accentClass: 'bg-emerald-600/85 dark:bg-emerald-500/65',
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
        className="rounded-lg border border-neutral-200/60 dark:border-neutral-800/80 bg-neutral-50/30 dark:bg-neutral-900/20"
        aria-label="Sage Glamping Database loading"
      >
        <div className="px-1 py-4 animate-pulse space-y-4">
          <div className="h-3.5 bg-neutral-200/70 dark:bg-neutral-800 rounded w-36" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-px rounded-lg overflow-hidden border border-neutral-200/50 dark:border-neutral-800/60 bg-neutral-200/50 dark:bg-neutral-800/50">
            <div className="h-[4.5rem] bg-neutral-50 dark:bg-neutral-950/40" />
            <div className="h-[4.5rem] bg-neutral-50 dark:bg-neutral-950/40" />
          </div>
          <div className="h-14 bg-neutral-100/80 dark:bg-neutral-900/40 rounded-md" />
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
    <section aria-labelledby="glamping-db-heading">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1.5 sm:gap-2 mb-3">
        <h2
          id="glamping-db-heading"
          className="text-xs sm:text-sm font-medium text-neutral-900 dark:text-neutral-100"
        >
          Sage glamping database
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
            href="/admin/sage-data"
            className="inline-flex items-center gap-0.5 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-950 rounded-sm"
          >
            Breakdown
            <ChevronRight className="w-3.5 h-3.5 opacity-60" aria-hidden />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-px rounded-lg overflow-hidden border border-neutral-200/70 dark:border-neutral-800 bg-neutral-200/60 dark:bg-neutral-800/80 mb-4">
        <div className="px-3 sm:px-4 py-3 bg-white dark:bg-neutral-950/50 flex flex-col justify-center">
          <p className="text-[10px] sm:text-[11px] text-neutral-500 dark:text-neutral-500">
            Total properties
          </p>
          <p className="mt-0.5 text-xl sm:text-2xl font-semibold tabular-nums tracking-tight text-neutral-900 dark:text-neutral-100 leading-none">
            {metrics.totalPropertyCount.toLocaleString()}
          </p>
          <p className="mt-1 text-[10px] sm:text-[11px] text-neutral-500 dark:text-neutral-500 leading-snug">
            USA {metrics.usaPropertyCount.toLocaleString()} ({usaPct}%) · Other{' '}
            {otherPropertyCount.toLocaleString()} ({otherPct}%)
          </p>
        </div>
        <div className="px-3 sm:px-4 py-3 bg-white dark:bg-neutral-950/50 flex flex-col justify-center">
          <p className="text-[10px] sm:text-[11px] text-neutral-500 dark:text-neutral-500">Total units</p>
          <p className="mt-0.5 text-xl sm:text-2xl font-semibold tabular-nums tracking-tight text-neutral-900 dark:text-neutral-100 leading-none">
            {metrics.totalUnitCount.toLocaleString()}
          </p>
          <p className="mt-1 text-[10px] sm:text-[11px] text-neutral-500 dark:text-neutral-500">
            All properties
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500 mb-2">
          Research pipeline
        </h3>
        <div className="divide-y divide-neutral-200/70 dark:divide-neutral-800 border border-neutral-200/70 dark:border-neutral-800 rounded-lg overflow-hidden bg-white dark:bg-neutral-950/50">
          {FUNNEL_STAGES.map((stage) => {
            const value = researchValues[stage.key];
            const pct = researchPcts[stage.key];
            return (
              <Link
                key={stage.key}
                href={stage.href}
                className="group flex items-center gap-3 px-3 py-2 sm:px-4 sm:py-2 hover:bg-neutral-50/80 dark:hover:bg-neutral-900/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-300 dark:focus-visible:ring-neutral-600"
                title={`${stage.label}: ${value.toLocaleString()} (${pct}%)`}
              >
                <span
                  className={`shrink-0 w-0.5 self-stretch min-h-[1.5rem] rounded-full ${stage.accentClass}`}
                  aria-hidden
                />
                <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-0 sm:gap-3">
                  <span className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300">
                    {stage.label}
                    {stage.sublabel && (
                      <span className="text-neutral-400 dark:text-neutral-500 font-normal">
                        {' '}
                        · {stage.sublabel}
                      </span>
                    )}
                  </span>
                  <span className="flex items-baseline gap-2 tabular-nums">
                    <span className="text-sm sm:text-base font-semibold text-neutral-900 dark:text-neutral-100">
                      {value.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-neutral-500 w-8 text-right">{pct}%</span>
                  </span>
                </div>
                <ChevronRight
                  className="w-4 h-4 text-neutral-300 dark:text-neutral-600 group-hover:text-neutral-500 dark:group-hover:text-neutral-400 shrink-0 transition-colors"
                  aria-hidden
                />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
