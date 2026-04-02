'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  TRENDS_CHART_CATEGORY_KEYS,
  type TrendsChartCategoryKey,
  type TrendsChartRow,
} from '@/lib/rv-industry-overview/campspot-trends-chart-data';

type ChartDatum = {
  name: string;
  categoryKey: TrendsChartCategoryKey;
  occ2024: number;
  occ2025: number;
  adr2024: number;
  adr2025: number;
  occ2024Null: boolean;
  occ2025Null: boolean;
  adr2024Null: boolean;
  adr2025Null: boolean;
};

type Props = {
  rows: TrendsChartRow[];
  /** Omit title, intro, and methodology (for JPEG export shell) */
  variant?: 'default' | 'compact';
};

function niceCeil(step: number, cap: number, ...vals: (number | null | undefined)[]) {
  const m = Math.max(
    cap,
    ...vals.map((v) => (v != null && Number.isFinite(v) ? v : 0))
  );
  return Math.ceil(m / step) * step;
}

export default function OccupancyAdrTrendsChart({ rows, variant = 'default' }: Props) {
  const t = useTranslations('admin.rvIndustryOverview.trends');
  const compact = variant === 'compact';

  const data = useMemo((): ChartDatum[] => {
    const byKey = new Map(rows.map((r) => [r.categoryKey, r]));
    return TRENDS_CHART_CATEGORY_KEYS.map((categoryKey) => {
      const r = byKey.get(categoryKey);
      const occ2024 = r?.occ2024 ?? null;
      const occ2025 = r?.occ2025 ?? null;
      const adr2024 = r?.adr2024 ?? null;
      const adr2025 = r?.adr2025 ?? null;
      return {
        name: t(`category.${categoryKey}`),
        categoryKey,
        occ2024: occ2024 ?? 0,
        occ2025: occ2025 ?? 0,
        adr2024: adr2024 ?? 0,
        adr2025: adr2025 ?? 0,
        occ2024Null: occ2024 == null,
        occ2025Null: occ2025 == null,
        adr2024Null: adr2024 == null,
        adr2025Null: adr2025 == null,
      };
    });
  }, [rows, t]);

  const occMax = useMemo(
    () => niceCeil(10, 70, ...data.flatMap((d) => [d.occ2024, d.occ2025])),
    [data]
  );
  const adrMax = useMemo(
    () => niceCeil(20, 120, ...data.flatMap((d) => [d.adr2024, d.adr2025])),
    [data]
  );

  const chartBlock = (
    <div className="w-full h-[min(480px,70vh)] min-h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 16, right: 28, left: 8, bottom: 72 }}
            barCategoryGap="18%"
            barGap={6}
          >
            {/* Solid fills (not SVG gradients) so html2canvas JPEG export shows bar colors in the legend */}
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-gray-200 dark:stroke-gray-700" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: 'currentColor' }}
              className="text-gray-700 dark:text-gray-300"
              interval={0}
              angle={-12}
              textAnchor="end"
              height={68}
              tickMargin={12}
            />
            <YAxis
              yAxisId="left"
              orientation="left"
              domain={[0, occMax]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 11, fill: 'currentColor' }}
              className="text-gray-700 dark:text-gray-300"
              label={{
                value: t('axisOccupancy'),
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 11, fill: 'currentColor' },
              }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, adrMax]}
              tickFormatter={(v) => `$${v}`}
              tick={{ fontSize: 11, fill: 'currentColor' }}
              className="text-gray-700 dark:text-gray-300"
              label={{
                value: t('axisAdr'),
                angle: 90,
                position: 'insideRight',
                style: { fontSize: 11, fill: 'currentColor' },
              }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as ChartDatum;
                const fmt = (v: number, isNull: boolean, suffix: string) =>
                  isNull ? t('tooltipNoData') : `${v.toFixed(1)}${suffix}`;
                return (
                  <div className="rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-xs shadow-md">
                    <div className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{d.name}</div>
                    <div className="text-gray-700 dark:text-gray-300 space-y-0.5">
                      <div>
                        {t('series.occ2024')}: {fmt(d.occ2024, d.occ2024Null, '%')}
                      </div>
                      <div>
                        {t('series.occ2025')}: {fmt(d.occ2025, d.occ2025Null, '%')}
                      </div>
                      <div>
                        {t('series.adr2024')}: {d.adr2024Null ? t('tooltipNoData') : `$${d.adr2024.toFixed(2)}`}
                      </div>
                      <div>
                        {t('series.adr2025')}: {d.adr2025Null ? t('tooltipNoData') : `$${d.adr2025.toFixed(2)}`}
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ paddingTop: 16, fontSize: 12 }} />
            <Bar
              yAxisId="left"
              dataKey="occ2024"
              name={t('series.occ2024')}
              fill="#1d4ed8"
              radius={[3, 3, 0, 0]}
              maxBarSize={36}
            />
            <Bar
              yAxisId="left"
              dataKey="occ2025"
              name={t('series.occ2025')}
              fill="#dc2626"
              radius={[3, 3, 0, 0]}
              maxBarSize={36}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="adr2024"
              name={t('series.adr2024')}
              stroke="#15803d"
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 2, fill: '#ffffff', stroke: '#15803d' }}
              activeDot={{ r: 5 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="adr2025"
              name={t('series.adr2025')}
              stroke="#7c3aed"
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 2, fill: '#ffffff', stroke: '#7c3aed' }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
    </div>
  );

  if (compact) {
    return <div className="w-full">{chartBlock}</div>;
  }

  return (
    <div className="w-full">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
        {t('chartTitle')}
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 max-w-4xl">
        {t('intro')}
      </p>
      {chartBlock}
      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">{t('methodology')}</p>
    </div>
  );
}
