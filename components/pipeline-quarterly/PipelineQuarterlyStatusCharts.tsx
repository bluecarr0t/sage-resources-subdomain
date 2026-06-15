'use client';

import { PipelineStateBarChart } from '@/components/pipeline-quarterly/PipelineStateBarChart';
import { PipelineUnitTypeDonutChart } from '@/components/pipeline-quarterly/PipelineUnitTypeDonutChart';
import type {
  PipelineQuarterlyStateBreakdownRow,
  PipelineQuarterlyUnitTypeBreakdownRow,
} from '@/lib/pipeline-quarterly/fetch-status-breakdown';

export function PipelineQuarterlyStateChart({
  rows,
}: {
  rows: readonly PipelineQuarterlyStateBreakdownRow[];
}) {
  return <PipelineStateBarChart rows={rows} />;
}

export function PipelineQuarterlyUnitTypeChart({
  rows,
}: {
  rows: readonly PipelineQuarterlyUnitTypeBreakdownRow[];
}) {
  return <PipelineUnitTypeDonutChart rows={rows} />;
}
