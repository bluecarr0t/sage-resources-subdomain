'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card } from '@/components/ui';
import { Search, ChevronLeft, ChevronRight, Star, MapPin, ChevronUp, ChevronDown } from 'lucide-react';
import { qualityScoreToDisplay } from '@/lib/feasibility-utils';

interface ComparableRow {
  id: string;
  comp_name: string;
  overview: string | null;
  amenities: string | null;
  amenity_keywords: string[] | null;
  distance_miles: number | null;
  total_sites: number | null;
  quality_score: number | null;
  property_type: string | null;
  created_at: string;
  reports:
    | {
        id: string;
        property_name: string;
        location: string | null;
        state: string | null;
        city: string | null;
        study_id: string | null;
        created_at: string;
      }
    | { _grouped: true; studies: Array<{ study_id: string | null; location: string | null; state: string | null }> };
  _studyIds?: string[];
  _studyCount?: number;
  feasibility_comp_units: Array<{
    id: string;
    unit_type: string;
    unit_category: string | null;
    num_units: number | null;
    low_adr: number | null;
    peak_adr: number | null;
    avg_annual_adr: number | null;
    low_occupancy: number | null;
    peak_occupancy: number | null;
    quality_score: number | null;
  }>;
}

const PER_PAGE = 50;

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

function formatCurrency(val: number | null): string {
  if (val === null) return '-';
  return `$${Math.round(val).toLocaleString()}`;
}

function formatPercent(val: number | null): string {
  if (val === null) return '-';
  return `${Math.round(val * 100)}%`;
}

/** Handles both 0-1 (decimal) and 0-100 (percent) occupancy formats */
function formatOccupancyPercent(val: number | null): string {
  if (val === null) return '-';
  return val > 1 ? `${Math.round(val)}%` : `${Math.round(val * 100)}%`;
}

/** Derive state from location string (e.g. "Sulphur Springs, TX" -> "TX") when state column is empty */
function deriveState(location: string | null, state: string | null): string | null {
  if (state) return state;
  if (!location) return null;
  const match = location.match(/,\s*([A-Z]{2})(?:\s|$)/i);
  return match ? match[1].toUpperCase() : null;
}

function getPrimaryReport(comp: ComparableRow) {
  const r = comp.reports;
  if (r && '_grouped' in r && r._grouped && r.studies?.length) {
    return r.studies[0];
  }
  return r as { study_id: string | null; location: string | null; state: string | null } | undefined;
}

function getStudyDisplay(comp: ComparableRow): { text: string; firstStudyId: string | null } {
  const studyIds = comp._studyIds?.filter(Boolean) || [];
  const firstStudyId = studyIds[0] || (comp.reports && !('_grouped' in comp.reports) ? (comp.reports as { study_id?: string }).study_id : null) || null;
  if ((comp._studyCount ?? 0) > 1 && studyIds.length > 1) {
    return { text: `In ${comp._studyCount} jobs: ${studyIds.join(' · ')}`, firstStudyId };
  }
  return { text: firstStudyId || '-', firstStudyId };
}

function QualityStars({ score }: { score: number | null }) {
  const display = qualityScoreToDisplay(score);
  if (display === null) return <span className="text-gray-400 text-xs">-</span>;
  return (
    <span className="flex items-center gap-0.5" title={`${display}/5`}>
      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{display.toFixed(1)}</span>
    </span>
  );
}

const SORTABLE_COLUMNS: Array<{ key: string; label: string; align: 'left' | 'center' | 'right' }> = [
  { key: 'comp_name', label: 'Property', align: 'left' },
  { key: 'study', label: 'Job Number', align: 'left' },
  { key: 'state', label: 'State', align: 'left' },
  { key: 'total_sites', label: 'Sites', align: 'center' },
  { key: 'quality_score', label: 'Quality', align: 'center' },
  { key: 'unit_types', label: 'Unit Types', align: 'center' },
  { key: 'adr', label: 'ADR Range', align: 'right' },
  { key: 'occupancy', label: 'Occupancy', align: 'right' },
];

