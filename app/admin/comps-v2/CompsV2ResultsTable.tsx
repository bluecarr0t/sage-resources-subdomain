'use client';

import { candidateTotalUnitsOrSites } from '@/lib/comps-v2/candidate-total-units';
import type { CompsV2Candidate } from '@/lib/comps-v2/types';
import type { QualityTier } from '@/lib/comps-v2/types';
import {
  formatLocationTableCell,
  formatOccupancyTableCell,
  formatTierCell,
  type CompsV2ResultsSortColumn,
} from '@/app/admin/comps-v2/comps-v2-result-helpers';

type TCompsV2 = (key: string, values?: Record<string, string | number>) => string;

interface CompsV2ResultsTableProps {
  t: TCompsV2;
  rows: CompsV2Candidate[];
  selected: Set<string>;
  toggleSelect: (id: string) => void;
  resultsSort: { col: CompsV2ResultsSortColumn | null; asc: boolean };
  onResultsSortHeaderClick: (col: CompsV2ResultsSortColumn) => void;
  tierLabels: Record<QualityTier, string>;
  summaryCurrency: Intl.NumberFormat;
  sourceLabel: (table: string) => string;
}

export default function CompsV2ResultsTable({
  t,
  rows,
  selected,
  toggleSelect,
  resultsSort,
  onResultsSortHeaderClick,
  tierLabels,
  summaryCurrency,
  sourceLabel,
}: CompsV2ResultsTableProps) {
  return (
    <table className="min-w-full text-sm">
      <thead>
        <tr className="text-left border-b dark:border-gray-700">
          <th className="py-2 pr-2 w-10" aria-label={t('selectForDeep')} />
          <th
            scope="col"
            className="py-2 pr-2"
            aria-sort={
              resultsSort.col === 'property'
                ? resultsSort.asc
                  ? 'ascending'
                  : 'descending'
                : 'none'
            }
          >
            <button
              type="button"
              onClick={() => onResultsSortHeaderClick('property')}
              className="inline-flex items-center gap-1 font-medium text-gray-900 dark:text-gray-100 hover:text-[#4a624a] dark:hover:text-green-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4a624a]/50 rounded px-0.5 -mx-0.5 text-left"
              aria-label={
                resultsSort.col === 'property'
                  ? resultsSort.asc
                    ? t('tableSortedAscending', { column: t('colProperty') })
                    : t('tableSortedDescending', { column: t('colProperty') })
                  : t('tableSortByColumn', { column: t('colProperty') })
              }
            >
              {t('colProperty')}
              {resultsSort.col === 'property' ? (
                <span className="tabular-nums text-gray-500 dark:text-gray-400" aria-hidden>
                  {resultsSort.asc ? '↑' : '↓'}
                </span>
              ) : null}
            </button>
          </th>
          <th
            scope="col"
            className="py-2 pr-2 max-w-[16rem]"
            aria-sort={
              resultsSort.col === 'location'
                ? resultsSort.asc
                  ? 'ascending'
                  : 'descending'
                : 'none'
            }
          >
            <button
              type="button"
              title={t('colLocationHint')}
              onClick={() => onResultsSortHeaderClick('location')}
              className="inline-flex items-center gap-1 font-medium text-gray-900 dark:text-gray-100 hover:text-[#4a624a] dark:hover:text-green-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4a624a]/50 rounded px-0.5 -mx-0.5 text-left"
              aria-label={
                resultsSort.col === 'location'
                  ? resultsSort.asc
                    ? t('tableSortedAscending', { column: t('colLocation') })
                    : t('tableSortedDescending', { column: t('colLocation') })
                  : t('tableSortByColumn', { column: t('colLocation') })
              }
            >
              {t('colLocation')}
              {resultsSort.col === 'location' ? (
                <span className="tabular-nums text-gray-500 dark:text-gray-400" aria-hidden>
                  {resultsSort.asc ? '↑' : '↓'}
                </span>
              ) : null}
            </button>
          </th>
          <th
            scope="col"
            className="py-2 pr-2"
            aria-sort={
              resultsSort.col === 'source'
                ? resultsSort.asc
                  ? 'ascending'
                  : 'descending'
                : 'none'
            }
          >
            <button
              type="button"
              onClick={() => onResultsSortHeaderClick('source')}
              className="inline-flex items-center gap-1 font-medium text-gray-900 dark:text-gray-100 hover:text-[#4a624a] dark:hover:text-green-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4a624a]/50 rounded px-0.5 -mx-0.5 text-left"
              aria-label={
                resultsSort.col === 'source'
                  ? resultsSort.asc
                    ? t('tableSortedAscending', { column: t('colSource') })
                    : t('tableSortedDescending', { column: t('colSource') })
                  : t('tableSortByColumn', { column: t('colSource') })
              }
            >
              {t('colSource')}
              {resultsSort.col === 'source' ? (
                <span className="tabular-nums text-gray-500 dark:text-gray-400" aria-hidden>
                  {resultsSort.asc ? '↑' : '↓'}
                </span>
              ) : null}
            </button>
          </th>
          <th
            scope="col"
            className="py-2 pr-2"
            aria-sort={
              resultsSort.col === 'mi' ? (resultsSort.asc ? 'ascending' : 'descending') : 'none'
            }
          >
            <button
              type="button"
              title={t('colMiHint')}
              onClick={() => onResultsSortHeaderClick('mi')}
              className="inline-flex items-center gap-1 font-medium text-gray-900 dark:text-gray-100 hover:text-[#4a624a] dark:hover:text-green-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4a624a]/50 rounded px-0.5 -mx-0.5 text-left"
              aria-label={
                resultsSort.col === 'mi'
                  ? resultsSort.asc
                    ? t('tableSortedAscending', { column: t('colMi') })
                    : t('tableSortedDescending', { column: t('colMi') })
                  : t('tableSortByColumn', { column: t('colMi') })
              }
            >
              {t('colMi')}
              {resultsSort.col === 'mi' ? (
                <span className="tabular-nums text-gray-500 dark:text-gray-400" aria-hidden>
                  {resultsSort.asc ? '↑' : '↓'}
                </span>
              ) : null}
            </button>
          </th>
          <th
            scope="col"
            className="py-2 pr-2"
            aria-sort={
              resultsSort.col === 'adr' ? (resultsSort.asc ? 'ascending' : 'descending') : 'none'
            }
          >
            <button
              type="button"
              onClick={() => onResultsSortHeaderClick('adr')}
              className="inline-flex items-center gap-1 font-medium text-gray-900 dark:text-gray-100 hover:text-[#4a624a] dark:hover:text-green-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4a624a]/50 rounded px-0.5 -mx-0.5 text-left"
              aria-label={
                resultsSort.col === 'adr'
                  ? resultsSort.asc
                    ? t('tableSortedAscending', { column: t('colAdr') })
                    : t('tableSortedDescending', { column: t('colAdr') })
                  : t('tableSortByColumn', { column: t('colAdr') })
              }
            >
              {t('colAdr')}
              {resultsSort.col === 'adr' ? (
                <span className="tabular-nums text-gray-500 dark:text-gray-400" aria-hidden>
                  {resultsSort.asc ? '↑' : '↓'}
                </span>
              ) : null}
            </button>
          </th>
          <th
            scope="col"
            className="py-2 pr-2"
            aria-sort={
              resultsSort.col === 'occupancy'
                ? resultsSort.asc
                  ? 'ascending'
                  : 'descending'
                : 'none'
            }
          >
            <button
              type="button"
              title={t('colOccupancyHint')}
              onClick={() => onResultsSortHeaderClick('occupancy')}
              className="inline-flex items-center gap-1 font-medium text-gray-900 dark:text-gray-100 hover:text-[#4a624a] dark:hover:text-green-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4a624a]/50 rounded px-0.5 -mx-0.5 text-left"
              aria-label={
                resultsSort.col === 'occupancy'
                  ? resultsSort.asc
                    ? t('tableSortedAscending', { column: t('colOccupancy') })
                    : t('tableSortedDescending', { column: t('colOccupancy') })
                  : t('tableSortByColumn', { column: t('colOccupancy') })
              }
            >
              {t('colOccupancy')}
              {resultsSort.col === 'occupancy' ? (
                <span className="tabular-nums text-gray-500 dark:text-gray-400" aria-hidden>
                  {resultsSort.asc ? '↑' : '↓'}
                </span>
              ) : null}
            </button>
          </th>
          <th
            scope="col"
            className="py-2 pr-2"
            aria-sort={
              resultsSort.col === 'units'
                ? resultsSort.asc
                  ? 'ascending'
                  : 'descending'
                : 'none'
            }
          >
            <button
              type="button"
              onClick={() => onResultsSortHeaderClick('units')}
              className="inline-flex items-center gap-1 font-medium text-gray-900 dark:text-gray-100 hover:text-[#4a624a] dark:hover:text-green-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4a624a]/50 rounded px-0.5 -mx-0.5 text-left"
              aria-label={
                resultsSort.col === 'units'
                  ? resultsSort.asc
                    ? t('tableSortedAscending', { column: t('colTotalUnitsSites') })
                    : t('tableSortedDescending', { column: t('colTotalUnitsSites') })
                  : t('tableSortByColumn', { column: t('colTotalUnitsSites') })
              }
            >
              {t('colTotalUnitsSites')}
              {resultsSort.col === 'units' ? (
                <span className="tabular-nums text-gray-500 dark:text-gray-400" aria-hidden>
                  {resultsSort.asc ? '↑' : '↓'}
                </span>
              ) : null}
            </button>
          </th>
          <th
            scope="col"
            className="py-2 pr-2"
            aria-sort={
              resultsSort.col === 'tier'
                ? resultsSort.asc
                  ? 'ascending'
                  : 'descending'
                : 'none'
            }
          >
            <button
              type="button"
              onClick={() => onResultsSortHeaderClick('tier')}
              className="inline-flex items-center gap-1 font-medium text-gray-900 dark:text-gray-100 hover:text-[#4a624a] dark:hover:text-green-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4a624a]/50 rounded px-0.5 -mx-0.5 text-left"
              aria-label={
                resultsSort.col === 'tier'
                  ? resultsSort.asc
                    ? t('tableSortedAscending', { column: t('colTier') })
                    : t('tableSortedDescending', { column: t('colTier') })
                  : t('tableSortByColumn', { column: t('colTier') })
              }
            >
              {t('colTier')}
              {resultsSort.col === 'tier' ? (
                <span className="tabular-nums text-gray-500 dark:text-gray-400" aria-hidden>
                  {resultsSort.asc ? '↑' : '↓'}
                </span>
              ) : null}
            </button>
          </th>
          <th
            scope="col"
            className="py-2 pr-2"
            aria-sort={
              resultsSort.col === 'website'
                ? resultsSort.asc
                  ? 'ascending'
                  : 'descending'
                : 'none'
            }
          >
            <button
              type="button"
              onClick={() => onResultsSortHeaderClick('website')}
              className="inline-flex items-center gap-1 font-medium text-gray-900 dark:text-gray-100 hover:text-[#4a624a] dark:hover:text-green-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4a624a]/50 rounded px-0.5 -mx-0.5 text-left"
              aria-label={
                resultsSort.col === 'website'
                  ? resultsSort.asc
                    ? t('tableSortedAscending', { column: t('colWebsite') })
                    : t('tableSortedDescending', { column: t('colWebsite') })
                  : t('tableSortByColumn', { column: t('colWebsite') })
              }
            >
              {t('colWebsite')}
              {resultsSort.col === 'website' ? (
                <span className="tabular-nums text-gray-500 dark:text-gray-400" aria-hidden>
                  {resultsSort.asc ? '↑' : '↓'}
                </span>
              ) : null}
            </button>
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((c) => {
          const totalUnits = candidateTotalUnitsOrSites(c);
          return (
            <tr key={c.stable_id} className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-2 pr-2">
                <input
                  type="checkbox"
                  checked={selected.has(c.stable_id)}
                  onChange={() => toggleSelect(c.stable_id)}
                  disabled={!selected.has(c.stable_id) && selected.size >= 5}
                  className="h-5 w-5 shrink-0 rounded border-gray-300 accent-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-50 dark:border-gray-600"
                />
              </td>
              <td className="py-2 pr-2 font-medium">{c.property_name}</td>
              <td className="py-2 pr-2 text-gray-600 dark:text-gray-400 max-w-[16rem]">
                {(() => {
                  const primary = formatLocationTableCell(c);
                  const det = c.location_detail?.trim() ?? '';
                  const primaryLine = primary !== '—' ? primary : det || '—';
                  const showSub =
                    det && primary !== '—' && det.toLowerCase() !== primary.toLowerCase();
                  return (
                    <div className="leading-snug">
                      <div>{primaryLine}</div>
                      {showSub ? (
                        <div
                          className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2"
                          title={det}
                        >
                          {det}
                        </div>
                      ) : null}
                    </div>
                  );
                })()}
              </td>
              <td className="py-2 pr-2 text-gray-600 dark:text-gray-400">
                {sourceLabel(c.source_table)}
              </td>
              <td
                className="py-2 pr-2 tabular-nums"
                title={
                  c.distance_miles != null && Number.isFinite(c.distance_miles)
                    ? undefined
                    : t('colMiUnknown')
                }
              >
                {c.distance_miles != null && Number.isFinite(c.distance_miles)
                  ? c.distance_miles
                  : '—'}
              </td>
              <td className="py-2 pr-2 tabular-nums">
                {c.avg_retail_daily_rate != null && Number.isFinite(c.avg_retail_daily_rate)
                  ? summaryCurrency.format(Math.round(c.avg_retail_daily_rate))
                  : '—'}
              </td>
              <td
                className="py-2 pr-2 tabular-nums text-gray-700 dark:text-gray-300"
                title={
                  c.market_occupancy_rate != null && Number.isFinite(c.market_occupancy_rate)
                    ? undefined
                    : t('colOccupancyUnknown')
                }
              >
                {formatOccupancyTableCell(c.market_occupancy_rate)}
              </td>
              <td className="py-2 pr-2 tabular-nums">{totalUnits != null ? totalUnits : '—'}</td>
              <td className="py-2 pr-2">{formatTierCell(c.adr_quality_tier, tierLabels)}</td>
              <td className="py-2 pr-2">
                {c.url ? (
                  <a
                    href={c.url}
                    className="text-blue-600 dark:text-blue-400 underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t('openWebsite')}
                  </a>
                ) : (
                  '—'
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
