'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface MissingFieldsBreakdown {
  total_count: number;
  missing_site_name: number;
  missing_rate_avg_retail_daily_rate: number;
  missing_unit_type: number;
  missing_unit_private_bathroom: number;
  missing_url: number;
  missing_description: number;
}

const KEY_FIELDS: {
  key: keyof Omit<MissingFieldsBreakdown, 'total_count'>;
  label: string;
  description: string;
}[] = [
  {
    key: 'missing_site_name',
    label: 'site_name',
    description: 'No site/unit details',
  },
  {
    key: 'missing_rate_avg_retail_daily_rate',
    label: 'rate_avg_retail_daily_rate',
    description: 'No average daily rate',
  },
  {
    key: 'missing_unit_type',
    label: 'unit_type',
    description: 'No unit type (e.g. Safari Tent, Yurt)',
  },
  {
    key: 'missing_unit_private_bathroom',
    label: 'unit_private_bathroom',
    description: 'No bathroom info',
  },
  {
    key: 'missing_url',
    label: 'url',
    description: 'No website link',
  },
  {
    key: 'missing_description',
    label: 'description',
    description: 'No property description',
  },
];

export default function AdminMissingFieldsBreakdown() {
  const [data, setData] = useState<MissingFieldsBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBreakdown = async () => {
      try {
        const { data: raw, error: rpcError } = await supabase.rpc(
          'get_missing_fields_breakdown'
        );

        if (rpcError) {
          throw new Error(rpcError.message);
        }

        setData({
          total_count: Number(raw?.total_count ?? 0),
          missing_site_name: Number(raw?.missing_site_name ?? 0),
          missing_rate_avg_retail_daily_rate: Number(
            raw?.missing_rate_avg_retail_daily_rate ?? 0
          ),
          missing_unit_type: Number(raw?.missing_unit_type ?? 0),
          missing_unit_private_bathroom: Number(
            raw?.missing_unit_private_bathroom ?? 0
          ),
          missing_url: Number(raw?.missing_url ?? 0),
          missing_description: Number(raw?.missing_description ?? 0),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load breakdown');
      } finally {
        setLoading(false);
      }
    };
    fetchBreakdown();
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 p-6 animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/3 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-12 bg-gray-200 dark:bg-gray-600 rounded"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/20 p-4 text-red-700 dark:text-red-300">
        {error}
        <p className="text-sm mt-2 text-red-600 dark:text-red-400">
          Run scripts/add-missing-fields-breakdown-function.sql in Supabase SQL
          Editor to enable this feature.
        </p>
      </div>
    );
  }

  if (!data || data.total_count === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 tracking-tight">
          Key missing fields
        </h3>
        <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
          {data.total_count.toLocaleString()} published records
        </span>
      </div>
      <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 overflow-hidden">
        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {KEY_FIELDS.map(({ key, label, description }) => {
            const missing = data[key];
            const pct =
              data.total_count > 0
                ? Math.round((missing / data.total_count) * 100)
                : 0;
            return (
              <div
                key={key}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 font-mono">
                    {label}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {description}
                  </p>
                </div>
                <div className="flex items-baseline gap-2 tabular-nums">
                  <span
                    className={
                      missing > 0
                        ? 'text-amber-600 dark:text-amber-400 font-semibold'
                        : 'text-emerald-600 dark:text-emerald-400 font-medium'
                    }
                  >
                    {missing > 0
                      ? `${missing.toLocaleString()} missing`
                      : 'Complete'}
                  </span>
                  {missing > 0 && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      ({pct}%)
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
