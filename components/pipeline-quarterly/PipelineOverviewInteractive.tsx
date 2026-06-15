'use client';

import { useState } from 'react';
import nextDynamic from 'next/dynamic';
import { PipelineStageFunnel } from '@/components/pipeline-quarterly/PipelineStageFunnel';
import type { GlampingUsStateMetricsMap } from '@/lib/fetch-glamping-industry-us-state-metrics';
import type { PipelineQuarterlyStatusCount } from '@/lib/pipeline-quarterly/fetch-overview';
import type { PipelineMapStageFilter } from '@/lib/pipeline-quarterly/us-state-pipeline-highlight';
import type { PipelineQuarterlyStatusSlug } from '@/lib/pipeline-quarterly/status-slugs';

const GlampingIndustryUsMap = nextDynamic(
  () => import('@/components/glamping-industry/GlampingIndustryUsMap'),
  { ssr: false }
);

type Props = {
  statusCounts: readonly PipelineQuarterlyStatusCount[];
  descriptions: ReadonlyMap<PipelineQuarterlyStatusSlug, string>;
  byState: GlampingUsStateMetricsMap;
  initialMapSelectedAbbr: string | null;
};

export function PipelineOverviewInteractive({
  statusCounts,
  descriptions,
  byState,
  initialMapSelectedAbbr,
}: Props) {
  const [mapStageFilter, setMapStageFilter] = useState<PipelineMapStageFilter>('all-pre-opening');

  return (
    <>
      <section className="mt-10">
        <h2 className="font-[Georgia] text-xl font-medium tracking-tight text-neutral-900 sm:text-2xl">
          Supply forecast funnel
        </h2>
        <p className="mt-1 max-w-2xl text-sm font-light leading-relaxed text-neutral-600">
          Track glamping supply before it opens. Use View properties on each stage for
          property-level detail, or filter the map below by pipeline stage.
        </p>

        <div className="mt-8">
          <PipelineStageFunnel
            statusCounts={statusCounts}
            descriptions={descriptions}
          />
        </div>
      </section>

      <section className="mt-16 scroll-mt-8 sm:mt-20">
        <GlampingIndustryUsMap
          byState={byState}
          variant="pipeline-quarterly"
          initialSelectedAbbr={initialMapSelectedAbbr}
          stageFilter={mapStageFilter}
          onStageFilterChange={setMapStageFilter}
        />
      </section>
    </>
  );
}
