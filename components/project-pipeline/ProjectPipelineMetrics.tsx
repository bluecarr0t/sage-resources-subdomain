'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { computeProjectPipelineMetrics } from '@/lib/project-pipeline/metrics';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

export type ProjectPipelineMetricFilter =
  | 'outdoor'
  | 'commercial'
  | 'dueWithin30Days'
  | 'outdoorPastDue';

const METRIC_TILES: {
  key: ProjectPipelineMetricFilter;
  field: keyof ReturnType<typeof computeProjectPipelineMetrics>;
}[] = [
  { key: 'outdoor', field: 'outdoor' },
  { key: 'commercial', field: 'commercial' },
  { key: 'dueWithin30Days', field: 'dueWithin30Days' },
  { key: 'outdoorPastDue', field: 'outdoorPastDue' },
];

/** Match parent `rounded-lg` on outer corners; avoid `overflow-hidden` so active rings are not clipped. */
const METRIC_TILE_CORNER_RADIUS = [
  'rounded-tl-lg sm:rounded-bl-lg',
  'max-sm:rounded-tr-lg',
  'max-sm:rounded-bl-lg',
  'max-sm:rounded-br-lg sm:rounded-tr-lg sm:rounded-br-lg',
] as const;

type ProjectPipelineMetricsProps = {
  jobs: ProjectPipelineJob[];
  activeFilter: ProjectPipelineMetricFilter | null;
  onFilterChange: (filter: ProjectPipelineMetricFilter) => void;
};

export function ProjectPipelineMetrics({
  jobs,
  activeFilter,
  onFilterChange,
}: ProjectPipelineMetricsProps) {
  const t = useTranslations('admin.projectPipeline.metrics');
  const metrics = useMemo(() => computeProjectPipelineMetrics(jobs), [jobs]);

  return (
    <div className="grid w-full grid-cols-2 gap-px rounded-lg border border-neutral-200/70 bg-neutral-200/60 dark:border-neutral-800 dark:bg-neutral-800/80 sm:w-auto sm:min-w-[22rem] sm:grid-cols-4">
      {METRIC_TILES.map(({ key, field }, index) => {
        const isActive = activeFilter === key;

        return (
          <button
            key={key}
            type="button"
            onClick={() => onFilterChange(key)}
            aria-pressed={isActive}
            aria-label={t('filterBy', { metric: t(key) })}
            className={`flex flex-col justify-center bg-white px-3 py-2.5 text-left transition-colors sm:px-4 sm:py-3 dark:bg-neutral-950/50 ${METRIC_TILE_CORNER_RADIUS[index]} ${
              isActive
                ? 'relative z-10 ring-2 ring-inset ring-sage-600/80 dark:ring-sage-500/80'
                : 'hover:bg-neutral-50 dark:hover:bg-neutral-900/60'
            }`}
          >
            <p className="text-xl font-semibold tabular-nums leading-none tracking-tight text-neutral-900 dark:text-neutral-100 sm:text-2xl">
              {metrics[field].toLocaleString()}
            </p>
            <p className="mt-1 text-[10px] leading-snug text-neutral-500 dark:text-neutral-500 sm:text-[11px]">
              {t(key)}
            </p>
          </button>
        );
      })}
    </div>
  );
}

export function resolveProjectPipelineMetricFilter(
  segmentFilter: string,
  dueWithin30DaysOnly: boolean,
  outdoorPastDueOnly: boolean
): ProjectPipelineMetricFilter | null {
  if (outdoorPastDueOnly && segmentFilter === 'Outdoor') return 'outdoorPastDue';
  if (dueWithin30DaysOnly && segmentFilter === 'Outdoor') return 'dueWithin30Days';
  if (!dueWithin30DaysOnly && !outdoorPastDueOnly && segmentFilter === 'Outdoor') return 'outdoor';
  if (!dueWithin30DaysOnly && !outdoorPastDueOnly && segmentFilter === 'Commercial')
    return 'commercial';
  return null;
}

export function applyProjectPipelineMetricFilter(
  filter: ProjectPipelineMetricFilter
): {
  segmentFilter: string;
  dueWithin30DaysOnly: boolean;
  outdoorPastDueOnly: boolean;
  projectStatusFilter: string;
  search: string;
  serviceFilter: string;
} {
  const segmentAndDue = (() => {
    switch (filter) {
      case 'outdoor':
        return { segmentFilter: 'Outdoor', dueWithin30DaysOnly: false, outdoorPastDueOnly: false };
      case 'commercial':
        return { segmentFilter: 'Commercial', dueWithin30DaysOnly: false, outdoorPastDueOnly: false };
      case 'dueWithin30Days':
        return { segmentFilter: 'Outdoor', dueWithin30DaysOnly: true, outdoorPastDueOnly: false };
      case 'outdoorPastDue':
        return { segmentFilter: 'Outdoor', dueWithin30DaysOnly: false, outdoorPastDueOnly: true };
    }
  })();

  return {
    ...segmentAndDue,
    projectStatusFilter: '',
    search: '',
    serviceFilter: '',
  };
}
