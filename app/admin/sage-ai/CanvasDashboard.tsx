'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell as RPCell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { ArrowDown, ArrowDownWideNarrow, ArrowUp, ArrowUpNarrowWide, Download, Maximize2, X } from 'lucide-react';
import { Modal, ModalContent } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { DashboardPayload, DashboardCell } from '@/lib/sage-ai/ui-parts';
import { downloadElementAsPng, slugifyChartFilename } from '@/lib/sage-ai/download-chart-png';
import {
  SAGE_AI_CHART_COLORS,
  SAGE_AI_CHART_GRID_STROKE,
  formatChartSeriesLegendLabel,
} from '@/lib/sage-ai/chart-palette';
import { buildScatterChartData } from '@/lib/sage-ai/scatter-chart-data';

const DEFAULT_SERIES_COLORS: readonly string[] = [...SAGE_AI_CHART_COLORS];

const CHART_HEIGHT_COMPACT = 220;
const CHART_HEIGHT_EXPANDED = 420;

function formatValue(
  value: string | number | null | undefined,
  format: DashboardCell['value_format']
): string {
  if (value == null) return '—';
  if (typeof value === 'string') return value;
  switch (format) {
    case 'currency_usd':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(value);
    case 'percent':
      return new Intl.NumberFormat('en-US', {
        style: 'percent',
        maximumFractionDigits: 1,
      }).format(value);
    case 'count':
    case 'number':
    default:
      return new Intl.NumberFormat('en-US').format(value);
  }
}

function toNumericSortValue(v: unknown): number {
  if (v == null) return Number.NaN;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return Number.NaN;
}

/** Sum of numeric y-values across series for bar sort (single-key uses that column only). */
function barRowSortMetric(row: Record<string, unknown>, seriesKeys: string[]): number {
  if (seriesKeys.length === 0) return 0;
  let sum = 0;
  let any = false;
  for (const k of seriesKeys) {
    const n = toNumericSortValue(row[k]);
    if (Number.isFinite(n)) {
      sum += n;
      any = true;
    }
  }
  if (!any) return Number.NEGATIVE_INFINITY;
  return sum;
}

function sortBarRows(
  rows: readonly unknown[],
  seriesKeys: string[],
  order: 'asc' | 'desc'
): Record<string, unknown>[] {
  const asObjects = rows.filter(
    (r): r is Record<string, unknown> => r != null && typeof r === 'object' && !Array.isArray(r)
  );
  const copy = asObjects.slice();
  copy.sort((a, b) => {
    const av = barRowSortMetric(a, seriesKeys);
    const bv = barRowSortMetric(b, seriesKeys);
    const aFin = Number.isFinite(av) && av !== Number.NEGATIVE_INFINITY;
    const bFin = Number.isFinite(bv) && bv !== Number.NEGATIVE_INFINITY;
    if (!aFin && !bFin) return 0;
    if (!aFin) return 1;
    if (!bFin) return -1;
    return order === 'desc' ? bv - av : av - bv;
  });
  return copy;
}

function resolveSeries(cell: DashboardCell) {
  if (cell.series && cell.series.length > 0) {
    return cell.series.map((s, i) => ({
      key: s.key,
      label:
        s.label != null && String(s.label).trim() !== ''
          ? s.label
          : formatChartSeriesLegendLabel(s.key),
      color: s.color ?? DEFAULT_SERIES_COLORS[i % DEFAULT_SERIES_COLORS.length],
    }));
  }
  const ys = cell.y_keys ?? [];
  return ys.map((k, i) => ({
    key: k,
    label: formatChartSeriesLegendLabel(k),
    color: DEFAULT_SERIES_COLORS[i % DEFAULT_SERIES_COLORS.length],
  }));
}

