'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

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
    cardClass:
      'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/60',
    labelClass: 'text-slate-600 dark:text-slate-400',
  },
  {
    key: 'inProgress' as const,
    label: 'In Progress',
    cardClass:
      'border-amber-400 dark:border-amber-600 bg-amber-50/80 dark:bg-amber-950/40 ring-2 ring-amber-200/80 dark:ring-amber-800/50',
    labelClass: 'text-amber-700 dark:text-amber-400',
  },
  {
    key: 'published' as const,
    label: 'Published',
    cardClass:
      'border-emerald-400 dark:border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/40',
    labelClass: 'text-emerald-700 dark:text-emerald-400',
  },
] as const;

export default function AdminGlampingMetrics() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      <div className="space-y-6 mb-8">
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 p-5 animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/3 mb-3" />
          <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded w-2/3 mb-4" />
          <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded" />
        </div>
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 p-6 animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/3 mb-4" />
          <div className="h-10 bg-gray-200 dark:bg-gray-600 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg">
        {error}
      </div>
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
    <div className="space-y-6 mb-8">
      <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3 tracking-tight">
        Sage Glamping Database
      </h2>
      <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 shadow-sm p-5">
        <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
          Database size
        </h3>
        <p className="text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100 mb-3">
          {metrics.totalPropertyCount.toLocaleString()} properties
          <span className="text-slate-500 dark:text-slate-400 font-normal">
            {' '}({metrics.totalUnitCount.toLocaleString()} units)
          </span>
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600 dark:text-slate-300">
          <span>
            <span className="font-medium">USA:</span>{' '}
            {metrics.usaPropertyCount.toLocaleString()} ({usaPct}%)
          </span>
          <span className="text-slate-400 dark:text-slate-500">|</span>
          <span>
            <span className="font-medium">Other:</span>{' '}
            {otherPropertyCount.toLocaleString()} ({otherPct}%)
          </span>
        </div>
        {/* Stacked bar */}
        <div className="mt-3 flex h-2 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
          <div
            className="bg-blue-500 dark:bg-blue-500 transition-all duration-300"
            style={{ width: `${usaPct}%` }}
            title={`USA: ${metrics.usaPropertyCount.toLocaleString()} (${usaPct}%)`}
          />
          <div
            className="bg-slate-400 dark:bg-slate-500 transition-all duration-300"
            style={{ width: `${otherPct}%` }}
            title={`Other: ${otherPropertyCount.toLocaleString()} (${otherPct}%)`}
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 tracking-tight">
            Research Pipeline
          </h3>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
            {completionRate}% published
          </span>
        </div>
        <div className="flex flex-nowrap items-stretch gap-2 overflow-x-auto">
          {FUNNEL_STAGES.map((stage, i) => {
            const value = researchValues[stage.key];
            const pct = researchPcts[stage.key];
            const isInProgress = stage.key === 'inProgress';
            return (
              <div key={stage.key} className="flex flex-1 min-w-0 items-stretch gap-0 sm:gap-2">
                <div
                  className={`flex flex-1 min-w-0 flex-col items-center justify-center rounded-lg border-2 px-4 py-4 text-center ${stage.cardClass}`}
                  title={`${stage.label}: ${value.toLocaleString()} (${pct}%)`}
                >
                  <p
                    className={`text-xs font-medium uppercase tracking-wide mb-1 ${stage.labelClass}`}
                  >
                    {stage.label}
                    {isInProgress && (
                      <span className="ml-1.5 font-semibold">· Work queue</span>
                    )}
                  </p>
                  <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                    {value.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{pct}%</p>
                </div>
                {i < FUNNEL_STAGES.length - 1 && (
                  <div className="hidden sm:flex flex-shrink-0 items-center justify-center text-slate-300 dark:text-slate-600 px-1">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
