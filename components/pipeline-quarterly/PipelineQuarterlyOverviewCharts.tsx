'use client';

import { PipelineStatusMixChart } from '@/components/pipeline-quarterly/PipelineStatusMixChart';
import type { PipelineQuarterlyStatusCount } from '@/lib/pipeline-quarterly/fetch-overview';

export function PipelineQuarterlyOverviewCharts({
  statusCounts,
}: {
  statusCounts: readonly PipelineQuarterlyStatusCount[];
}) {
  return <PipelineStatusMixChart statusCounts={statusCounts} />;
}
