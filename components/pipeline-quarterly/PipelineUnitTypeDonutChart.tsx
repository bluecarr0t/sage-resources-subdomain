'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { PipelineQuarterlyUnitTypeBreakdownRow } from '@/lib/pipeline-quarterly/fetch-status-breakdown';

const SLICE_COLORS = ['#5c6b4a', '#7a8a62', '#98a97a', '#b6c892', '#8b7355', '#c4b5a0'];

const RADIAN = Math.PI / 180;

function truncateUnitTypeLabel(name: string, maxLength = 20): string {
  if (name.length <= maxLength) return name;
  return `${name.slice(0, maxLength - 1)}…`;
}

function PieSliceLabel(props: {
  cx?: number;
  cy?: number;
  midAngle?: number;
  outerRadius?: number;
  name?: string;
  percent?: number;
}) {
  const { cx = 0, cy = 0, midAngle = 0, outerRadius = 0, name = '', percent = 0 } = props;
  if (percent < 0.04) return null;

  const radius = outerRadius + 22;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const textAnchor = x > cx ? 'start' : 'end';

  return (
    <text
      x={x}
      y={y}
      fill="#404040"
      textAnchor={textAnchor}
      dominantBaseline="central"
      fontSize={10}
      fontWeight={500}
    >
      {`${truncateUnitTypeLabel(name)} ${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

type Props = {
  rows: readonly PipelineQuarterlyUnitTypeBreakdownRow[];
  maxSlices?: number;
};

export function PipelineUnitTypeDonutChart({ rows, maxSlices = 6 }: Props) {
  const top = rows.slice(0, maxSlices);
  const otherUnits = rows.slice(maxSlices).reduce((s, r) => s + r.unitCount, 0);
  const data = [
    ...top.map((r) => ({ name: r.unitType, value: r.unitCount })),
    ...(otherUnits > 0 ? [{ name: 'Other', value: otherUnits }] : []),
  ];

  if (data.length === 0) {
    return <p className="text-xs text-neutral-500">No unit-type mix available.</p>;
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 12, right: 64, bottom: 12, left: 64 }}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={68}
            outerRadius={102}
            paddingAngle={1}
            labelLine={false}
            label={PieSliceLabel}
            isAnimationActive={false}
          >
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={SLICE_COLORS[index % SLICE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              fontSize: 12,
              border: '1px solid #d4d4c8',
              background: '#fff',
            }}
            formatter={(value, name) => [`${value} units`, name]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
