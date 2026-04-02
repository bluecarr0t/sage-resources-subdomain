'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import {
  RV_PARKING_RATE_KEYS,
  type RvParkingDistKey,
  type RvParkingDistSlice,
  type RvParkingRateBar,
  type RvParkingRateKey,
} from '@/lib/rv-industry-overview/campspot-rv-parking-charts-data';

const PIE_FILL: Record<RvParkingDistKey, string> = {
  back_in: '#4a8f52',
  pull_thru: '#d4a05a',
  not_listed: '#a84838',
};

const BAR_FILL: Record<RvParkingRateKey, string> = {
  pull_thru: '#d4a05a',
  back_in: '#4a8f52',
};

type PieDatum = {
  name: string;
  parkingKey: RvParkingDistKey;
  value: number;
};

type BarDatum = {
  name: string;
  parkingKey: RvParkingRateKey;
  value: number;
  labelText: string;
  isEmpty: boolean;
};

type Props = {
  distribution: RvParkingDistSlice[];
  rateBars: RvParkingRateBar[];
  totalRvRows: number;
};

function niceCeil(step: number, floor: number, ...vals: number[]) {
  const m = Math.max(floor, ...vals.map((v) => (Number.isFinite(v) ? v : 0)));
  return Math.ceil(m / step) * step;
}

const RADIAN = Math.PI / 180;

function PieSliceLabel(props: {
  cx?: number;
  cy?: number;
  midAngle?: number;
  outerRadius?: number;
  name?: string;
  percent?: number;
}) {
  const { cx = 0, cy = 0, midAngle = 0, outerRadius = 0, name = '', percent = 0 } = props;
  const radius = outerRadius + 26;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const textAnchor = x > cx ? 'start' : 'end';
  return (
    <text
      x={x}
      y={y}
      fill="#111827"
      textAnchor={textAnchor}
      dominantBaseline="central"
      fontSize={11}
      fontWeight={600}
      style={{ fontFamily: 'system-ui, sans-serif' }}
    >
      {`${name} ${(percent * 100).toFixed(1)}%`}
    </text>
  );
}

export default function RvSiteTypesDistributionRatesCharts({
  distribution,
  rateBars,
  totalRvRows,
}: Props) {
  const t = useTranslations('admin.rvIndustryOverview.rvSiteTypesDistributionRates');

  const pieData = useMemo((): PieDatum[] => {
    return distribution
      .filter((d) => d.n > 0)
      .map((d) => ({
        parkingKey: d.parkingKey,
        name: t(`parking.${d.parkingKey}`),
        value: d.n,
      }));
  }, [distribution, t]);

  const barData = useMemo((): BarDatum[] => {
    const byKey = new Map(rateBars.map((r) => [r.parkingKey, r]));
    return RV_PARKING_RATE_KEYS.map((parkingKey) => {
      const r = byKey.get(parkingKey);
      const v = r?.avgAdr2025;
      const isEmpty = r == null || v == null || (r.n ?? 0) === 0;
      return {
        parkingKey,
        name: t(`parking.${parkingKey}`),
        value: isEmpty ? 0 : v,
        labelText: isEmpty ? '—' : `$${Math.round(v!)}`,
        isEmpty,
      };
    });
  }, [rateBars, t]);

  const yMax = useMemo(
    () => niceCeil(10, 70, ...barData.map((d) => d.value)),
    [barData]
  );

  const yTicks = useMemo(() => {
    const out: number[] = [];
    for (let v = 0; v <= yMax; v += 10) {
      out.push(v);
    }
    return out;
  }, [yMax]);

  const hasDistData = totalRvRows > 0 && pieData.length > 0;
  const hasRateData = rateBars.some((r) => r.n > 0 && r.avgAdr2025 != null);

  return (
    <div className="rounded-lg bg-white p-3 sm:p-4 space-y-6">
      {!hasDistData && !hasRateData ? (
        <p className="text-center text-sm text-gray-600 py-12">{t('noData')}</p>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-6 lg:items-stretch">
          <div className="flex-1 min-w-0 flex flex-col items-center">
            {!hasDistData ? (
              <p className="text-sm text-gray-600 py-8">{t('noDistributionData')}</p>
            ) : (
              <div className="w-full h-[min(340px,50vh)] min-h-[280px] max-w-md mx-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 16, right: 56, bottom: 16, left: 56 }}>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      paddingAngle={1}
                      labelLine={false}
                      label={PieSliceLabel}
                      isAnimationActive={false}
                    >
                      {pieData.map((d) => (
                        <Cell key={d.parkingKey} fill={PIE_FILL[d.parkingKey]} stroke="#111827" strokeWidth={0.5} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {!hasRateData ? (
              <p className="text-sm text-gray-600 py-8">{t('noRateData')}</p>
            ) : (
              <div className="rounded-md bg-white px-2 py-3 sm:px-3 h-full">
                <div className="w-full h-[min(340px,50vh)] min-h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={barData}
                      margin={{ top: 32, right: 12, left: 4, bottom: 88 }}
                      barCategoryGap="28%"
                    >
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: '#111827', fontFamily: 'system-ui, sans-serif' }}
                        tickLine={{ stroke: '#111827' }}
                        axisLine={{ stroke: '#111827' }}
                        interval={0}
                        angle={-42}
                        textAnchor="end"
                        height={80}
                        tickMargin={16}
                        label={{
                          value: t('barAxisX'),
                          position: 'bottom',
                          offset: 42,
                          style: {
                            fontSize: 11,
                            fill: '#111827',
                            fontWeight: 700,
                            fontFamily: 'system-ui, sans-serif',
                          },
                        }}
                      />
                      <YAxis
                        domain={[0, yMax]}
                        ticks={yTicks}
                        tick={{ fontSize: 11, fill: '#111827', fontFamily: 'system-ui, sans-serif' }}
                        tickLine={{ stroke: '#111827' }}
                        axisLine={{ stroke: '#111827' }}
                        tickFormatter={(v) => `$${v}`}
                        label={{
                          value: t('barAxisY'),
                          angle: -90,
                          position: 'insideLeft',
                          style: {
                            fontSize: 11,
                            fill: '#111827',
                            fontWeight: 700,
                            fontFamily: 'system-ui, sans-serif',
                          },
                        }}
                      />
                      <Bar dataKey="value" radius={[2, 2, 0, 0]} maxBarSize={72} isAnimationActive={false}>
                        {barData.map((d) => (
                          <Cell key={d.parkingKey} fill={BAR_FILL[d.parkingKey]} />
                        ))}
                        <LabelList
                          dataKey="labelText"
                          position="top"
                          style={{
                            fontSize: 12,
                            fill: '#111827',
                            fontWeight: 700,
                            fontFamily: 'system-ui, sans-serif',
                          }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
