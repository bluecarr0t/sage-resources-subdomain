'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PipelineQuarterlyStatusCount } from '@/lib/pipeline-quarterly/fetch-overview';

const BAR_COLORS = ['#5c6b4a', '#7a8a62', '#98a97a', '#b6c892', '#8b7355'];

type Props = {
  statusCounts: readonly PipelineQuarterlyStatusCount[];
};

export function PipelineStatusMixChart({ statusCounts }: Props) {
  const data = statusCounts
    .filter((s) => s.propertyCount > 0)
    .map((s) => ({
      slug: s.slug,
      name: s.label,
      properties: s.propertyCount,
    }));

  if (data.length === 0) {
    return (
      <p className="text-xs text-neutral-500">No pipeline properties in this cohort.</p>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: '#737373' }} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="name"
            width={120}
            tick={{ fontSize: 11, fill: '#525252' }}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              border: '1px solid #d4d4c8',
              background: '#fff',
            }}
            formatter={(value) => [value, 'Properties']}
          />
          <Bar dataKey="properties" radius={[0, 2, 2, 0]}>
            {data.map((entry, index) => (
              <Cell key={entry.slug} fill={BAR_COLORS[index % BAR_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