function SortableTh({
  column,
  currentSortBy,
  sortDir,
  onSort,
}: {
  column: (typeof SORTABLE_COLUMNS)[number];
  currentSortBy: string;
  sortDir: string;
  onSort: (key: string) => void;
}) {
  const sortKeys: Record<string, string | null> = {
    comp_name: 'comp_name',
    study: 'created_at',
    state: 'state',
    total_sites: 'total_sites',
    quality_score: 'quality_score',
    unit_types: null,
    adr: null,
    occupancy: null,
  };
  const sortKey = sortKeys[column.key];
  const isSortable = sortKey !== null;
  const isActive = isSortable && currentSortBy === sortKey;
  const alignClass =
    column.align === 'right'
      ? 'text-right'
      : column.align === 'center'
        ? 'text-center'
        : 'text-left';

  return (
    <th
      className={`px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 ${alignClass} ${isSortable ? 'cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-700/50' : ''} transition-colors`}
      onClick={() => isSortable && sortKey && onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {column.label}
        {isSortable && (isActive ? (
          sortDir === 'asc' ? (
            <ChevronUp className="w-4 h-4 text-sage-600" />
          ) : (
            <ChevronDown className="w-4 h-4 text-sage-600" />
          )
        ) : (
          <span className="w-4 h-4 inline-block opacity-30">
            <ChevronUp className="w-4 h-4" />
          </span>
        ))}
      </span>
    </th>
  );
}

export default function ComparablesPage() {
  const router = useRouter();
  const [comparables, setComparables] = useState<ComparableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');

  const debouncedSearch = useDebounce(search, 300);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    params.set('sort_by', sortBy);
    params.set('sort_dir', sortDir);
    params.set('page', String(page));
    params.set('per_page', String(PER_PAGE));
    return params.toString();
  }, [debouncedSearch, sortBy, sortDir, page]);

  const loadComparables = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/comparables?${queryString}`);
      const data = await res.json();
      if (data.success) {
        setComparables(data.comparables || []);
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.total_pages);
        setError(null);
      } else {
        setComparables([]);
        setError(data.message || 'Failed to load comparables');
      }
    } catch (err) {
      setComparables([]);
      setError(err instanceof Error ? err.message : 'Failed to load comparables');
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    loadComparables();
  }, [loadComparables]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, sortBy, sortDir]);

  return (
    <main className="pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Comparables
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Browse and search comparable properties across all feasibility studies
              {total > 0 && <span className="font-medium"> ({total.toLocaleString()} total)</span>}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push('/admin/comparables/analytics')}
            >
              Analytics
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by property, city, state, country, unit type, or keywords (e.g. spa, hot tub)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sage-500"
            />
          </div>
        </Card>

        {/* Results table */}
        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-sage-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Loading comparables...</p>
            </div>
          ) : error || comparables.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400 mb-4">No Results</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
              >
                Clear
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                      {SORTABLE_COLUMNS.map((col) => (
                        <SortableTh
                          key={col.key}
                          column={col}
                          currentSortBy={sortBy}
                          sortDir={sortDir}
                          onSort={(key) => {
                            const defaultDir = ['quality_score', 'total_sites', 'created_at'].includes(key) ? 'desc' : 'asc';
                            if (sortBy === key) {
                              setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                            } else {
                              setSortBy(key);
                              setSortDir(defaultDir);
                            }
                          }}
                        />
                      ))}
                      <th className="text-center px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                        Keywords
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {comparables.map((comp) => {
                      const units = comp.feasibility_comp_units || [];
                      const minAdr = units.reduce(
                        (min, u) => (u.low_adr !== null && (min === null || u.low_adr < min) ? u.low_adr : min),
                        null as number | null
                      );
                      const maxAdr = units.reduce(
                        (max, u) => (u.peak_adr !== null && (max === null || u.peak_adr > max) ? u.peak_adr : max),
                        null as number | null
                      );
                      const avgLowOcc = units.filter((u) => u.low_occupancy !== null);
                      const avgPeakOcc = units.filter((u) => u.peak_occupancy !== null);
                      const primaryReport = getPrimaryReport(comp);
                      const studyDisplay = getStudyDisplay(comp);

                      return (
                        <tr
                          key={comp.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer transition-colors"
                          onClick={() => {
                            if (studyDisplay.firstStudyId) {
                              router.push(`/admin/comparables/${studyDisplay.firstStudyId}`);
                            }
                          }}
                        >
                          <td className="px-4 py-3">
                            <p
                              className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[200px]"
                              title={comp.comp_name}
                            >
                              {comp.comp_name}
                            </p>
                            {comp.overview && (
                              <p
                                className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]"
                                title={comp.overview}
                              >
                                {comp.overview}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                              <MapPin className="w-3 h-3 shrink-0" />
                              <span title={studyDisplay.text}>{studyDisplay.text}</span>
                            </div>
                            {primaryReport?.location && (comp._studyCount ?? 0) <= 1 && (
                              <p className="text-xs text-gray-400 dark:text-gray-500">
                                {primaryReport.location}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs">
                            {(comp._studyCount ?? 0) > 1
                              ? 'Multiple'
                              : deriveState(primaryReport?.location ?? null, primaryReport?.state ?? null) || '-'}
                          </td>
                          <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">
                            {comp.total_sites ?? '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <QualityStars score={comp.quality_score} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex flex-wrap gap-1 justify-center">
                              {units.length > 0 ? (
                                [...new Set(units.map((u) => u.unit_category || 'other'))].slice(0, 3).map((cat) => (
                                  <span
                                    key={cat}
                                    className="inline-block px-1.5 py-0.5 text-[10px] font-medium bg-sage-50 dark:bg-sage-900/30 text-sage-700 dark:text-sage-300 rounded"
                                  >
                                    {cat.replace(/_/g, ' ')}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 text-xs whitespace-nowrap">
                            {minAdr !== null || maxAdr !== null ? (
                              <>{formatCurrency(minAdr)} - {formatCurrency(maxAdr)}</>
                            ) : '-'}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 text-xs whitespace-nowrap">
                            {avgLowOcc.length > 0 || avgPeakOcc.length > 0 ? (
                              <>
                                {formatOccupancyPercent(avgLowOcc.length > 0 ? avgLowOcc.reduce((s, u) => s + (u.low_occupancy || 0), 0) / avgLowOcc.length : null)}
                                {' - '}
                                {formatOccupancyPercent(avgPeakOcc.length > 0 ? avgPeakOcc.reduce((s, u) => s + (u.peak_occupancy || 0), 0) / avgPeakOcc.length : null)}
                              </>
                            ) : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1 justify-center max-w-[120px]">
                              {comp.amenity_keywords?.slice(0, 3).map((kw) => (
                                <span
                                  key={kw}
                                  className="inline-block px-1.5 py-0.5 text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                                >
                                  {kw}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {total > 0 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Page {page} of {totalPages} ({Math.min(PER_PAGE, Math.max(0, total - (page - 1) * PER_PAGE))} out of {total.toLocaleString()})
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </main>
  );
}
