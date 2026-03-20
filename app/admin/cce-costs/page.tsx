'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button, Card } from '@/components/ui';
import { Calculator, ChevronLeft, ChevronRight, RefreshCw, Search, X } from 'lucide-react';

interface CceCostRow {
  id: string;
  building_class: string | null;
  quality_type: string | null;
  exterior_walls: string | null;
  interior_finish: string | null;
  lighting_plumbing: string | null;
  heat: string | null;
  cost_sq_m: number | null;
  cost_cu_ft: number | null;
  cost_sq_ft: number | null;
  source_page: number | null;
  cce_occupancies: {
    occupancy_code: number;
    occupancy_name: string;
  } | null;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

function formatCost(val: number | null): string {
  if (val === null) return '-';
  return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const BUILDING_CLASSES = ['A-B', 'C', 'D', 'DPOLE', 'SSLANT WALL', 'S'];
const QUALITY_TYPES = ['Excellent', 'Very Good', 'Good', 'Average', 'Fair', 'Low cost'];

export default function CceCostsPage() {
  const t = useTranslations('admin.cceCosts');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<CceCostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '');
  const [buildingClass, setBuildingClass] = useState(() => searchParams.get('building_class') ?? '');
  const [qualityType, setQualityType] = useState(() => searchParams.get('quality_type') ?? '');
  const [minCost, setMinCost] = useState(() => searchParams.get('min_cost') ?? '');
  const [maxCost, setMaxCost] = useState(() => searchParams.get('max_cost') ?? '');
  const [page, setPage] = useState(() => Math.max(1, parseInt(searchParams.get('page') ?? '1', 10)));
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 50,
    total: 0,
    total_pages: 0,
  });

  const debouncedSearch = useDebounce(search, 300);
  const isDebouncing = search !== debouncedSearch;

  // Sync URL -> state on mount / navigation
  useEffect(() => {
    const q = searchParams.get('search') ?? '';
    const bc = searchParams.get('building_class') ?? '';
    const qt = searchParams.get('quality_type') ?? '';
    const min = searchParams.get('min_cost') ?? '';
    const max = searchParams.get('max_cost') ?? '';
    const p = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    setSearch(q);
    setBuildingClass(bc);
    setQualityType(qt);
    setMinCost(min);
    setMaxCost(max);
    setPage(p);
  }, [searchParams]);

  // Sync state -> URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (buildingClass) params.set('building_class', buildingClass);
    if (qualityType) params.set('quality_type', qualityType);
    if (minCost) params.set('min_cost', minCost);
    if (maxCost) params.set('max_cost', maxCost);
    if (page > 1) params.set('page', String(page));
    const next = params.toString();
    const current = searchParams.toString();
    if (next !== current) {
      router.replace(next ? `/admin/cce-costs?${next}` : '/admin/cce-costs', { scroll: false });
    }
  }, [debouncedSearch, buildingClass, qualityType, minCost, maxCost, page, router, searchParams]);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (buildingClass) params.set('building_class', buildingClass);
      if (qualityType) params.set('quality_type', qualityType);
      if (minCost) params.set('min_cost', minCost);
      if (maxCost) params.set('max_cost', maxCost);
      params.set('page', String(page));
      params.set('per_page', '50');
      const res = await fetch(`/api/admin/cce-costs?${params}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load CCE costs');
      }
      setRows(data.rows || []);
      setPagination(data.pagination || { page: 1, per_page: 50, total: 0, total_pages: 0 });
      if (data.message) {
        setError(data.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load CCE costs');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, buildingClass, qualityType, minCost, maxCost, page]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const resetPageOnFilter = () => setPage(1);

  const hasFilters = search || buildingClass || qualityType || minCost || maxCost;

  return (
    <main className="pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Calculator className="w-10 h-10 text-sage-600" />
              {t('title')}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t('subtitle')}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={loadRows} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 text-sm">
            {error}
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-0 max-w-md">
              <label htmlFor="cce-search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('filters.search')}
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="cce-search"
                  type="text"
                  placeholder={t('searchPlaceholder')}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    resetPageOnFilter();
                  }}
                  className={`w-full pl-10 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sage-500 ${search || isDebouncing || loading ? 'pr-24' : 'pr-4'}`}
                />
                {(isDebouncing || loading) && (
                  <span className="absolute right-10 top-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400 pointer-events-none">
                    {loading ? 'Loading...' : 'Searching...'}
                  </span>
                )}
                {search ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      resetPageOnFilter();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-700"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : null}
              </div>
            </div>
            <div className="w-full sm:w-36">
              <label htmlFor="cce-building-class" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('filters.buildingClass')}
              </label>
              <select
                id="cce-building-class"
                value={buildingClass}
                onChange={(e) => {
                  setBuildingClass(e.target.value);
                  resetPageOnFilter();
                }}
                className="w-full py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="">{t('filters.all')}</option>
                {BUILDING_CLASSES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-full sm:w-36">
              <label htmlFor="cce-quality-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('filters.qualityType')}
              </label>
              <select
                id="cce-quality-type"
                value={qualityType}
                onChange={(e) => {
                  setQualityType(e.target.value);
                  resetPageOnFilter();
                }}
                className="w-full py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="">{t('filters.all')}</option>
                {QUALITY_TYPES.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-full sm:w-28">
              <label htmlFor="cce-min-cost" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('filters.minCost')}
              </label>
              <input
                id="cce-min-cost"
                type="number"
                min={0}
                step={1}
                placeholder="Min"
                value={minCost}
                onChange={(e) => {
                  setMinCost(e.target.value);
                  resetPageOnFilter();
                }}
                className="w-full py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="w-full sm:w-28">
              <label htmlFor="cce-max-cost" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('filters.maxCost')}
              </label>
              <input
                id="cce-max-cost"
                type="number"
                min={0}
                step={1}
                placeholder="Max"
                value={maxCost}
                onChange={(e) => {
                  setMaxCost(e.target.value);
                  resetPageOnFilter();
                }}
                className="w-full py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
          {hasFilters && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setBuildingClass('');
                  setQualityType('');
                  setMinCost('');
                  setMaxCost('');
                  setPage(1);
                }}
                className="text-sm font-medium text-sage-600 dark:text-sage-400 hover:text-sage-800 dark:hover:text-sage-200 hover:underline"
              >
                {t('filters.clearAll')}
              </button>
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {loading ? (
                <span className="text-gray-500 dark:text-gray-400">{t('table.loading')}</span>
              ) : (
                t('table.resultsCount', { count: pagination.total })
              )}
            </p>
          </div>
        </Card>

        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500">{t('table.loading')}</div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              {t('table.noData')}{' '}
              <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                {t('table.migrationHint')}
              </code>
              {' — '}
              <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                {t('table.extractionHint')}
              </code>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        {t('table.occupancy')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        {t('table.class')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        {t('table.type')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase max-w-[200px]">
                        {t('table.exteriorWalls')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase max-w-[200px]">
                        {t('table.interior')}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        {t('table.sqFtCost')}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        {t('table.cuFtCost')}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        {t('table.sqMCost')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {rows.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {row.cce_occupancies
                            ? `${row.cce_occupancies.occupancy_name} (${row.cce_occupancies.occupancy_code})`
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {row.building_class || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {row.quality_type || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-[200px] truncate" title={row.exterior_walls || ''}>
                          {row.exterior_walls || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-[200px] truncate" title={row.interior_finish || ''}>
                          {row.interior_finish || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 text-right">
                          {formatCost(row.cost_sq_ft)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 text-right">
                          {formatCost(row.cost_cu_ft)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 text-right">
                          {formatCost(row.cost_sq_m)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pagination.total_pages > 1 && (
                <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Page {pagination.page} of {pagination.total_pages} ({pagination.total} total)
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))}
                      disabled={page >= pagination.total_pages}
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
