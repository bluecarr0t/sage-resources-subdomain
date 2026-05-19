'use client';

import { useState, useEffect, useCallback, useMemo, useRef, Fragment, Suspense } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button, Card } from '@/components/ui';
import MultiSelect from '@/components/MultiSelect';
import SearchableMultiSelect from '@/components/SearchableMultiSelect';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  FileText,
  Download,
  X,
  GitCompare,
  ExternalLink,
  List,
  Map as MapIcon,
} from 'lucide-react';
import {
  STATE_ABBREVIATIONS,
  formatStateAbbreviation,
  normalizeStateToCanonicalAbbrev,
} from '@/components/map/utils/stateUtils';
import { normalizeGlampingUnitTypeForDisplay } from '@/lib/glamping-unit-type-normalize';
import {
  UNIFIED_SOURCES,
  isSageOnlyUnifiedSourceFilter,
  shouldShowUnifiedCompsOccupancy,
  unifiedSourceBadgeClass,
  unifiedSourceLabel,
  type UnifiedCompRow,
  type UnifiedSource,
} from '@/lib/comps-unified/build-row';
import { adminPageDescription, adminPageHeadingMargin, adminPageTitle } from '@/lib/admin-ui';
import { GLAMPING_IS_OPEN_VALUES } from '@/lib/glamping-is-open';
import { ADMIN_COMPS_COHORT_PROPERTY_TYPE } from '@/lib/comps-unified/admin-comps-cohort';
import { GLAMPING_PROPERTY_TYPE_ALLOWED } from '@/lib/glamping-property-types';
import { US_STATES } from '@/lib/us-states';
import {
  buildCountryFilterOptions,
  DEFAULT_SELECTED_COUNTRIES,
  formatCountryFilterLabel,
  parseCountryFilterFromUrl,
  writeCountryFilterToParams,
} from '@/lib/comps-unified/country-filter';

/** State filter on /admin/glamping-properties is US-only (excludes Canadian provinces, etc.). */
const US_STATE_FILTER_CODES = new Set<string>([...US_STATES, 'DC']);

/** Display label for Status filter (`is_open` DB value stays `Yes`). */
function formatIsOpenFilterLabel(value: string): string {
  return value === 'Yes' ? 'Open' : value;
}

const PER_PAGE = 50;

/** Default Source filter on /admin/glamping-properties (Sage glamping database). */
const DEFAULT_SELECTED_SOURCES = ['all_glamping_properties'] as const;

/** Server-enforced cohort; kept in the URL for clarity. */
const DEFAULT_SELECTED_PROPERTY_TYPES = [ADMIN_COMPS_COHORT_PROPERTY_TYPE] as const;

function parseSourceFilterFromUrl(sourceParam: string | null): string[] {
  if (sourceParam === 'all') return [];
  if (sourceParam) {
    return sourceParam.split(',').map((x) => x.trim()).filter(Boolean);
  }
  return [...DEFAULT_SELECTED_SOURCES];
}

function writeSourceFilterToParams(params: URLSearchParams, sources: string[]): void {
  if (sources.length === 0) {
    params.set('source', 'all');
  } else {
    params.set('source', sources.join(','));
  }
}

type CompsViewMode = 'list' | 'map';

const CompsMapView = dynamic(() => import('./CompsMapView'), {
  ssr: false,
  loading: () => (
    <div className="p-12 text-center">
      <div className="animate-spin w-8 h-8 border-2 border-sage-500 border-t-transparent rounded-full mx-auto mb-4" />
      <p className="text-gray-500 dark:text-gray-400">Loading map...</p>
    </div>
  ),
});

/** Collapse `AL`, `Alabama`, `ALABAMA` in the URL to a single canonical code per region. */
function parsePropertyTypeParamFromUrl(param: string | null): string[] {
  const raw = param ?? '';
  if (!raw) return [...DEFAULT_SELECTED_PROPERTY_TYPES];
  const parsed = raw
    .split(',')
    .map((x) => x.trim())
    .filter((x) => x && GLAMPING_PROPERTY_TYPE_ALLOWED.has(x));
  return parsed.length > 0 ? parsed : [...DEFAULT_SELECTED_PROPERTY_TYPES];
}

function writePropertyTypeFilterToParams(params: URLSearchParams, propertyTypes: string[]): void {
  const values =
    propertyTypes.length > 0 ? propertyTypes : [...DEFAULT_SELECTED_PROPERTY_TYPES];
  params.set('property_type', values.join(','));
}

function parseStateParamFromUrl(stateParam: string | null): string[] {
  const s = stateParam ?? '';
  if (!s) return [];
  return s
    .split(',')
    .map((x) => {
      const t = x.trim();
      if (!t) return '';
      return normalizeStateToCanonicalAbbrev(t) ?? t.toUpperCase();
    })
    .filter(Boolean);
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function formatCurrency(val: number | null): string {
  if (val === null || val === undefined) return '-';
  return `$${Math.round(val).toLocaleString()}`;
}

/** Handles both 0-1 (decimal) and 0-100 (percent) occupancy formats */
function formatOccupancyPercent(val: number | null): string {
  if (val === null || val === undefined) return '-';
  return val > 1 ? `${Math.round(val)}%` : `${Math.round(val * 100)}%`;
}

function formatKeywordLabel(raw: string): string {
  const t = raw.trim();
  if (!t) return raw;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function formatUnitTypeDisplay(raw: string | null | undefined): string {
  if (raw == null || !String(raw).trim()) return '-';
  return normalizeGlampingUnitTypeForDisplay(raw) ?? '-';
}

/** Safe http(s) href for a property website; rejects javascript: and invalid URLs. */
function normalizePropertyWebsiteUrl(raw: string | null | undefined): string | null {
  const t = raw?.trim();
  if (!t) return null;
  try {
    const withProto = /^https?:\/\//i.test(t) ? t : `https://${t.replace(/^\/+/, '')}`;
    const u = new URL(withProto);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.href;
  } catch {
    return null;
  }
}

function formatWebsiteHostname(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./i, '');
  } catch {
    return href;
  }
}

