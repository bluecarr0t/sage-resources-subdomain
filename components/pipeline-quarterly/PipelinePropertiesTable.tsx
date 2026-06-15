'use client';

import { Fragment, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ExternalLink } from 'lucide-react';
import { GlampingServiceTierPill } from '@/components/glamping-industry/GlampingServiceTierPill';
import {
  renderPipelineEmptyCell,
} from '@/components/pipeline-quarterly/PipelineTableEmptyValue';
import type { PipelineQuarterlyPropertyRow } from '@/lib/pipeline-quarterly/fetch-status-breakdown';
import { buildPropertyGoogleMapsUrl } from '@/lib/property-map-embed-url';
import {
  formatWebsiteHostname,
  normalizePropertyWebsiteUrl,
  sanitizeHttpUrl,
} from '@/lib/property-website-url';
import { formatUsPhoneNumber } from '@/lib/format-us-phone-number';
import { formatPlannedOpenDateLabel, parsePlannedOpenDateField } from '@/lib/glamping-planned-open';
import { formatPipelinePropertyAcres } from '@/lib/pipeline-quarterly/property-acres';
import { paginatePipelinePropertyRows } from '@/lib/pipeline-quarterly/paginate-properties';
import {
  nextPipelinePropertySortState,
  PIPELINE_PROPERTY_INITIAL_SORT,
  sortPipelineQuarterlyProperties,
  type PipelinePropertySortState,
  type PipelinePropertySortColumn,
  type SortDirection,
} from '@/lib/pipeline-quarterly/sort-properties';

type SortableHeaderColumn = {
  key: PipelinePropertySortColumn;
  label: string;
  align?: 'left' | 'right';
  className?: string;
};

const UNITS_COLUMN_CLASS = 'pl-2 pr-5';
const ACRES_COLUMN_CLASS = 'pl-2 pr-6';
const TIER_COLUMN_CLASS = 'pl-4 pr-3';

const SORTABLE_HEADERS: readonly SortableHeaderColumn[] = [
  { key: 'property', label: 'Property', className: 'max-w-0 px-3' },
  { key: 'state', label: 'State', className: 'px-2' },
  { key: 'unitType', label: 'Unit type', className: 'max-w-0 px-2' },
  { key: 'units', label: 'Units', align: 'right', className: UNITS_COLUMN_CLASS },
  { key: 'acres', label: 'Acres', align: 'right', className: ACRES_COLUMN_CLASS },
  { key: 'tier', label: 'Tier', className: TIER_COLUMN_CLASS },
  { key: 'brand', label: 'Brand', className: 'max-w-0 px-2' },
  { key: 'avgRate', label: 'Avg rate', className: 'px-2' },
  { key: 'plannedOpen', label: 'Projected Open Date', className: 'whitespace-nowrap px-2' },
];

const TABLE_COL_WIDTHS_WITH_PLANNED_OPEN = [
  'w-[22%]',
  'w-[7%]',
  'w-[14%]',
  'w-[9%]',
  'w-[9%]',
  'w-[14%]',
  'w-[11%]',
  'w-[14%]',
] as const;

const TABLE_COL_WIDTHS_WITHOUT_PLANNED_OPEN = [
  'w-[21%]',
  'w-[7%]',
  'w-[13%]',
  'w-[9%]',
  'w-[9%]',
  'w-[13%]',
  'w-[14%]',
  'w-[14%]',
] as const;

