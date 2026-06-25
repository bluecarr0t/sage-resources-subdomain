'use client';

import { useTranslations } from 'next-intl';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PipelineWorkloadCharts } from '@/lib/project-pipeline/workload-charts';

type Props = {
  data: PipelineWorkloadCharts;
};

export function PipelineWorkloadChartsPanel({ data }: Props) {
  const t = useTranslations('admin.pipelineWorkload');

  const chartData = data.byMonth.map((row) => ({
    month: row.monthLabel,
    outdoor: row.outdoor,
    commercial: row.commercial,
    total: row.total,
  }));

  if (data.byMonth.every((row) => row.total === 0)) {
    return (
      <div className="admin-surface px-4 py-8 text-center text-sm text-neutral-500">
        {t('chartsEmpty')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="admin-surface p-4">
        <h2 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          {t('chartsTitle')}
        </h2>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#525252' }} />
              <YAxis tick={{ fontSize: 11, fill: '#737373' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  border: '1px solid #d4d4c8',
                  background: '#fff',
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar
                dataKey="outdoor"
                name={t('filterSegmentOutdoor')}
                stackId="jobs"
                fill="#4a624a"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="commercial"
                name={t('filterSegmentCommercial')}
                stackId="jobs"
                fill="#f59e0b"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="admin-surface overflow-x-auto">
        <h2 className="border-b border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-900 dark:border-neutral-800 dark:text-neutral-100">
          {t('chartsTableTitle')}
        </h2>
        <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800">
          <thead className="admin-table-head">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium uppercase">{t('chartsColumnMonth')}</th>
              <th className="px-3 py-3 text-right text-xs font-medium uppercase">{t('columnTotal')}</th>
              <th className="px-3 py-3 text-right text-xs font-medium uppercase">Outdoor</th>
              <th className="px-3 py-3 text-right text-xs font-medium uppercase">Commercial</th>
              <th className="px-3 py-3 text-right text-xs font-medium uppercase">{t('chartsColumnIncomplete')}</th>
              <th className="px-3 py-3 text-right text-xs font-medium uppercase">{t('chartsColumnMom')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {data.byMonth.map((row) => (
              <tr key={row.sortKey} className="text-sm">
                <td className="px-3 py-3 font-medium text-neutral-900 dark:text-neutral-100">
                  {row.monthLabel}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">{row.total}</td>
                <td className="px-3 py-3 text-right tabular-nums">{row.outdoor}</td>
                <td className="px-3 py-3 text-right tabular-nums">{row.commercial}</td>
                <td className="px-3 py-3 text-right tabular-nums">{row.incomplete}</td>
                <td className="px-3 py-3 text-right tabular-nums text-neutral-600 dark:text-neutral-400">
                  {row.monthOverMonthChange == null
                    ? '—'
                    : row.monthOverMonthChange > 0
                      ? `+${row.monthOverMonthChange}`
                      : String(row.monthOverMonthChange)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.unparsedJobCount > 0 ? (
        <p className="text-xs text-neutral-500">
          {t('chartsUnparsed', { count: data.unparsedJobCount })}
        </p>
      ) : null}
    </div>
  );
}