function StatCell({ cell }: { cell: DashboardCell }) {
  const direction = cell.delta?.direction ?? 'neutral';
  const deltaColor =
    direction === 'up'
      ? 'text-sage-700 dark:text-sage-400'
      : direction === 'down'
        ? 'text-amber-800 dark:text-amber-500/90'
        : 'text-gray-500 dark:text-gray-400';
  return (
    <div className="flex h-full flex-col justify-between">
      <div>
        <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
          {cell.title}
        </div>
        {cell.subtitle && (
          <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {cell.subtitle}
          </div>
        )}
      </div>
      <div className="mt-4">
        <div className="text-3xl font-semibold tabular-nums text-gray-900 dark:text-gray-50">
          {formatValue(cell.value, cell.value_format ?? 'number')}
        </div>
        {cell.delta && (
          <div
            className={`mt-1 flex items-center gap-1 text-xs font-medium ${deltaColor}`}
          >
            {direction === 'up' && <ArrowUp className="h-3 w-3" />}
            {direction === 'down' && <ArrowDown className="h-3 w-3" />}
            <span>
              {formatValue(cell.delta.value, cell.value_format ?? 'number')}
            </span>
            {cell.delta.label && (
              <span className="text-gray-500 dark:text-gray-400">
                {cell.delta.label}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ChartCell({
  cell,
  height,
  dataRows,
}: {
  cell: DashboardCell;
  height: number;
  /** When set (e.g. user-sorted bar data), used instead of `cell.rows` for drawing. */
  dataRows?: Record<string, unknown>[];
}) {
  const rawRows = (dataRows ?? cell.rows) ?? [];
  const series = resolveSeries(cell);
  const xKey = cell.x_key ?? 'name';
  const yKey0 = series[0]?.key ?? 'y';

  const scatterPrepped = useMemo(() => {
    if (cell.kind !== 'scatter') return null;
    return buildScatterChartData(rawRows, xKey, yKey0);
  }, [cell.kind, rawRows, xKey, yKey0]);

  if (rawRows.length === 0) {
    return (
      <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-1 px-2 text-center text-xs text-gray-500 dark:text-gray-400">
        <span>No chart data</span>
        <span className="max-w-[28ch] text-[11px] leading-snug text-gray-400 dark:text-gray-500">
          This panel was sent without <code className="rounded bg-gray-100 px-0.5 font-mono dark:bg-gray-800">rows</code>
          . The assistant should pass row data (e.g. from{' '}
          <code className="rounded bg-gray-100 px-0.5 font-mono dark:bg-gray-800">aggregate_properties</code>{' '}
          <code className="rounded bg-gray-100 px-0.5 font-mono dark:bg-gray-800">aggregates</code>).
        </span>
      </div>
    );
  }

  if (cell.kind === 'scatter' && (!scatterPrepped || scatterPrepped.rows.length === 0)) {
    return (
      <div className="flex h-full min-h-[180px] items-center justify-center text-xs text-gray-500 dark:text-gray-400">
        No plottable points (add numeric Y values, e.g. rate columns)
      </div>
    );
  }

  const rows =
    cell.kind === 'scatter' && scatterPrepped ? scatterPrepped.rows : rawRows;
  const scatterXType =
    cell.kind === 'scatter' && scatterPrepped
      ? scatterPrepped.xType
      : 'number';

  switch (cell.kind) {
    case 'bar':
      return (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={SAGE_AI_CHART_GRID_STROKE} />
            <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
            {series.map((s) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    case 'line':
      return (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={SAGE_AI_CHART_GRID_STROKE} />
            <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
            {series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );
    case 'area':
      return (
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={SAGE_AI_CHART_GRID_STROKE} />
            <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
            {series.map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                fill={s.color}
                fillOpacity={0.25}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      );
    case 'pie': {
      const nameKey = cell.name_key ?? xKey;
      const valueKey = cell.value_key ?? (cell.y_keys?.[0] ?? 'value');
      return (
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={rows}
              dataKey={valueKey}
              nameKey={nameKey}
              outerRadius={80}
              innerRadius={40}
              paddingAngle={2}
              label={false}
            >
              {rows.map((_, i) => (
                <RPCell
                  key={i}
                  fill={DEFAULT_SERIES_COLORS[i % DEFAULT_SERIES_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      );
    }
    case 'scatter': {
      const yKey = series[0]?.key ?? 'y';
      const categoryX = scatterXType === 'category';
      return (
        <ResponsiveContainer width="100%" height={height}>
          <ScatterChart
            margin={{
              top: 8,
              right: 8,
              left: 0,
              bottom: categoryX ? 36 : 6,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={SAGE_AI_CHART_GRID_STROKE} />
            <XAxis
              dataKey={xKey}
              type={scatterXType}
              allowDuplicatedCategory={categoryX}
              angle={categoryX ? -30 : 0}
              tick={{
                fontSize: 10,
                textAnchor: categoryX ? 'end' : 'middle',
              }}
              height={categoryX ? 50 : 30}
              name={xKey}
            />
            <YAxis
              dataKey={yKey}
              type="number"
              tick={{ fontSize: 11 }}
              name={series[0]?.label ?? yKey}
            />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Scatter
              name={series[0]?.label ?? yKey}
              data={rows}
              fill={series[0]?.color ?? DEFAULT_SERIES_COLORS[0]}
            />
          </ScatterChart>
        </ResponsiveContainer>
      );
    }
    default:
      return (
        <div className="text-xs text-gray-500">
          Unsupported chart kind: {cell.kind}
        </div>
      );
  }
}

function CellBody({
  cell,
  chartHeight,
  showChartToolbar,
  onExpandChart,
  onDownloadChart,
  expandLabel,
  downloadLabel,
  barSortGroupAria,
  barSortDescendingLabel,
  barSortAscendingLabel,
}: {
  cell: DashboardCell;
  chartHeight: number;
  showChartToolbar: boolean;
  onExpandChart?: () => void;
  onDownloadChart?: () => void;
  expandLabel: string;
  downloadLabel: string;
  barSortGroupAria: string;
  barSortDescendingLabel: string;
  barSortAscendingLabel: string;
}) {
  const [barSortOrder, setBarSortOrder] = useState<'asc' | 'desc'>('desc');
  const series = useMemo(() => resolveSeries(cell), [cell]);

  const barChartData = useMemo(() => {
    if (cell.kind !== 'bar' || !cell.rows || cell.rows.length === 0) {
      return undefined;
    }
    const keys = series.map((s) => s.key).filter((k) => k.length > 0);
    if (keys.length === 0) return undefined;
    return sortBarRows(cell.rows, keys, barSortOrder);
  }, [cell, series, barSortOrder]);

  if (cell.kind === 'stat') {
    return <StatCell cell={cell} />;
  }
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {cell.title}
          </div>
          {cell.subtitle && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {cell.subtitle}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {cell.kind === 'bar' && (
            <div
              className="mr-0.5 inline-flex items-center overflow-hidden rounded-md border border-gray-200/80 dark:border-gray-600"
              data-html2canvas-ignore
              role="group"
              aria-label={barSortGroupAria}
            >
              <button
                type="button"
                onClick={() => setBarSortOrder('desc')}
                aria-pressed={barSortOrder === 'desc'}
                className={`px-1.5 py-1.5 ${
                  barSortOrder === 'desc'
                    ? 'bg-sage-100 text-sage-800 dark:bg-sage-900/50 dark:text-sage-200'
                    : 'text-gray-500 hover:bg-gray-200/80 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-gray-100'
                }`}
                title={barSortDescendingLabel}
                aria-label={barSortDescendingLabel}
              >
                <ArrowDownWideNarrow className="h-3.5 w-3.5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setBarSortOrder('asc')}
                aria-pressed={barSortOrder === 'asc'}
                className={`border-l border-gray-200/80 px-1.5 py-1.5 dark:border-gray-600 ${
                  barSortOrder === 'asc'
                    ? 'bg-sage-100 text-sage-800 dark:bg-sage-900/50 dark:text-sage-200'
                    : 'text-gray-500 hover:bg-gray-200/80 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-gray-100'
                }`}
                title={barSortAscendingLabel}
                aria-label={barSortAscendingLabel}
              >
                <ArrowUpNarrowWide className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          )}
          {showChartToolbar && (onExpandChart || onDownloadChart) && (
            <div className="flex shrink-0 gap-0.5" data-html2canvas-ignore>
              {onExpandChart && (
                <button
                  type="button"
                  onClick={onExpandChart}
                  className="rounded-md p-1.5 text-gray-500 hover:bg-gray-200/80 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-gray-100"
                  aria-label={expandLabel}
                  title={expandLabel}
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
              )}
              {onDownloadChart && (
                <button
                  type="button"
                  onClick={onDownloadChart}
                  className="rounded-md p-1.5 text-gray-500 hover:bg-gray-200/80 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-gray-100"
                  aria-label={downloadLabel}
                  title={downloadLabel}
                >
                  <Download className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="mt-2 flex-1">
        <ChartCell
          cell={cell}
          height={chartHeight}
          dataRows={barChartData}
        />
      </div>
    </div>
  );
}

export function CanvasDashboard({ payload }: { payload: DashboardPayload }) {
  const t = useTranslations('admin.sageAi');
  const cells = useMemo(() => payload.cells, [payload.cells]);
  const [dashboardModalOpen, setDashboardModalOpen] = useState(false);
  const [singleChartIndex, setSingleChartIndex] = useState<number | null>(null);
  const [downloadBusy, setDownloadBusy] = useState(false);

  const dashboardCaptureRef = useRef<HTMLDivElement>(null);
  const modalDashboardRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<(HTMLDivElement | null)[]>([]);
  const singleChartRef = useRef<HTMLDivElement>(null);

  const runDownload = useCallback(
    async (node: HTMLElement | null, filename: string) => {
      if (!node || downloadBusy) return;
      setDownloadBusy(true);
      try {
        await downloadElementAsPng(node, filename);
      } catch (e) {
        console.error('[CanvasDashboard] export failed', e);
      } finally {
        setDownloadBusy(false);
      }
    },
    [downloadBusy]
  );

  const handleDownloadDashboard = useCallback(() => {
    void runDownload(dashboardCaptureRef.current, slugifyChartFilename(payload.title, 0));
  }, [payload.title, runDownload]);

  const handleDownloadCell = useCallback(
    (index: number) => {
      const cell = cells[index];
      const node = cellRefs.current[index];
      const name = slugifyChartFilename(cell?.title ?? 'chart', index);
      void runDownload(node, name);
    },
    [cells, runDownload]
  );

  const handleDownloadSingleModal = useCallback(() => {
    if (singleChartIndex === null) return;
    const cell = cells[singleChartIndex];
    void runDownload(
      singleChartRef.current,
      slugifyChartFilename(cell?.title ?? 'chart', singleChartIndex)
    );
  }, [cells, singleChartIndex, runDownload]);

  const singleCell =
    singleChartIndex !== null ? cells[singleChartIndex] : null;

  return (
    <div className="my-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div ref={dashboardCaptureRef}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold text-gray-900 dark:text-gray-50">
              {payload.title}
            </div>
            {payload.description && (
              <div className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
                {payload.description}
              </div>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1" data-html2canvas-ignore>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="!px-2"
              disabled={downloadBusy}
              onClick={() => setDashboardModalOpen(true)}
              aria-label={t('dashboardExpandFullscreen')}
              title={t('dashboardExpandFullscreen')}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="!px-2"
              disabled={downloadBusy}
              onClick={handleDownloadDashboard}
              aria-label={t('dashboardDownloadAll')}
              title={t('dashboardDownloadAll')}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-3">
          {cells.map((cell, i) => (
            <div
              key={i}
              ref={(el) => {
                cellRefs.current[i] = el;
              }}
              className="col-span-12 min-h-[160px] rounded-md border border-gray-100 bg-gray-50/60 p-3 dark:border-gray-800 dark:bg-gray-950/40"
              style={{ gridColumn: `span ${cell.span ?? 6} / span ${cell.span ?? 6}` }}
            >
              <CellBody
                cell={cell}
                chartHeight={CHART_HEIGHT_COMPACT}
                showChartToolbar={cell.kind !== 'stat'}
                expandLabel={t('dashboardExpandChart')}
                downloadLabel={t('dashboardDownloadChart')}
                barSortGroupAria={t('dashboardBarSortGroupAria')}
                barSortDescendingLabel={t('dashboardBarSortDescending')}
                barSortAscendingLabel={t('dashboardBarSortAscending')}
                onExpandChart={
                  cell.kind === 'stat' ? undefined : () => setSingleChartIndex(i)
                }
                onDownloadChart={
                  cell.kind === 'stat' ? undefined : () => handleDownloadCell(i)
                }
              />
            </div>
          ))}
        </div>
        {payload.footer_note && (
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            {payload.footer_note}
          </div>
        )}
      </div>

      <Modal
        open={dashboardModalOpen}
        onClose={() => setDashboardModalOpen(false)}
        className="max-h-[96vh] w-full max-w-[min(96vw,1600px)] overflow-hidden"
      >
        <ModalContent className="flex max-h-[92vh] flex-col overflow-hidden p-0">
          <div
            className="flex items-center justify-between gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-700"
            data-html2canvas-ignore
          >
            <div className="min-w-0 text-sm font-semibold text-gray-900 dark:text-gray-50">
              {payload.title}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="!px-2"
                disabled={downloadBusy}
                onClick={() => {
                  void runDownload(
                    modalDashboardRef.current,
                    slugifyChartFilename(payload.title, 0)
                  );
                }}
                aria-label={t('dashboardDownloadAll')}
                title={t('dashboardDownloadAll')}
              >
                <Download className="h-4 w-4" />
              </Button>
              <button
                type="button"
                onClick={() => setDashboardModalOpen(false)}
                className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-gray-100"
                aria-label={t('dashboardCloseFullscreen')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4">
            <div ref={modalDashboardRef}>
              <div className="mb-3">
                <div className="text-base font-semibold text-gray-900 dark:text-gray-50">
                  {payload.title}
                </div>
                {payload.description && (
                  <div className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
                    {payload.description}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-12 gap-3">
                {cells.map((cell, i) => (
                  <div
                    key={`modal-${i}`}
                    className="col-span-12 min-h-[160px] rounded-md border border-gray-100 bg-gray-50/60 p-3 dark:border-gray-800 dark:bg-gray-950/40"
                    style={{
                      gridColumn: `span ${cell.span ?? 6} / span ${cell.span ?? 6}`,
                    }}
                  >
                    <CellBody
                      cell={cell}
                      chartHeight={CHART_HEIGHT_EXPANDED}
                      showChartToolbar={false}
                      expandLabel={t('dashboardExpandChart')}
                      downloadLabel={t('dashboardDownloadChart')}
                      barSortGroupAria={t('dashboardBarSortGroupAria')}
                      barSortDescendingLabel={t('dashboardBarSortDescending')}
                      barSortAscendingLabel={t('dashboardBarSortAscending')}
                    />
                  </div>
                ))}
              </div>
              {payload.footer_note && (
                <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  {payload.footer_note}
                </div>
              )}
            </div>
          </div>
        </ModalContent>
      </Modal>

      <Modal
        open={singleChartIndex !== null && singleCell != null && singleCell.kind !== 'stat'}
        onClose={() => setSingleChartIndex(null)}
        className="max-h-[96vh] w-full max-w-[min(96vw,1100px)] overflow-hidden"
      >
        <ModalContent className="flex max-h-[90vh] flex-col overflow-hidden p-0">
          {singleCell && singleCell.kind !== 'stat' && (
            <>
              <div
                className="flex items-center justify-between gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-700"
                data-html2canvas-ignore
              >
                <div className="min-w-0 text-sm font-semibold text-gray-900 dark:text-gray-50">
                  {singleCell.title}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="!px-2"
                    disabled={downloadBusy}
                    onClick={handleDownloadSingleModal}
                    aria-label={t('dashboardDownloadChart')}
                    title={t('dashboardDownloadChart')}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <button
                    type="button"
                    onClick={() => setSingleChartIndex(null)}
                    className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-gray-100"
                    aria-label={t('dashboardCloseFullscreen')}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-auto p-4">
                <div
                  ref={singleChartRef}
                  className="rounded-md border border-gray-100 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-gray-950/40"
                >
                  <CellBody
                    cell={singleCell}
                    chartHeight={480}
                    showChartToolbar={false}
                    expandLabel={t('dashboardExpandChart')}
                    downloadLabel={t('dashboardDownloadChart')}
                    barSortGroupAria={t('dashboardBarSortGroupAria')}
                    barSortDescendingLabel={t('dashboardBarSortDescending')}
                    barSortAscendingLabel={t('dashboardBarSortAscending')}
                  />
                </div>
              </div>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}

export default CanvasDashboard;