function SortableHeader({
  column,
  sortColumn,
  sortDirection,
  onSort,
}: {
  column: SortableHeaderColumn;
  sortColumn: PipelinePropertySortColumn;
  sortDirection: SortDirection;
  onSort: (column: PipelinePropertySortColumn) => void;
}) {
  const isActive = sortColumn === column.key;
  const alignClass = column.align === 'right' ? 'text-right' : 'text-left';

  return (
    <th className={`${column.className ?? 'px-2'} py-2.5 font-medium ${alignClass}`}>
      <button
        type="button"
        className={`inline-flex w-full items-center gap-0.5 transition-colors hover:text-neutral-800 ${
          column.align === 'right' ? 'justify-end' : 'justify-start'
        } ${isActive ? 'text-neutral-800' : ''}`}
        onClick={() => onSort(column.key)}
        aria-sort={isActive ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        <span>{column.label}</span>
        {isActive ? (
          sortDirection === 'asc' ? (
            <ChevronUp className="h-3 w-3 shrink-0" aria-hidden />
          ) : (
            <ChevronDown className="h-3 w-3 shrink-0" aria-hidden />
          )
        ) : (
          <span className="inline-flex h-3 w-3 shrink-0 flex-col justify-center opacity-30" aria-hidden>
            <ChevronUp className="h-2 w-2 -mb-0.5" />
            <ChevronDown className="h-2 w-2" />
          </span>
        )}
      </button>
    </th>
  );
}

function renderOptionalText(
  value: string | null | undefined,
  emptyDisplay?: string
): ReactNode {
  const trimmed = value?.trim();
  if (trimmed) return trimmed;
  return renderPipelineEmptyCell(emptyDisplay);
}

function formatInt(n: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);
}

function formatUsd(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

function formatLocation(row: PipelineQuarterlyPropertyRow): string | null {
  const parts = [row.city, row.stateAbbr ?? row.state].filter(Boolean);
  if (row.address?.trim()) parts.unshift(row.address.trim());
  return parts.length > 0 ? parts.join(' · ') : null;
}

function buildLocationMapsQuery(row: PipelineQuarterlyPropertyRow): string | null {
  const parts: string[] = [];
  if (row.propertyName?.trim()) parts.push(row.propertyName.trim());
  if (row.address?.trim()) parts.push(row.address.trim());
  if (row.city?.trim()) parts.push(row.city.trim());
  const state = row.stateAbbr ?? row.state;
  if (state?.trim()) parts.push(state.trim());
  if (row.country?.trim()) parts.push(row.country.trim());
  return parts.length > 0 ? parts.join(', ') : null;
}

function DetailField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</p>
      <div className="mt-1 text-sm text-neutral-800">{children}</div>
    </div>
  );
}

function ExternalLinkField({
  label,
  href,
  display,
  title,
}: {
  label: string;
  href: string;
  display: string;
  title?: string;
}) {
  return (
    <DetailField label={label}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={title}
        className="inline-flex max-w-full items-center gap-1.5 text-sage-700 underline-offset-2 transition-colors hover:text-sage-900 hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="truncate">{display}</span>
      </a>
    </DetailField>
  );
}

function PipelinePropertyExpandedDetails({
  row,
  emptyDisplay,
  hidePlannedOpenDate = false,
}: {
  row: PipelineQuarterlyPropertyRow;
  emptyDisplay: string;
  hidePlannedOpenDate?: boolean;
}) {
  const websiteHref = normalizePropertyWebsiteUrl(row.websiteUrl);
  const newsHref = sanitizeHttpUrl(row.newsArticleUrl);
  const location = formatLocation(row);
  const mapsQuery = buildLocationMapsQuery(row);
  const mapsHref = mapsQuery
    ? buildPropertyGoogleMapsUrl({ placeQuery: mapsQuery })
    : null;

  return (
    <div className="space-y-4 py-1 pl-6 pr-2">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DetailField label="Status">
          {renderOptionalText(row.isOpenLabel, emptyDisplay)}
        </DetailField>
        <DetailField label="Property type">
          {renderOptionalText(row.propertyType, emptyDisplay)}
        </DetailField>
        <DetailField label="Address">
          {renderOptionalText(row.address, emptyDisplay)}
        </DetailField>
        <DetailField label="City">
          {renderOptionalText(row.city, emptyDisplay)}
        </DetailField>
        {mapsHref && location ? (
          <ExternalLinkField
            label="Location"
            href={mapsHref}
            display="View on Google Maps"
            title={location}
          />
        ) : (
          <DetailField label="Location">
            {location ? location : renderPipelineEmptyCell(emptyDisplay)}
          </DetailField>
        )}
        <DetailField label="Phone">
          {formatUsPhoneNumber(row.phoneNumber) ?? renderPipelineEmptyCell(emptyDisplay)}
        </DetailField>
        {hidePlannedOpenDate ? null : (
          <DetailField label="Projected Open Date">
            {parsePlannedOpenDateField(row.plannedOpenDate)
              ? formatPlannedOpenDateLabel(row.plannedOpenDate)
              : renderPipelineEmptyCell(emptyDisplay)}
          </DetailField>
        )}
        {websiteHref ? (
          <ExternalLinkField
            label="Website"
            href={websiteHref}
            display={formatWebsiteHostname(websiteHref)}
          />
        ) : (
          <DetailField label="Website">{renderPipelineEmptyCell(emptyDisplay)}</DetailField>
        )}
        {newsHref ? (
          <ExternalLinkField
            label="News article"
            href={newsHref}
            display={formatWebsiteHostname(newsHref)}
          />
        ) : null}
      </div>

      {row.description?.trim() ? (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-neutral-500">Description</p>
          <p className="mt-2 max-w-3xl whitespace-pre-line text-sm font-light leading-relaxed text-neutral-700">
            {row.description.trim()}
          </p>
        </div>
      ) : null}
    </div>
  );
}