function SourceBadge({ source }: { source: string }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded ${unifiedSourceBadgeClass(source)}`}
    >
      {unifiedSourceLabel(source)}
    </span>
  );
}

const BASE_TABLE_COLUMNS: Array<{
  key: string;
  label: string;
  align: 'left' | 'center' | 'right';
  sortKey: string | null;
}> = [
  { key: 'property_name', label: 'Property', align: 'left', sortKey: 'property_name' },
  { key: 'source', label: 'Source', align: 'left', sortKey: null },
  { key: 'state', label: 'State', align: 'left', sortKey: 'state' },
  { key: 'total_sites', label: 'Sites', align: 'center', sortKey: 'total_sites' },
  { key: 'unit_type', label: 'Unit Type', align: 'center', sortKey: null },
  { key: 'adr', label: 'ARDR Range', align: 'right', sortKey: 'low_adr' },
  { key: 'occupancy', label: 'Occupancy', align: 'right', sortKey: null },
];

function SortableTh({
  column,
  currentSortBy,
  sortDir,
  onSort,
}: {
  column: (typeof BASE_TABLE_COLUMNS)[number];
  currentSortBy: string;
  sortDir: string;
  onSort: (key: string) => void;
}) {
  const isSortable = column.sortKey !== null;
  const isActive = isSortable && currentSortBy === column.sortKey;
  const alignClass =
    column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left';

  return (
    <th
      className={`px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 ${alignClass} ${isSortable ? 'cursor-pointer select-none hover:bg-neutral-100/80 dark:hover:bg-neutral-800/55/50' : ''} transition-colors`}
      onClick={() => isSortable && column.sortKey && onSort(column.sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {column.label}
        {isSortable &&
          (isActive ? (
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

function ComparablesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('admin.comps');

  const [rows, setRows] = useState<UnifiedCompRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(() => Math.max(1, parseInt(searchParams.get('page') ?? '1', 10)));
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalSiteUnits, setTotalSiteUnits] = useState(0);
  const [totalProperties, setTotalProperties] = useState<number | null>(null);

  const [search, setSearch] = useState(() => searchParams.get('search') ?? '');
  const [selectedSources, setSelectedSources] = useState<string[]>(() =>
    parseSourceFilterFromUrl(searchParams.get('source'))
  );
  const [selectedCountries, setSelectedCountries] = useState<string[]>(() =>
    parseCountryFilterFromUrl(searchParams.get('country'))
  );
  const [selectedStates, setSelectedStates] = useState<string[]>(() =>
    parseStateParamFromUrl(searchParams.get('state'))
  );
  const [selectedUnitCategories, setSelectedUnitCategories] = useState<string[]>(() => {
    const u = searchParams.get('unit_category') ?? '';
    return u ? u.split(',').map((x) => x.trim()).filter(Boolean) : [];
  });
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>(() => {
    const k = searchParams.get('keywords') ?? '';
    return k ? k.split(',').map((x) => x.trim()).filter(Boolean) : [];
  });
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<string[]>(() =>
    parsePropertyTypeParamFromUrl(searchParams.get('property_type'))
  );
  const [selectedOpenStatuses, setSelectedOpenStatuses] = useState<string[]>(() => {
    const io = searchParams.get('is_open') ?? '';
    const allowed = new Set<string>(GLAMPING_IS_OPEN_VALUES);
    return io
      ? io
          .split(',')
          .map((x) => x.trim())
          .filter((x) => x && allowed.has(x))
      : [];
  });
  const [unitCategoryOptions, setUnitCategoryOptions] = useState<{ value: string; label: string }[]>([]);
  const [countryOptions, setCountryOptions] = useState<{ value: string; label: string }[]>([]);
  const [stateOptions, setStateOptions] = useState<{ value: string; label: string }[]>([]);
  const [keywordOptions, setKeywordOptions] = useState<{ value: string; label: string }[]>([]);
  const [sortBy, setSortBy] = useState(() => searchParams.get('sort_by') ?? 'created_at');
  const [sortDir, setSortDir] = useState(() => searchParams.get('sort_dir') ?? 'desc');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [comparePanelOpen, setComparePanelOpen] = useState(false);
  const [compareModeActive, setCompareModeActive] = useState(false);
  const [isFuzzyResults, setIsFuzzyResults] = useState(false);
  const [viewMode, setViewMode] = useState<CompsViewMode>('list');

  const sourceOptions = useMemo(
    () => UNIFIED_SOURCES.map((s) => ({ value: s, label: unifiedSourceLabel(s) })),
    []
  );

  const showSageOnlyFilters = isSageOnlyUnifiedSourceFilter(selectedSources);
  const showOccupancyColumn = shouldShowUnifiedCompsOccupancy(selectedSources);
  const tableColumns = useMemo(
    () =>
      showOccupancyColumn
        ? BASE_TABLE_COLUMNS
        : BASE_TABLE_COLUMNS.filter((col) => col.key !== 'occupancy'),
    [showOccupancyColumn]
  );

  const statusOptions = useMemo(
    () => GLAMPING_IS_OPEN_VALUES.map((v) => ({ value: v, label: formatIsOpenFilterLabel(v) })),
    []
  );

  const clearSageOnlyFilterSelections = useCallback(() => {
    setSelectedOpenStatuses([]);
  }, []);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 4) {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clearSelected = useCallback(() => {
    setSelectedIds(new Set());
    setComparePanelOpen(false);
  }, []);

  const exitCompareMode = useCallback(() => {
    setCompareModeActive(false);
    setSelectedIds(new Set());
    setComparePanelOpen(false);
  }, []);

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    fetch('/api/admin/comps/unified/facets')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setUnitCategoryOptions(
            (data.unit_categories || [])
              .map((c: string) => {
                const words = c.replace(/_/g, ' ').split(/\s+/);
                const label = words
                  .map((w) => (w.toLowerCase() === 'rv' ? 'RV' : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
                  .join(' ');
                return { value: c, label };
              })
              .sort((a: { value: string; label: string }, b: { value: string; label: string }) =>
                a.label.localeCompare(b.label)
              )
          );
          setCountryOptions(buildCountryFilterOptions(data.countries || []));
          setStateOptions(
            (data.states || [])
              .map((s: string) => {
                const abbr = normalizeStateToCanonicalAbbrev(s) ?? s.toUpperCase();
                return { raw: s, abbr };
              })
              .filter(({ abbr }) => US_STATE_FILTER_CODES.has(abbr))
              .map(({ raw, abbr }) => {
                const fullName = STATE_ABBREVIATIONS[abbr] ?? raw;
                return {
                  value: abbr,
                  label: fullName !== abbr ? `${fullName} (${abbr})` : abbr,
                };
              })
              .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))
          );
          setKeywordOptions(
            (data.keywords || []).map((k: string) => ({ value: k, label: formatKeywordLabel(k) }))
          );
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!showSageOnlyFilters && selectedOpenStatuses.length > 0) {
      clearSageOnlyFilterSelections();
    }
  }, [showSageOnlyFilters, selectedOpenStatuses.length, clearSageOnlyFilterSelections]);

  // Sync URL -> state when searchParams changes
  useEffect(() => {
    setSearch(searchParams.get('search') ?? '');
    setSelectedSources(parseSourceFilterFromUrl(searchParams.get('source')));
    setSelectedCountries(parseCountryFilterFromUrl(searchParams.get('country')));
    setSelectedStates(parseStateParamFromUrl(searchParams.get('state')));
    const uc = searchParams.get('unit_category') ?? '';
    setSelectedUnitCategories(uc ? uc.split(',').map((x) => x.trim()).filter(Boolean) : []);
    const kw = searchParams.get('keywords') ?? '';
    setSelectedKeywords(kw ? kw.split(',').map((x) => x.trim()).filter(Boolean) : []);
    setSelectedPropertyTypes(parsePropertyTypeParamFromUrl(searchParams.get('property_type')));
    const io = searchParams.get('is_open') ?? '';
    const allowedOpen = new Set<string>(GLAMPING_IS_OPEN_VALUES);
    setSelectedOpenStatuses(
      io
        ? io
            .split(',')
            .map((x) => x.trim())
            .filter((x) => x && allowedOpen.has(x))
        : []
    );
    setSortBy(searchParams.get('sort_by') ?? 'created_at');
    setSortDir(searchParams.get('sort_dir') ?? 'desc');
    setPage(Math.max(1, parseInt(searchParams.get('page') ?? '1', 10)));
  }, [searchParams]);

  // Sync state -> URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    writeSourceFilterToParams(params, selectedSources);
    writeCountryFilterToParams(params, selectedCountries);
    if (selectedStates.length > 0) params.set('state', selectedStates.join(','));
    if (selectedUnitCategories.length > 0) params.set('unit_category', selectedUnitCategories.join(','));
    if (selectedKeywords.length > 0) params.set('keywords', selectedKeywords.join(','));
    writePropertyTypeFilterToParams(params, selectedPropertyTypes);
    if (showSageOnlyFilters && selectedOpenStatuses.length > 0) {
      params.set('is_open', selectedOpenStatuses.join(','));
    }
    params.set('sort_by', sortBy);
    params.set('sort_dir', sortDir);
    if (page > 1) params.set('page', String(page));
    for (const key of searchParams.keys()) {
      if (key.startsWith('map_radius_')) {
        const v = searchParams.get(key);
        if (v != null && v !== '') params.set(key, v);
      }
    }
    const next = params.toString();
    const current = searchParams.toString();
    if (next !== current) {
      router.replace(`/admin/glamping-properties${next ? `?${next}` : ''}`, { scroll: false });
    }
  }, [
    search,
    selectedSources,
    selectedCountries,
    selectedStates,
    selectedUnitCategories,
    selectedKeywords,
    showSageOnlyFilters,
    selectedPropertyTypes,
    selectedOpenStatuses,
    sortBy,
    sortDir,
    page,
    router,
    searchParams,
  ]);

  const isDebouncing = search !== debouncedSearch;

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (selectedSources.length > 0) params.set('source', selectedSources.join(','));
    if (selectedCountries.length > 0) params.set('country', selectedCountries.join(','));
    if (selectedStates.length > 0) params.set('state', selectedStates.join(','));
    if (selectedUnitCategories.length > 0) params.set('unit_category', selectedUnitCategories.join(','));
    if (selectedKeywords.length > 0) params.set('keywords', selectedKeywords.join(','));
    writePropertyTypeFilterToParams(params, selectedPropertyTypes);
    if (showSageOnlyFilters && selectedOpenStatuses.length > 0) {
      params.set('is_open', selectedOpenStatuses.join(','));
    }
    params.set('sort_by', sortBy);
    params.set('sort_dir', sortDir);
    params.set('page', String(page));
    params.set('per_page', String(PER_PAGE));
    return params.toString();
  }, [
    debouncedSearch,
    selectedSources,
    selectedCountries,
    selectedStates,
    selectedUnitCategories,
    selectedKeywords,
    showSageOnlyFilters,
    selectedPropertyTypes,
    selectedOpenStatuses,
    sortBy,
    sortDir,
    page,
  ]);

  // Filter-only query string for the map: pagination/sort are irrelevant
  // since the geo endpoint returns every geocoded match (up to its cap).
  const mapQueryString = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (selectedSources.length > 0) params.set('source', selectedSources.join(','));
    if (selectedCountries.length > 0) params.set('country', selectedCountries.join(','));
    if (selectedStates.length > 0) params.set('state', selectedStates.join(','));
    if (selectedUnitCategories.length > 0) params.set('unit_category', selectedUnitCategories.join(','));
    if (selectedKeywords.length > 0) params.set('keywords', selectedKeywords.join(','));
    writePropertyTypeFilterToParams(params, selectedPropertyTypes);
    if (showSageOnlyFilters && selectedOpenStatuses.length > 0) {
      params.set('is_open', selectedOpenStatuses.join(','));
    }
    return params.toString();
  }, [
    debouncedSearch,
    selectedSources,
    selectedCountries,
    selectedStates,
    selectedUnitCategories,
    selectedKeywords,
    showSageOnlyFilters,
    selectedPropertyTypes,
    selectedOpenStatuses,
  ]);

  const hasCompletedInitialLoad = useRef(false);
  const prevSearchSortForPageReset = useRef<{ debouncedSearch: string; sortBy: string; sortDir: string } | null>(null);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/comps/unified?${queryString}`);
      const data = await res.json();
      if (data.success) {
        setRows(data.rows || []);
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.total_pages);
        setTotalSiteUnits(
          typeof data.pagination?.total_site_units === 'number'
            ? data.pagination.total_site_units
            : data.pagination.total
        );
        setTotalProperties(
          typeof data.pagination?.total_properties === 'number'
            ? data.pagination.total_properties
            : data.pagination.total
        );
        setIsFuzzyResults(data.pagination?.fuzzy === true);
        setError(null);
      } else {
        setRows([]);
        setIsFuzzyResults(false);
        setTotalProperties(null);
        setTotalSiteUnits(0);
        setError(data.message || 'Failed to load comps');
      }
    } catch (err) {
      setRows([]);
      setIsFuzzyResults(false);
      setTotalProperties(null);
      setTotalSiteUnits(0);
      setError(err instanceof Error ? err.message : 'Failed to load comps');
    } finally {
      setLoading(false);
      hasCompletedInitialLoad.current = true;
    }
  }, [queryString]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    if (!hasCompletedInitialLoad.current) return;
    const prev = prevSearchSortForPageReset.current;
    prevSearchSortForPageReset.current = { debouncedSearch, sortBy, sortDir };
    if (prev === null) return;
    if (prev.debouncedSearch !== debouncedSearch || prev.sortBy !== sortBy || prev.sortDir !== sortDir) {
      setPage(1);
    }
  }, [debouncedSearch, sortBy, sortDir]);

  useEffect(() => {
    setPage(1);
  }, [
    selectedSources,
    selectedCountries,
    selectedStates,
    selectedUnitCategories,
    selectedKeywords,
    selectedPropertyTypes,
    selectedOpenStatuses,
  ]);

  useEffect(() => {
    setExpandedIds(new Set());
    setSelectedIds(new Set());
    setCompareModeActive(false);
  }, [
    page,
    debouncedSearch,
    selectedSources,
    selectedCountries,
    selectedStates,
    selectedUnitCategories,
    selectedKeywords,
    selectedPropertyTypes,
    selectedOpenStatuses,
    sortBy,
    sortDir,
  ]);

  const selectedRows = useMemo(() => rows.filter((r) => selectedIds.has(r.id)), [rows, selectedIds]);

  const handleComparePanelClose = useCallback(() => setComparePanelOpen(false), []);

  useEffect(() => {
    if (comparePanelOpen) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') handleComparePanelClose();
      };
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = '';
      };
    }
  }, [comparePanelOpen, handleComparePanelClose]);

  const handleExportExcel = useCallback(async () => {
    const { default: XLSX } = await import('xlsx');
    const header = [
      'Property',
      'Source',
      'State',
      'Sites',
      'Unit Type',
      'ARDR Range',
      ...(showOccupancyColumn ? (['Occupancy'] as const) : []),
      'Study ID',
      'City',
      'Country',
    ];
    const rowsOut: (string | number)[][] = [header];
    for (const r of rows) {
      rowsOut.push([
        r.property_name,
        unifiedSourceLabel(r.source),
        formatStateAbbreviation(r.state),
        r.total_sites ?? '',
        r.unit_type != null && String(r.unit_type).trim()
          ? (normalizeGlampingUnitTypeForDisplay(r.unit_type) ?? '')
          : '',
        r.low_adr !== null || r.peak_adr !== null
          ? `${formatCurrency(r.low_adr)} - ${formatCurrency(r.peak_adr)}`
          : '',
        ...(showOccupancyColumn
          ? [
              r.low_occupancy !== null || r.peak_occupancy !== null
                ? `${formatOccupancyPercent(r.low_occupancy)} - ${formatOccupancyPercent(r.peak_occupancy)}`
                : '',
            ]
          : []),
        r.study_id ?? '',
        r.city ?? '',
        r.country ?? '',
      ]);
    }
    const ws = XLSX.utils.aoa_to_sheet(rowsOut);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Comps');
    XLSX.writeFile(wb, `comps-export-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }, [rows, showOccupancyColumn]);

  return (
    <main className={`px-4 sm:px-6 lg:px-8 ${compareModeActive && selectedIds.size >= 2 ? 'pb-24' : 'pb-16'}`}>
      <div className="max-w-7xl mx-auto">
        <div className={`${adminPageHeadingMargin} flex items-center justify-between`}>
          <div>
            <h1 className={`${adminPageTitle} mb-1`}>Properties</h1>
            <p className={adminPageDescription}>{t('pageSubtitle')}</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => (compareModeActive ? exitCompareMode() : setCompareModeActive(true))}
              disabled={rows.length === 0}
              title={compareModeActive ? 'Cancel compare mode' : 'Select properties to compare side by side'}
              className={compareModeActive ? 'ring-2 ring-sage-500' : ''}
            >
              <GitCompare className="w-4 h-4 mr-1.5" />
              {compareModeActive ? 'Cancel Compare' : 'Compare'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportExcel}
              disabled={rows.length === 0}
              title="Export current view to Excel"
            >
              <Download className="w-4 h-4 mr-1.5" />
              Export Excel
            </Button>
            <Button variant="secondary" size="sm" onClick={() => router.push('/glamping-market-overview')}>
              Analytics
            </Button>
          </div>
        </div>

        <Card className="mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-0 max-w-md">
              <label htmlFor="comps-search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="comps-search"
                  type="text"
                  placeholder="Property, city, state, unit type, keywords..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={`w-full pl-10 py-2 text-sm border border-neutral-300/80 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sage-500 ${search || isDebouncing || loading ? 'pr-24' : 'pr-4'}`}
                />
                {(isDebouncing || loading) && (
                  <span className="absolute right-10 top-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400 pointer-events-none">
                    {loading ? 'Loading...' : 'Searching...'}
                  </span>
                )}
                {search ? (
                  <button
                    type="button"
                    onClick={() => { setSearch(''); setPage(1); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : null}
              </div>
            </div>
            <div className="w-full sm:w-48">
              <MultiSelect
                id="source-filter"
                label={t('sourceFilterLabel')}
                options={sourceOptions}
                selectedValues={selectedSources}
                onToggle={(v) =>
                  setSelectedSources((prev) => {
                    const next = prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v];
                    if (!isSageOnlyUnifiedSourceFilter(next)) clearSageOnlyFilterSelections();
                    return next;
                  })
                }
                onClear={() => {
                  setSelectedSources([]);
                  clearSageOnlyFilterSelections();
                }}
                placeholder={t('sourceFilterPlaceholder')}
                allSelectedText={t('sourceFilterAllSelected')}
                activeColor="sage"
              />
            </div>
            {showSageOnlyFilters ? (
              <div className="w-full sm:w-48">
                <MultiSelect
                  id="status-filter"
                  label="Status"
                  options={statusOptions}
                  selectedValues={selectedOpenStatuses}
                  onToggle={(v) =>
                    setSelectedOpenStatuses((prev) =>
                      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
                    )
                  }
                  onClear={() => setSelectedOpenStatuses([])}
                  placeholder="All statuses"
                  allSelectedText="All statuses"
                  activeColor="sage"
                />
              </div>
            ) : null}
            <div className="w-full sm:w-48">
              <MultiSelect
                id="unit-type-filter"
                label="Unit Type"
                options={unitCategoryOptions}
                selectedValues={selectedUnitCategories}
                onToggle={(v) =>
                  setSelectedUnitCategories((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]))
                }
                onClear={() => setSelectedUnitCategories([])}
                placeholder="All unit types"
                allSelectedText="All unit types"
                activeColor="sage"
              />
            </div>
            <div className="w-full sm:w-48">
              <SearchableMultiSelect
                id="country-filter"
                label="Country"
                options={countryOptions}
                selectedValues={selectedCountries}
                onToggle={(v) =>
                  setSelectedCountries((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]))
                }
                placeholder="All countries"
                allSelectedText="All countries"
                searchPlaceholder="Search countries..."
                activeColor="sage"
                maxDropdownHeightPx={520}
              />
            </div>
            <div className="w-full sm:w-48">
              <SearchableMultiSelect
                id="state-filter"
                label="State"
                options={stateOptions}
                selectedValues={selectedStates}
                onToggle={(v) =>
                  setSelectedStates((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]))
                }
                placeholder="All states"
                allSelectedText="All states"
                searchPlaceholder="Search states..."
                activeColor="sage"
                maxDropdownHeightPx={520}
              />
            </div>
            <div className="w-full sm:w-48">
              <SearchableMultiSelect
                id="keywords-filter"
                label="Amenities"
                options={keywordOptions}
                selectedValues={selectedKeywords}
                onToggle={(v) =>
                  setSelectedKeywords((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]))
                }
                placeholder="All amenities"
                allSelectedText="All amenities"
                searchPlaceholder="Search amenities..."
                activeColor="sage"
              />
            </div>
          </div>

          {(search ||
            selectedSources.length > 0 ||
            selectedCountries.length > 0 ||
            selectedStates.length > 0 ||
            selectedUnitCategories.length > 0 ||
            selectedKeywords.length > 0 ||
            selectedPropertyTypes.length > 0 ||
            selectedOpenStatuses.length > 0) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {search && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium bg-sage-100 dark:bg-sage-900/50 text-sage-800 dark:text-sage-200 border border-sage-200 dark:border-sage-700">
                  <span className="truncate max-w-[180px]" title={search}>Search: &quot;{search}&quot;</span>
                  <button
                    type="button"
                    onClick={() => { setSearch(''); setPage(1); }}
                    className="p-0.5 rounded hover:bg-sage-200 dark:hover:bg-sage-700 text-sage-600 dark:text-sage-300"
                    aria-label="Remove search filter"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              )}
              {selectedSources.map((src) => (
                <span
                  key={src}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium bg-sage-100 dark:bg-sage-900/50 text-sage-800 dark:text-sage-200 border border-sage-200 dark:border-sage-700"
                >
                  {t('activeSourceChip', { label: unifiedSourceLabel(src) })}
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedSources((prev) => {
                        const next = prev.filter((x) => x !== src);
                        if (!isSageOnlyUnifiedSourceFilter(next)) clearSageOnlyFilterSelections();
                        return next;
                      })
                    }
                    className="p-0.5 rounded hover:bg-sage-200 dark:hover:bg-sage-700 text-sage-600 dark:text-sage-300"
                    aria-label={`Remove source filter ${src}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
              {selectedCountries.map((co) => {
                const label = countryOptions.find((o) => o.value === co)?.label ?? formatCountryFilterLabel(co);
                return (
                  <span
                    key={co}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium bg-sage-100 dark:bg-sage-900/50 text-sage-800 dark:text-sage-200 border border-sage-200 dark:border-sage-700"
                  >
                    Country: {label}
                    <button
                      type="button"
                      onClick={() => setSelectedCountries((prev) => prev.filter((x) => x !== co))}
                      className="p-0.5 rounded hover:bg-sage-200 dark:hover:bg-sage-700 text-sage-600 dark:text-sage-300"
                      aria-label={`Remove country filter ${label}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                );
              })}
              {selectedStates.map((st) => {
                const label = stateOptions.find((o) => o.value === st)?.label ?? st;
                return (
                  <span
                    key={st}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium bg-sage-100 dark:bg-sage-900/50 text-sage-800 dark:text-sage-200 border border-sage-200 dark:border-sage-700"
                  >
                    State: {label}
                    <button
                      type="button"
                      onClick={() => setSelectedStates((prev) => prev.filter((x) => x !== st))}
                      className="p-0.5 rounded hover:bg-sage-200 dark:hover:bg-sage-700 text-sage-600 dark:text-sage-300"
                      aria-label={`Remove state filter ${label}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                );
              })}
              {selectedUnitCategories.map((cat) => {
                const label = unitCategoryOptions.find((o) => o.value === cat)?.label ?? cat.replace(/_/g, ' ');
                return (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium bg-sage-100 dark:bg-sage-900/50 text-sage-800 dark:text-sage-200 border border-sage-200 dark:border-sage-700"
                  >
                    Unit: {label}
                    <button
                      type="button"
                      onClick={() => setSelectedUnitCategories((prev) => prev.filter((x) => x !== cat))}
                      className="p-0.5 rounded hover:bg-sage-200 dark:hover:bg-sage-700 text-sage-600 dark:text-sage-300"
                      aria-label={`Remove unit filter ${label}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                );
              })}
              {selectedKeywords.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium bg-sage-100 dark:bg-sage-900/50 text-sage-800 dark:text-sage-200 border border-sage-200 dark:border-sage-700"
                >
                  Amenity: {formatKeywordLabel(kw)}
                  <button
                    type="button"
                    onClick={() => setSelectedKeywords((prev) => prev.filter((x) => x !== kw))}
                    className="p-0.5 rounded hover:bg-sage-200 dark:hover:bg-sage-700 text-sage-600 dark:text-sage-300"
                    aria-label={`Remove amenity filter ${kw}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
              {selectedOpenStatuses.map((st) => (
                <span
                  key={st}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium bg-sage-100 dark:bg-sage-900/50 text-sage-800 dark:text-sage-200 border border-sage-200 dark:border-sage-700"
                >
                  Status: {formatIsOpenFilterLabel(st)}
                  <button
                    type="button"
                    onClick={() => setSelectedOpenStatuses((prev) => prev.filter((x) => x !== st))}
                    className="p-0.5 rounded hover:bg-sage-200 dark:hover:bg-sage-700 text-sage-600 dark:text-sage-300"
                    aria-label={`Remove status filter ${st}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSelectedSources([...DEFAULT_SELECTED_SOURCES]);
                  setSelectedCountries([...DEFAULT_SELECTED_COUNTRIES]);
                  setSelectedPropertyTypes([...DEFAULT_SELECTED_PROPERTY_TYPES]);
                  setSelectedStates([]);
                  setSelectedUnitCategories([]);
                  setSelectedKeywords([]);
                  clearSageOnlyFilterSelections();
                  setPage(1);
                }}
                className="text-sm font-medium text-sage-600 dark:text-sage-400 hover:text-sage-800 dark:hover:text-sage-200 hover:underline"
              >
                Clear all
              </button>
            </div>
          )}

          <div className="mt-3 pt-3 border-t border-neutral-200/75 dark:border-neutral-800 flex items-center justify-between gap-3">
            <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {loading ? (
                <span className="text-gray-500 dark:text-gray-400">{t('summaryLoading')}</span>
              ) : (
                <>
                  {totalProperties != null ? (
                    <span className="text-sage-600 dark:text-sage-400">
                      {t('summaryUniqueProperties', { count: totalProperties })}
                    </span>
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400 font-normal">
                      {t('summaryUniquePropertiesPending')}
                    </span>
                  )}
                  <span className="text-gray-500 dark:text-gray-400 font-normal"> · </span>
                  <span className="text-sage-600 dark:text-sage-400">
                    {t('summarySiteUnits', { count: totalSiteUnits })}
                  </span>
                </>
              )}
            </p>
            <div
              role="group"
              aria-label="Toggle between list and map view"
              className="inline-flex rounded-md border border-neutral-200/75 dark:border-neutral-800 overflow-hidden shadow-sm"
            >
              <button
                type="button"
                onClick={() => setViewMode('list')}
                aria-pressed={viewMode === 'list'}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-sage-600 text-white'
                    : 'bg-white dark:bg-neutral-950 text-gray-700 dark:text-gray-300 hover:bg-neutral-50/90 dark:hover:bg-neutral-900/40'
                }`}
              >
                <List className="w-4 h-4" />
                List View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('map')}
                aria-pressed={viewMode === 'map'}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border-l border-neutral-200/75 dark:border-neutral-800 transition-colors ${
                  viewMode === 'map'
                    ? 'bg-sage-600 text-white'
                    : 'bg-white dark:bg-neutral-950 text-gray-700 dark:text-gray-300 hover:bg-neutral-50/90 dark:hover:bg-neutral-900/40'
                }`}
              >
                <MapIcon className="w-4 h-4" />
                Map View
              </button>
            </div>
          </div>
        </Card>

        {compareModeActive && (
          <div className="mb-4 px-4 py-2 bg-sage-50 dark:bg-sage-900/30 border border-sage-200 dark:border-sage-800 rounded-lg text-sm text-sage-800 dark:text-sage-200">
            Select 2–4 properties using the checkboxes, then click <strong>Compare</strong> in the bar below.
          </div>
        )}

        {isFuzzyResults && rows.length > 0 && viewMode === 'list' && (
          <div className="mb-4 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-200">
            No exact matches. Showing similar results.
          </div>
        )}

        {viewMode === 'map' ? (
          <Card className="overflow-hidden" padding="none">
            <CompsMapView queryString={mapQueryString} listTotalProperties={totalProperties} />
          </Card>
        ) : (
        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-sage-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Loading comps...</p>
            </div>
          ) : error || rows.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400 mb-4">{error || 'No Results'}</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setSelectedSources([...DEFAULT_SELECTED_SOURCES]);
                  setSelectedCountries([...DEFAULT_SELECTED_COUNTRIES]);
                  setSelectedPropertyTypes([...DEFAULT_SELECTED_PROPERTY_TYPES]);
                  setSelectedStates([]);
                  setSelectedUnitCategories([]);
                  setSelectedKeywords([]);
                  setPage(1);
                }}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200/75 dark:border-neutral-800 bg-neutral-50/85 dark:bg-neutral-900/40">
                      {compareModeActive && (
                        <th className="w-12 px-3 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Select</th>
                      )}
                      {tableColumns.map((col) => (
                        <SortableTh
                          key={col.key}
                          column={col}
                          currentSortBy={sortBy}
                          sortDir={sortDir}
                          onSort={(key) => {
                            const defaultDir = ['total_sites', 'created_at', 'low_adr'].includes(key) ? 'desc' : 'asc';
                            if (sortBy === key) {
                              setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                            } else {
                              setSortBy(key);
                              setSortDir(defaultDir);
                            }
                          }}
                        />
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {rows.map((r) => {
                      const isExpanded = expandedIds.has(r.id);
                      const websiteHref = normalizePropertyWebsiteUrl(r.website_url);
                      const siteRows = r.site_rows ?? [];
                      const unitTypeTitle =
                        siteRows.length > 0
                          ? siteRows
                              .map((s) => formatUnitTypeDisplay(s.unit_type))
                              .filter((label) => label !== '-')
                              .join(', ')
                          : formatUnitTypeDisplay(r.unit_type);
                      const hasAnyDetail =
                        r.overview ||
                        websiteHref ||
                        siteRows.length > 1 ||
                        r.low_adr !== null ||
                        r.peak_adr !== null ||
                        r.low_occupancy !== null ||
                        r.peak_occupancy !== null;

                      return (
                        <Fragment key={r.id}>
                          <tr
                            role={hasAnyDetail ? 'button' : undefined}
                            tabIndex={hasAnyDetail ? 0 : undefined}
                            aria-expanded={hasAnyDetail ? isExpanded : undefined}
                            className={hasAnyDetail ? 'hover:bg-neutral-50/90 dark:hover:bg-neutral-900/40/30 cursor-pointer transition-colors' : 'transition-colors'}
                            onClick={hasAnyDetail ? () => toggleExpanded(r.id) : undefined}
                            onKeyDown={
                              hasAnyDetail
                                ? (e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      toggleExpanded(r.id);
                                    }
                                  }
                                : undefined
                            }
                          >
                            {compareModeActive && (
                              <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(r.id)}
                                  onChange={() => toggleSelected(r.id)}
                                  disabled={selectedIds.size >= 4 && !selectedIds.has(r.id)}
                                  className="rounded border-neutral-300/80 dark:border-neutral-600 text-sage-600 focus:ring-sage-500 w-4 h-4"
                                  aria-label={`Select ${r.property_name} for comparison`}
                                />
                              </td>
                            )}
                            <td className="px-4 py-3">
                              <div className="flex items-start gap-2">
                                <span className="shrink-0 mt-0.5 text-gray-400 dark:text-gray-500" aria-hidden>
                                  {hasAnyDetail ? (
                                    isExpanded ? (
                                      <ChevronDown className="w-4 h-4" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4" />
                                    )
                                  ) : (
                                    <span className="w-4 h-4 inline-block" />
                                  )}
                                </span>
                                <div className="min-w-0">
                                  <p
                                    className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[220px]"
                                    title={r.property_name}
                                  >
                                    {r.property_name}
                                  </p>
                                  {r.city && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[220px]">
                                      {r.city}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <SourceBadge source={r.source} />
                            </td>
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs">
                              {formatStateAbbreviation(r.state)}
                            </td>
                            <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">
                              {r.total_sites ?? '-'}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {r.unit_type ? (
                                <span
                                  className="inline-block px-1.5 py-0.5 text-[10px] font-medium bg-sage-50 dark:bg-sage-900/30 text-sage-700 dark:text-sage-300 rounded truncate max-w-[140px]"
                                  title={unitTypeTitle}
                                >
                                  {formatUnitTypeDisplay(r.unit_type)}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 text-xs whitespace-nowrap">
                              {r.low_adr !== null || r.peak_adr !== null ? (
                                <>{formatCurrency(r.low_adr)} - {formatCurrency(r.peak_adr)}</>
                              ) : '-'}
                            </td>
                            {showOccupancyColumn && (
                              <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 text-xs whitespace-nowrap">
                                {r.low_occupancy !== null || r.peak_occupancy !== null ? (
                                  <>
                                    {formatOccupancyPercent(r.low_occupancy)} -{' '}
                                    {formatOccupancyPercent(r.peak_occupancy)}
                                  </>
                                ) : (
                                  '-'
                                )}
                              </td>
                            )}
                          </tr>
                          {isExpanded && hasAnyDetail && (
                            <tr key={`${r.id}-expanded`} className="bg-neutral-50/70 dark:bg-neutral-900/30">
                              <td
                                colSpan={compareModeActive ? tableColumns.length + 1 : tableColumns.length}
                                className="px-4 py-3 align-top"
                              >
                                <div className="pl-6 pr-4 pb-2 space-y-2 text-sm">
                                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                                    <div>
                                      <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Avg ADR</p>
                                      <p className="text-gray-800 dark:text-gray-200">{formatCurrency(r.avg_adr)}</p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Units</p>
                                      <p className="text-gray-800 dark:text-gray-200">{r.num_units ?? '-'}</p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Property Type</p>
                                      <p className="text-gray-800 dark:text-gray-200">{r.property_type ?? '-'}</p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Country</p>
                                      <p className="text-gray-800 dark:text-gray-200">{r.country ?? '-'}</p>
                                    </div>
                                    <div className="min-w-0 sm:col-span-2 lg:col-span-1">
                                      <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                        {t('expandedWebsiteLabel')}
                                      </p>
                                      {websiteHref ? (
                                        <a
                                          href={websiteHref}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 text-sage-600 dark:text-sage-400 hover:underline font-medium break-all"
                                          aria-label={t('expandedWebsiteOpenNewTab')}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden />
                                          <span className="truncate">{formatWebsiteHostname(websiteHref)}</span>
                                        </a>
                                      ) : (
                                        <p className="text-gray-800 dark:text-gray-200">-</p>
                                      )}
                                    </div>
                                  </div>
                                  {siteRows.length > 1 && (
                                    <div>
                                      <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                                        Unit types ({siteRows.length})
                                      </p>
                                      <ul className="space-y-1 text-xs text-gray-700 dark:text-gray-300">
                                        {siteRows.map((site) => (
                                          <li key={site.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                            <span className="font-medium">
                                              {formatUnitTypeDisplay(site.unit_type)}
                                            </span>
                                            {site.low_adr !== null || site.peak_adr !== null ? (
                                              <span className="text-gray-500 dark:text-gray-400">
                                                {formatCurrency(site.low_adr)} – {formatCurrency(site.peak_adr)}
                                              </span>
                                            ) : null}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {r.overview && (
                                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-4 whitespace-pre-line">
                                      {r.overview}
                                    </p>
                                  )}
                                  {r.source === 'reports' && r.study_id && (
                                    <Link
                                      href={`/admin/glamping-properties/${r.study_id}`}
                                      className="inline-flex items-center gap-1.5 text-xs font-medium text-sage-600 dark:text-sage-400 hover:underline"
                                    >
                                      <FileText className="w-3.5 h-3.5" />
                                      View report {r.study_id}
                                    </Link>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {total > 0 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200/75 dark:border-neutral-800 bg-neutral-50/85 dark:bg-neutral-900/40">
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
        )}

        {compareModeActive && selectedIds.size >= 2 && (
          <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3 bg-white dark:bg-neutral-900 border-t border-neutral-200/75 dark:border-neutral-800 shadow-lg">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Compare {selectedIds.size} properties</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={clearSelected}>Clear</Button>
              <Button size="sm" onClick={() => setComparePanelOpen(true)} disabled={selectedIds.size < 2}>Compare</Button>
            </div>
          </div>
        )}

        {comparePanelOpen && selectedRows.length >= 2 && (
          <>
            <div className="fixed inset-0 z-50 bg-black/40" aria-hidden="true" onClick={handleComparePanelClose} />
            <div
              className="fixed top-0 right-0 bottom-0 w-full max-w-2xl z-50 bg-white dark:bg-neutral-900 shadow-xl overflow-y-auto flex flex-col"
              role="dialog"
              aria-modal="true"
              aria-labelledby="compare-panel-title"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200/75 dark:border-neutral-800 shrink-0">
                <h2 id="compare-panel-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100">Compare</h2>
                <button
                  type="button"
                  onClick={handleComparePanelClose}
                  className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700"
                  aria-label="Close compare panel"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-200/75 dark:border-neutral-700">
                        <th className="text-left py-2 pr-4 font-semibold text-gray-700 dark:text-gray-300 w-28" />
                        {selectedRows.map((r) => (
                          <th
                            key={r.id}
                            className="text-left py-2 px-3 font-semibold text-gray-700 dark:text-gray-300 min-w-[140px]"
                          >
                            {r.property_name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { key: 'source', label: 'Source', get: (r: UnifiedCompRow) => unifiedSourceLabel(r.source) },
                        { key: 'state', label: 'State', get: (r: UnifiedCompRow) => formatStateAbbreviation(r.state) },
                        { key: 'city', label: 'City', get: (r: UnifiedCompRow) => r.city ?? '-' },
                        { key: 'sites', label: 'Sites', get: (r: UnifiedCompRow) => String(r.total_sites ?? '-') },
                        { key: 'units', label: 'Units', get: (r: UnifiedCompRow) => String(r.num_units ?? '-') },
                        {
                          key: 'unit_type',
                          label: 'Unit Type',
                          get: (r: UnifiedCompRow) => formatUnitTypeDisplay(r.unit_type),
                        },
                        {
                          key: 'adr',
                          label: 'ARDR Range',
                          get: (r: UnifiedCompRow) =>
                            r.low_adr !== null || r.peak_adr !== null
                              ? `${formatCurrency(r.low_adr)} – ${formatCurrency(r.peak_adr)}`
                              : '-',
                        },
                        {
                          key: 'avg_adr',
                          label: 'Avg ADR',
                          get: (r: UnifiedCompRow) => formatCurrency(r.avg_adr),
                        },
                        ...(showOccupancyColumn
                          ? [
                              {
                                key: 'occ',
                                label: 'Occupancy',
                                get: (r: UnifiedCompRow) =>
                                  r.low_occupancy !== null || r.peak_occupancy !== null
                                    ? `${formatOccupancyPercent(r.low_occupancy)} – ${formatOccupancyPercent(r.peak_occupancy)}`
                                    : '-',
                              },
                            ]
                          : []),
                      ].map(({ key, label, get }) => (
                        <tr key={key} className="border-b border-neutral-100/90 dark:border-neutral-800">
                          <td className="py-2 pr-4 text-gray-600 dark:text-gray-400 font-medium">{label}</td>
                          {selectedRows.map((r) => (
                            <td key={r.id} className="py-2 px-3 text-gray-800 dark:text-gray-200">
                              {get(r)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default function ComparablesPage() {
  return (
    <Suspense
      fallback={
        <main className="pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="p-12 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-sage-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Loading comps...</p>
            </div>
          </div>
        </main>
      }
    >
      <ComparablesPageContent />
    </Suspense>
  );
}
