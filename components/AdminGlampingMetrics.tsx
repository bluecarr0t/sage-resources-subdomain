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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 animate-pulse"
          >
            <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4 mb-3" />
            <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded w-1/2" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 animate-pulse"
            >
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4 mb-3" />
              <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded w-1/2" />
            </div>
          ))}
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

  const mainCards = [
    {
      title: 'USA Number of Properties',
      value: metrics.usaPropertyCount.toLocaleString(),
    },
    {
      title: 'USA Number of Units',
      value: metrics.usaUnitCount.toLocaleString(),
    },
    {
      title: 'Total Properties',
      value: metrics.totalPropertyCount.toLocaleString(),
    },
    {
      title: 'Total Number of Units',
      value: metrics.totalUnitCount.toLocaleString(),
    },
  ];

  const researchStatusCards = [
    {
      title: 'New Properties',
      value: metrics.researchStatusNew.toLocaleString(),
    },
    {
      title: 'In-Progress Properties',
      value: metrics.researchStatusInProgress.toLocaleString(),
    },
    {
      title: 'Published Properties',
      value: metrics.researchStatusPublished.toLocaleString(),
    },
  ];

  return (
    <div className="space-y-6 mb-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {mainCards.map((card) => (
          <div
            key={card.title}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4"
          >
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{card.title}</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{card.value}</p>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Research Status
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {researchStatusCards.map((card) => (
            <div
              key={card.title}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4"
            >
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{card.title}</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{card.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
