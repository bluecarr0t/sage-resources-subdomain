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
  SIZE_TIER_KEYS,
  type SizeTierChartRow,
  type SizeTierKey,
} from '@/lib/rv-industry-overview/campspot-size-tier-chart-data';

type ChartDatum = {
  name: string;
  tierKey: SizeTierKey;
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
  rows: SizeTierChartRow[];
  /** Omit title, intro, body, table heading & footnote (for JPEG: chart + data table only) */
  variant?: 'default' | 'compact';
};

function niceCeil(step: number, cap: number, ...vals: (number | null | undefined)[]) {
  const m = Math.max(
    cap,
    ...vals.map((v) => (v != null && Number.isFinite(v) ? v : 0))
  );
  return Math.ceil(m / step) * step;
}

function pctChange(from: number | null, to: number | null): number | null {
  if (from == null || to == null || from === 0) return null;
  return Math.round(((to - from) / from) * 1000) / 10;
}

export default function ResortSizeImpactChart({ rows, variant = 'default' }: Props) {
  const t = useTranslations('admin.rvIndustryOverview.sizeImpact');
  const compact = variant === 'compact';

  const data = useMemo((): ChartDatum[] => {
    const byKey = new Map(rows.map((r) => [r.tierKey, r]));
    return SIZE_TIER_KEYS.map((tierKey) => {
      const r = byKey.get(tierKey);
      const occ2024 = r?.occ2024 ?? null;
      const occ2025 = r?.occ2025 ?? null;
      const adr2024 = r?.adr2024 ?? null;
      const adr2025 = r?.adr2025 ?? null;
      return {
        name: t(`tier.${tierKey}`),
        tierKey,
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
    () => niceCeil(10, 60, ...data.flatMap((d) => [d.occ2024, d.occ2025])),
    [data]
  );
  const adrMax = useMemo(
    () => niceCeil(10, 90, ...data.flatMap((d) => [d.adr2024, d.adr2025])),
    [data]
  );

  const chartBlock = (
    <div className="w-full h-[min(420px,65vh)] min-h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 12, right: 32, left: 4, bottom: 48 }}
            barCategoryGap="20%"
            barGap={8}
          >
            {/* Solid fills so html2canvas JPEG export shows bar swatches in the legend */}
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-gray-200 dark:stroke-gray-700" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: 'currentColor' }}
              className="text-gray-700 dark:text-gray-300"
              interval={0}
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
                const fmtOcc = (v: number, isNull: boolean) =>
                  isNull ? t('tooltipNoData') : `${v.toFixed(1)}%`;
                const fmtAdr = (v: number, isNull: boolean) =>
                  isNull ? t('tooltipNoData') : `$${v.toFixed(2)}`;
                return (
                  <div className="rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-xs shadow-md">
                    <div className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{d.name}</div>
                    <div className="text-gray-700 dark:text-gray-300 space-y-0.5">
                      <div>
                        {t('series.occ2024')}: {fmtOcc(d.occ2024, d.occ2024Null)}
                      </div>
                      <div>
                        {t('series.occ2025')}: {fmtOcc(d.occ2025, d.occ2025Null)}
                      </div>
                      <div>
                        {t('series.adr2024')}: {fmtAdr(d.adr2024, d.adr2024Null)}
                      </div>
                      <div>
                        {t('series.adr2025')}: {fmtAdr(d.adr2025, d.adr2025Null)}
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ paddingTop: 12, fontSize: 12 }} />
            <Bar
              yAxisId="left"
              dataKey="occ2024"
              name={t('series.occ2024')}
              fill="#2563eb"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
            <Bar
              yAxisId="left"
              dataKey="occ2025"
              name={t('series.occ2025')}
              fill="#16a34a"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="adr2024"
              name={t('series.adr2024')}
              stroke="#dc2626"
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 2, fill: '#ffffff', stroke: '#dc2626' }}
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

  const tableBlock = (
    <div className={compact ? 'mt-4' : 'mt-6'}>
      {!compact ? (
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">{t('tableTitle')}</p>
      ) : null}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-900/80 text-gray-700 dark:text-gray-300">
              <tr>
                <th className="px-3 py-2 font-semibold">{t('tableColTier')}</th>
                <th className="px-3 py-2 font-semibold">{t('tableColOcc2024')}</th>
                <th className="px-3 py-2 font-semibold">{t('tableColOcc2025')}</th>
                <th className="px-3 py-2 font-semibold">{t('tableColAdr2024')}</th>
                <th className="px-3 py-2 font-semibold">{t('tableColAdr2025')}</th>
                <th className="px-3 py-2 font-semibold">{t('tableColAdrChange')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-gray-800 dark:text-gray-200">
              {data.map((d) => {
                const ch = pctChange(
                  d.adr2024Null ? null : d.adr2024,
                  d.adr2025Null ? null : d.adr2025
                );
                return (
                  <tr key={d.tierKey}>
                    <td className="px-3 py-2 font-medium">{d.name}</td>
                    <td className="px-3 py-2">{d.occ2024Null ? '-' : `${d.occ2024.toFixed(1)}%`}</td>
                    <td className="px-3 py-2">{d.occ2025Null ? '-' : `${d.occ2025.toFixed(1)}%`}</td>
                    <td className="px-3 py-2">{d.adr2024Null ? '-' : `$${d.adr2024.toFixed(2)}`}</td>
                    <td className="px-3 py-2">{d.adr2025Null ? '-' : `$${d.adr2025.toFixed(2)}`}</td>
                    <td className="px-3 py-2">{ch == null ? '-' : `${ch >= 0 ? '+' : ''}${ch.toFixed(1)}%`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      {!compact ? (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t('tableFootnote')}</p>
      ) : null}
    </div>
  );

  if (compact) {
    return (
      <div className="w-full">
        {chartBlock}
        {tableBlock}
      </div>
    );
  }

  return (
    <div className="w-full">
      <h2 className="text-center text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">
        {t('chartTitle')}
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 max-w-4xl mx-auto text-center">
        {t('intro')}
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 max-w-4xl">
        {t('body')}
      </p>
      {chartBlock}
      {tableBlock}
    </div>
  );
}
