'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PipelineQuarterlyStateBreakdownRow } from '@/lib/pipeline-quarterly/fetch-status-breakdown';

type Props = {
  rows: readonly PipelineQuarterlyStateBreakdownRow[];
  maxBars?: number;
};

export function PipelineStateBarChart({ rows, maxBars = 5 }: Props) {
  const data = rows.slice(0, maxBars).map((r) => ({
    state: r.stateAbbr,
    properties: r.propertyCount,
    units: r.unitCount,
  }));

  if (data.length === 0) {
    return <p className="text-xs text-neutral-500">No state breakdown available.</p>;
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
          <XAxis dataKey="state" tick={{ fontSize: 11, fill: '#525252' }} />
          <YAxis tick={{ fontSize: 11, fill: '#737373' }} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              border: '1px solid #d4d4c8',
              background: '#fff',
            }}
          />
          <Bar dataKey="properties" name="Properties" fill="#5c6b4a" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
