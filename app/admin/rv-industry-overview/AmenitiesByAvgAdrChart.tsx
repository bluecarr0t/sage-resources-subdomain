'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Bar,
  BarChart,
  LabelList,
  Legend,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AMENITY_ADR_CHART_KEYS,
  type AmenityAdrChartKey,
  type AmenityAdrChartRow,
} from '@/lib/rv-industry-overview/campspot-amenity-adr-chart-data';

const FILL_WITHOUT = '#b54a3c';
const FILL_WITH = '#6d8c62';

type ChartDatum = {
  name: string;
  amenityKey: AmenityAdrChartKey;
  withoutAdr: number;
  withAdr: number;
  withoutNull: boolean;
  withNull: boolean;
  diffRounded: number | null;
};

type Props = {
  rows: AmenityAdrChartRow[];
};

function niceCeil(step: number, floor: number, ...vals: number[]) {
  const m = Math.max(floor, ...vals.map((v) => (Number.isFinite(v) ? v : 0)));
  return Math.ceil(m / step) * step;
}

type LabelProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: number | string;
  payload?: ChartDatum;
};

function WithoutBarLabel(props: LabelProps) {
  const { x = 0, y = 0, width = 0, value, payload } = props;
  if (payload?.withoutNull) return null;
  const v = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(v)) return null;
  return (
    <text
      x={x + width / 2}
      y={y - 4}
      fill="#111827"
      fontSize={11}
      fontWeight={700}
      textAnchor="middle"
      style={{ fontFamily: 'system-ui, sans-serif' }}
    >
      {`$${Math.round(v)}`}
    </text>
  );
}

function WithBarLabel(props: LabelProps) {
  const { x = 0, y = 0, width = 0, value, payload } = props;
  if (payload?.withNull) return null;
  const v = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(v)) return null;
  const diff = payload?.diffRounded;
  const cx = x + width / 2;
  return (
    <g>
      {diff != null ? (
        <text
          x={cx}
          y={y - 20}
          fill={diff > 0 ? '#15803d' : '#374151'}
          fontSize={11}
          fontWeight={700}
          textAnchor="middle"
          style={{ fontFamily: 'system-ui, sans-serif' }}
        >
          {diff > 0 ? `+$${diff}` : diff < 0 ? `-$${Math.abs(diff)}` : '$0'}
        </text>
      ) : null}
      <text
        x={cx}
        y={y - 6}
        fill="#111827"
        fontSize={11}
        fontWeight={700}
        textAnchor="middle"
        style={{ fontFamily: 'system-ui, sans-serif' }}
      >
        {`$${Math.round(v)}`}
      </text>
    </g>
  );
}

export default function AmenitiesByAvgAdrChart({ rows }: Props) {
  const t = useTranslations('admin.rvIndustryOverview.amenitiesByAvgAdr');

  const data = useMemo((): ChartDatum[] => {
    const byKey = new Map(rows.map((r) => [r.amenityKey, r]));
    return AMENITY_ADR_CHART_KEYS.map((amenityKey) => {
      const r = byKey.get(amenityKey)!;
      const withoutNull = r.nWithout === 0 || r.avgWithout == null;
      const withNull = r.nWith === 0 || r.avgWith == null;
      return {
        amenityKey,
        name: t(`amenity.${amenityKey}`),
        withoutAdr: withoutNull ? 0 : r.avgWithout!,
        withAdr: withNull ? 0 : r.avgWith!,
        withoutNull,
        withNull,
        diffRounded: r.diffRounded,
      };
    });
  }, [rows, t]);

  const yMax = useMemo(() => {
    const vals = data.flatMap((d) => [
      d.withoutNull ? 0 : d.withoutAdr,
      d.withNull ? 0 : d.withAdr,
    ]);
    return niceCeil(20, 100, ...vals, 0);
  }, [data]);

  const ticks = useMemo(() => {
    const out: number[] = [];
    for (let v = 0; v <= yMax; v += 20) {
      out.push(v);
    }
    return out;
  }, [yMax]);

  const hasAnyData = rows.some((r) => r.nWith > 0 || r.nWithout > 0);

  return (
    <div className="rounded-lg bg-white p-3 sm:p-4">
      {!hasAnyData ? (
        <p className="text-center text-sm text-gray-600 py-12">{t('noData')}</p>
      ) : (
        <div className="rounded-md bg-white px-2 py-3 sm:px-3">
          <div className="w-full h-[min(400px,68vh)] min-h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 40, right: 12, left: 4, bottom: 92 }}
                barCategoryGap="22%"
                barGap={4}
              >
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#111827', fontFamily: 'system-ui, sans-serif' }}
                  tickLine={{ stroke: '#111827' }}
                  axisLine={{ stroke: '#111827' }}
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                  height={78}
                  tickMargin={14}
                  label={{
                    value: t('axisX'),
                    position: 'bottom',
                    offset: 48,
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
                  ticks={ticks}
                  tick={{ fontSize: 11, fill: '#111827', fontFamily: 'system-ui, sans-serif' }}
                  tickLine={{ stroke: '#111827' }}
                  axisLine={{ stroke: '#111827' }}
                  tickFormatter={(v) => `$${v}`}
                  label={{
                    value: t('axisY'),
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
                <Legend
                  align="right"
                  verticalAlign="top"
                  wrapperStyle={{ fontSize: 12, paddingBottom: 4 }}
                />
                <Bar
                  dataKey="withoutAdr"
                  name={t('legend.without')}
                  fill={FILL_WITHOUT}
                  radius={[2, 2, 0, 0]}
                  maxBarSize={44}
                  isAnimationActive={false}
                >
                  <LabelList content={WithoutBarLabel} />
                </Bar>
                <Bar
                  dataKey="withAdr"
                  name={t('legend.with')}
                  fill={FILL_WITH}
                  radius={[2, 2, 0, 0]}
                  maxBarSize={44}
                  isAnimationActive={false}
                >
                  <LabelList content={WithBarLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