type Props = {
  rows: readonly PipelineQuarterlyPropertyRow[];
  hidePlannedOpenColumn?: boolean;
  rateColumnLabel?: string;
  initialSort?: PipelinePropertySortState;
  pageSize?: number;
  emptyCellDisplay?: string;
};

export function PipelinePropertiesTable({
  rows,
  hidePlannedOpenColumn = false,
  rateColumnLabel = 'Avg rate',
  initialSort = PIPELINE_PROPERTY_INITIAL_SORT,
  pageSize,
  emptyCellDisplay = '—',
}: Props) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set());
  const [sortState, setSortState] = useState(initialSort);
  const [page, setPage] = useState(1);

  const visibleHeaders = useMemo(() => {
    const headers = SORTABLE_HEADERS.filter((column) => {
      if (column.key === 'plannedOpen') return !hidePlannedOpenColumn;
      if (column.key === 'brand') return hidePlannedOpenColumn;
      return true;
    });
    return headers.map((column) => {
      if (column.key === 'avgRate') {
        return {
          ...column,
          label: rateColumnLabel,
        };
      }
      return column;
    });
  }, [hidePlannedOpenColumn, rateColumnLabel]);

  const columnWidths = hidePlannedOpenColumn
    ? TABLE_COL_WIDTHS_WITHOUT_PLANNED_OPEN
    : TABLE_COL_WIDTHS_WITH_PLANNED_OPEN;

  const sortedRows = useMemo(
    () => sortPipelineQuarterlyProperties(rows, sortState.column, sortState.direction),
    [rows, sortState.column, sortState.direction]
  );

  const pagination = useMemo(() => {
    if (!pageSize) {
      return null;
    }

    return paginatePipelinePropertyRows(sortedRows, page, pageSize);
  }, [page, pageSize, sortedRows]);

  const displayRows = pagination?.rows ?? sortedRows;
  const paginationMeta = pagination?.meta ?? null;

  useEffect(() => {
    setPage(1);
    setExpandedKeys(new Set());
  }, [rows, sortState.column, sortState.direction]);

  useEffect(() => {
    if (!paginationMeta) return;
    if (page > paginationMeta.totalPages) {
      setPage(paginationMeta.totalPages);
    }
  }, [page, paginationMeta]);

  const handleSort = useCallback((column: PipelinePropertySortColumn) => {
    setSortState((current) => nextPipelinePropertySortState(current, column));
  }, []);

  const rowKey = useCallback(
    (row: PipelineQuarterlyPropertyRow) => `${row.id}-${row.propertyName}`,
    []
  );

  const toggleExpanded = useCallback((key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  if (rows.length === 0) {
    return <p className="text-sm text-neutral-500">No properties in this status.</p>;
  }

  return (
    <div>
      <div className="overflow-x-auto border border-sage-200/80 md:overflow-x-visible">
        <table className="w-full table-fixed border-collapse text-left text-sm">
        <colgroup>
          {columnWidths.map((widthClass, index) => (
            <col key={index} className={widthClass} />
          ))}
        </colgroup>
        <thead>
          <tr className="border-b border-sage-200 bg-white/80 text-[10px] uppercase tracking-wider text-neutral-500">
            {visibleHeaders.map((column) => (
              <SortableHeader
                key={column.key}
                column={column}
                sortColumn={sortState.column}
                sortDirection={sortState.direction}
                onSort={handleSort}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row) => {
            const key = rowKey(row);
            const isExpanded = expandedKeys.has(key);

            return (
              <Fragment key={key}>
                <tr
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  className={`cursor-pointer border-b border-sage-100/80 font-light text-neutral-800 transition-colors hover:bg-sage-50/60 ${
                    isExpanded ? 'bg-sage-50/40' : ''
                  }`}
                  onClick={() => toggleExpanded(key)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleExpanded(key);
                    }
                  }}
                >
                  <td className="max-w-0 px-3 py-2.5 font-normal text-neutral-900">
                    <div className="flex min-w-0 items-start gap-1.5">
                      <span
                        className="mt-0.5 shrink-0 text-neutral-400"
                        aria-hidden
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </span>
                      <span className="min-w-0 truncate" title={row.propertyName}>
                        {row.propertyName}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-2.5 tabular-nums">
                    {renderOptionalText(row.stateAbbr ?? row.state, emptyCellDisplay)}
                  </td>
                  <td className="max-w-0 truncate px-2 py-2.5" title={row.unitType ?? undefined}>
                    {renderOptionalText(row.unitType, emptyCellDisplay)}
                  </td>
                  <td className={`${UNITS_COLUMN_CLASS} py-2.5 text-right tabular-nums`}>
                    {formatInt(row.units)}
                  </td>
                  <td className={`${ACRES_COLUMN_CLASS} py-2.5 text-right tabular-nums`}>
                    {row.acres == null
                      ? renderPipelineEmptyCell(emptyCellDisplay)
                      : formatPipelinePropertyAcres(row.acres)}
                  </td>
                  <td className={`${TIER_COLUMN_CLASS} py-2.5`}>
                    <GlampingServiceTierPill tier={row.serviceTier} emptyDisplay={emptyCellDisplay} />
                  </td>
                  {hidePlannedOpenColumn ? (
                    <td
                      className="max-w-0 truncate px-2 py-2.5"
                      title={row.brandName ?? undefined}
                    >
                      {renderOptionalText(row.brandName, emptyCellDisplay)}
                    </td>
                  ) : null}
                  <td className="px-2 py-2.5 tabular-nums">
                    {row.avgRetailDailyRate == null
                      ? renderPipelineEmptyCell(emptyCellDisplay)
                      : formatUsd(row.avgRetailDailyRate)}
                  </td>
                  {hidePlannedOpenColumn ? null : (
                    <td className="whitespace-nowrap px-2 py-2.5 tabular-nums">
                      {parsePlannedOpenDateField(row.plannedOpenDate) ? (
                        <span className="text-[12px]">
                          {formatPlannedOpenDateLabel(row.plannedOpenDate)}
                        </span>
                      ) : (
                        renderPipelineEmptyCell(emptyCellDisplay)
                      )}
                    </td>
                  )}
                </tr>
                {isExpanded ? (
                  <tr className="border-b border-sage-100/80 bg-sage-50/30 last:border-b-0">
                    <td colSpan={visibleHeaders.length} className="px-3 py-3 align-top">
                      <PipelinePropertyExpandedDetails
                        row={row}
                        emptyDisplay={emptyCellDisplay}
                        hidePlannedOpenDate={hidePlannedOpenColumn}
                      />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      </div>

      {paginationMeta && paginationMeta.totalItems > paginationMeta.pageSize ? (
        <nav
          className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500"
          aria-label="Property list pagination"
        >
          <p className="tabular-nums">
            Showing {formatInt(paginationMeta.startIndex + 1)}–
            {formatInt(paginationMeta.endIndex)} of {formatInt(paginationMeta.totalItems)}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-1 transition-colors hover:text-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={paginationMeta.page <= 1}
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
              Previous
            </button>
            <span className="tabular-nums">
              Page {paginationMeta.page} of {paginationMeta.totalPages}
            </span>
            <button
              type="button"
              className="inline-flex items-center gap-1 transition-colors hover:text-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() =>
                setPage((current) => Math.min(paginationMeta.totalPages, current + 1))
              }
              disabled={paginationMeta.page >= paginationMeta.totalPages}
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </nav>
      ) : null}
    </div>
  );
}
