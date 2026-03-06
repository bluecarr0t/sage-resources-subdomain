'use client';

import { useState, useEffect, useCallback, useMemo, useRef, Fragment, Suspense } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Card } from '@/components/ui';
import MultiSelect from '@/components/MultiSelect';
import SearchableMultiSelect from '@/components/SearchableMultiSelect';
import { Search, ChevronLeft, ChevronRight, Star, ChevronUp, ChevronDown, FileText, Download, X, GitCompare } from 'lucide-react';
import { qualityScoreToDisplay, getStateFromComparableOverview, getStateFromText } from '@/lib/feasibility-utils';
import { STATE_ABBREVIATIONS } from '@/components/map/utils/stateUtils';

interface ComparableRow {
  id: string;
  comp_name: string;
  overview: string | null;
  state: string | null;
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
    | { _grouped: true; studies: Array<{ study_id: string | null; property_name?: string | null; location: string | null; state: string | null }> };
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

/** Handles both 0-1 (decimal) and 0-100 (percent) occupancy formats */
function formatOccupancyPercent(val: number | null): string {
  if (val === null) return '-';
  return val > 1 ? `${Math.round(val)}%` : `${Math.round(val * 100)}%`;
}

/** State for display: prefer comparable's state column, then overview, then comp_name. Never use report state—comparables are often in other states. */
function getDisplayState(comp: ComparableRow): string {
  if ((comp._studyCount ?? 0) > 1) return 'Multiple';
  if (comp.state?.trim()) return comp.state.trim().toUpperCase();
  const fromOverview = getStateFromComparableOverview(comp.overview ?? null);
  if (fromOverview) return fromOverview;
  const fromCompName = getStateFromText(comp.comp_name ?? null);
  if (fromCompName) return fromCompName;
  return '-';
}

function getStudyIds(comp: ComparableRow): string[] {
  const fromGroup = comp._studyIds?.filter(Boolean) || [];
  if (fromGroup.length > 0) return fromGroup;
  const r = comp.reports;
  if (r && '_grouped' in r && r._grouped && r.studies?.length) {
    return r.studies.map((s) => s.study_id).filter(Boolean) as string[];
  }
  if (r && !('_grouped' in r)) {
    const sid = (r as { study_id?: string }).study_id;
    if (sid) return [sid];
  }
  return [];
}

function getStudyDisplay(comp: ComparableRow): { text: string; firstStudyId: string | null } {
  const studyIds = getStudyIds(comp);
  const firstStudyId = studyIds[0] || null;
  if ((comp._studyCount ?? 0) > 1 && studyIds.length > 1) {
    return { text: `In ${comp._studyCount} jobs: ${studyIds.join(' · ')}`, firstStudyId };
  }
  return { text: firstStudyId || '-', firstStudyId };
}

/** Get report options for dropdown: resort name (job subject) + job number per report */
function getReportOptions(comp: ComparableRow): { studyId: string; resortName: string }[] {
  const r = comp.reports;
  if (!r) return [];
  if ('_grouped' in r && r._grouped && r.studies?.length) {
    return r.studies
      .map((s) => ({
        studyId: String(s.study_id ?? ''),
        resortName: String(s.property_name ?? ''),
      }))
      .filter((x) => x.studyId);
  }
  const rep = r as { study_id?: string; property_name?: string };
  if (rep.study_id) {
    return [{ studyId: rep.study_id, resortName: String(rep.property_name ?? '') }];
  }
  return [];
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

const TABLE_COLUMNS = 11; // Checkbox + SORTABLE_COLUMNS (8) + Keywords + Reports

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

function ComparablesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [comparables, setComparables] = useState<ComparableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(() => Math.max(1, parseInt(searchParams.get('page') ?? '1', 10)));
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState(() => searchParams.get('search') ?? '');
  const [selectedStates, setSelectedStates] = useState<string[]>(() => {
    const s = searchParams.get('state') ?? '';
    return s ? s.split(',').map((x) => x.trim().toUpperCase()).filter(Boolean) : [];
  });
  const [selectedUnitCategories, setSelectedUnitCategories] = useState<string[]>(() => {
    const u = searchParams.get('unit_category') ?? '';
    return u ? u.split(',').map((x) => x.trim()).filter(Boolean) : [];
  });
  const [unitCategoryOptions, setUnitCategoryOptions] = useState<{ value: string; label: string }[]>([]);
  const [stateOptions, setStateOptions] = useState<{ value: string; label: string }[]>([]);
  const [sortBy, setSortBy] = useState(() => searchParams.get('sort_by') ?? 'created_at');
  const [sortDir, setSortDir] = useState(() => searchParams.get('sort_dir') ?? 'desc');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [comparePanelOpen, setComparePanelOpen] = useState(false);
  const [compareModeActive, setCompareModeActive] = useState(false);
  const [isFuzzyResults, setIsFuzzyResults] = useState(false);
  const [openReportsDropdown, setOpenReportsDropdown] = useState<{
    compId: string;
    reportOptions: { studyId: string; resortName: string }[];
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const reportsDropdownRef = useRef<HTMLDivElement>(null);
  const reportsTriggerRef = useRef<HTMLElement | null>(null);

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

  // Close reports dropdown on click outside
  useEffect(() => {
    if (!openReportsDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (reportsDropdownRef.current?.contains(target)) return;
      if (reportsTriggerRef.current?.contains(target)) return;
      setOpenReportsDropdown(null);
    };
    const t = setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openReportsDropdown]);

  // Fetch facets for filter dropdowns
  useEffect(() => {
    fetch('/api/admin/comparables/facets')
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
              .sort((a: { value: string; label: string }, b: { value: string; label: string }) => a.label.localeCompare(b.label))
          );
          setStateOptions(
            (data.states || []).map((s: string) => {
              const fullName = STATE_ABBREVIATIONS[s] ?? s;
              return {
                value: s,
                label: fullName !== s ? `${fullName} (${s})` : s,
              };
            })
          );
        }
      })
      .catch(() => {});
  }, []);

  // Sync URL -> state when searchParams changes (mount, back/forward navigation)
  useEffect(() => {
    const q = searchParams.get('search') ?? '';
    const st = searchParams.get('state') ?? '';
    const uc = searchParams.get('unit_category') ?? '';
    const sby = searchParams.get('sort_by') ?? 'created_at';
    const sdir = searchParams.get('sort_dir') ?? 'desc';
    const p = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    setSearch(q);
    setSelectedStates(st ? st.split(',').map((x) => x.trim().toUpperCase()).filter(Boolean) : []);
    setSelectedUnitCategories(uc ? uc.split(',').map((x) => x.trim()).filter(Boolean) : []);
    setSortBy(sby);
    setSortDir(sdir);
    setPage(p);
  }, [searchParams]);

  // Sync state -> URL when search/sort/page/filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (selectedStates.length > 0) params.set('state', selectedStates.join(','));
    if (selectedUnitCategories.length > 0) params.set('unit_category', selectedUnitCategories.join(','));
    params.set('sort_by', sortBy);
    params.set('sort_dir', sortDir);
    if (page > 1) params.set('page', String(page));
    const next = params.toString();
    const current = searchParams.toString();
    if (next !== current) {
      router.replace(`/admin/comparables${next ? `?${next}` : ''}`, { scroll: false });
    }
  }, [search, selectedStates, selectedUnitCategories, sortBy, sortDir, page, router, searchParams]);

  // Debounce feedback: user has typed but debounce hasn't fired
  const isDebouncing = search !== debouncedSearch;

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (selectedStates.length > 0) params.set('state', selectedStates.join(','));
    if (selectedUnitCategories.length > 0) params.set('unit_category', selectedUnitCategories.join(','));
    params.set('sort_by', sortBy);
    params.set('sort_dir', sortDir);
    params.set('page', String(page));
    params.set('per_page', String(PER_PAGE));
    return params.toString();
  }, [debouncedSearch, selectedStates, selectedUnitCategories, sortBy, sortDir, page]);

  const hasCompletedInitialLoad = useRef(false);
  const prevDebouncedSearch = useRef<string | null>(null);

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
        setIsFuzzyResults(data.pagination?.fuzzy === true);
        setError(null);
      } else {
        setComparables([]);
        setIsFuzzyResults(false);
        setError(data.message || 'Failed to load comparables');
      }
    } catch (err) {
      setComparables([]);
      setIsFuzzyResults(false);
      setError(err instanceof Error ? err.message : 'Failed to load comparables');
    } finally {
      setLoading(false);
      hasCompletedInitialLoad.current = true;
    }
  }, [queryString]);

  useEffect(() => {
    loadComparables();
  }, [loadComparables]);

  useEffect(() => {
    if (!hasCompletedInitialLoad.current) return;
    // Don't reset page when debouncedSearch is catching up from URL hydration
    const urlSearch = searchParams.get('search') ?? '';
    const wasEmpty = prevDebouncedSearch.current === '' || prevDebouncedSearch.current === null;
    if (wasEmpty && debouncedSearch === urlSearch && urlSearch) {
      prevDebouncedSearch.current = debouncedSearch;
      return;
    }
    prevDebouncedSearch.current = debouncedSearch;
    setPage(1);
  }, [debouncedSearch, sortBy, sortDir, searchParams]);

  useEffect(() => {
    setPage(1);
  }, [selectedStates, selectedUnitCategories]);

  useEffect(() => {
    setExpandedIds(new Set());
    setSelectedIds(new Set());
    setCompareModeActive(false);
  }, [page, debouncedSearch, selectedStates, selectedUnitCategories, sortBy, sortDir]);

  const expandIdFromUrl = searchParams.get('expand');

  useEffect(() => {
    if (expandIdFromUrl && comparables.length > 0) {
      const matching = comparables.find((c) => c.id === expandIdFromUrl);
      if (matching) {
        setExpandedIds((prev) => new Set([...prev, expandIdFromUrl]));
      }
    }
  }, [comparables, expandIdFromUrl]);

  const handleExportExcel = useCallback(async () => {
    const { default: XLSX } = await import('xlsx');
    const rows: (string | number)[][] = [];
    const header = [
      'Property',
      'Job Number',
      'State',
      'Sites',
      'Quality',
      'Unit Types',
      'ADR Range',
      'Occupancy',
      'Keywords',
      'Detail Type',
      'Unit Type',
      'Unit Sites',
      'Low ADR',
      'Peak ADR',
      'Low Occ.',
      'Peak Occ.',
      'Unit Quality',
    ];
    rows.push(header);

    for (const comp of comparables) {
      const units = comp.feasibility_comp_units || [];
      const studyDisplay = getStudyDisplay(comp);
      const stateVal = getDisplayState(comp);
      const state = stateVal === '-' ? '' : stateVal;
      const unitTypes = [...new Set(units.map((u) => u.unit_category || 'other'))].slice(0, 3).join(', ');
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
      const occLow =
        avgLowOcc.length > 0 ? formatOccupancyPercent(avgLowOcc.reduce((s, u) => s + (u.low_occupancy || 0), 0) / avgLowOcc.length) : '';
      const occPeak =
        avgPeakOcc.length > 0 ? formatOccupancyPercent(avgPeakOcc.reduce((s, u) => s + (u.peak_occupancy || 0), 0) / avgPeakOcc.length) : '';
      const adrRange =
        minAdr != null || maxAdr != null ? `${formatCurrency(minAdr)} - ${formatCurrency(maxAdr)}` : '';
      const keywords = (comp.amenity_keywords || []).slice(0, 3).join(', ');
      const qualityDisplay = qualityScoreToDisplay(comp.quality_score);
      const qualityStr = qualityDisplay != null ? qualityDisplay.toFixed(1) : '';

      const baseCells: (string | number)[] = [
        comp.comp_name,
        studyDisplay.text,
        state,
        comp.total_sites ?? '',
        qualityStr,
        unitTypes,
        adrRange,
        `${occLow} - ${occPeak}`,
        keywords,
      ];

      const isExpanded = expandedIds.has(comp.id);

      if (isExpanded && units.length > 0) {
        rows.push([...baseCells, 'Comparable', '', '', '', '', '', '', '']);
        for (const u of units) {
          rows.push([
            ...baseCells,
            'Unit',
            u.unit_type,
            u.num_units ?? '',
            formatCurrency(u.low_adr),
            formatCurrency(u.peak_adr),
            formatOccupancyPercent(u.low_occupancy),
            formatOccupancyPercent(u.peak_occupancy),
            qualityScoreToDisplay(u.quality_score)?.toFixed(1) ?? '',
          ]);
        }
      } else {
        rows.push([...baseCells, 'Comparable', '', '', '', '', '', '', '']);
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Comparables');
    XLSX.writeFile(wb, `comparables-export-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }, [comparables, expandedIds]);

  const selectedComps = useMemo(
    () => comparables.filter((c) => selectedIds.has(c.id)),
    [comparables, selectedIds]
  );

  const handleComparePanelClose = useCallback(() => {
    setComparePanelOpen(false);
  }, []);

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

  return (
    <main className={`px-4 sm:px-6 lg:px-8 ${compareModeActive && selectedIds.size >= 2 ? 'pb-24' : 'pb-16'}`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Comparables
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Browse and search comparable properties across all feasibility studies
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => (compareModeActive ? exitCompareMode() : setCompareModeActive(true))}
              disabled={comparables.length === 0}
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
              disabled={comparables.length === 0}
              title="Export current view to Excel (includes expanded unit details)"
            >
              <Download className="w-4 h-4 mr-1.5" />
              Export Excel
            </Button>
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
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-0 max-w-md">
              <label htmlFor="comparables-search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="comparables-search"
                  type="text"
                  placeholder="Property, city, job number, keywords..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
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
                      setPage(1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-700"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : null}
              </div>
            </div>
            <div className="w-full sm:w-48">
              <MultiSelect
                id="unit-type-filter"
                label="Unit Type"
                options={unitCategoryOptions}
                selectedValues={selectedUnitCategories}
                onToggle={(v) =>
                  setSelectedUnitCategories((prev) =>
                    prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
                  )
                }
                onClear={() => setSelectedUnitCategories([])}
                placeholder="All unit types"
                allSelectedText="All unit types"
                activeColor="sage"
              />
            </div>
            <div className="w-full sm:w-48">
              <SearchableMultiSelect
                id="state-filter"
                label="State"
                options={stateOptions}
                selectedValues={selectedStates}
                onToggle={(v) =>
                  setSelectedStates((prev) =>
                    prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
                  )
                }
                placeholder="All states"
                allSelectedText="All states"
                searchPlaceholder="Search states..."
                activeColor="sage"
              />
            </div>
          </div>
          {/* Active filter tags */}
          {(search || selectedStates.length > 0 || selectedUnitCategories.length > 0) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {search && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium bg-sage-100 dark:bg-sage-900/50 text-sage-800 dark:text-sage-200 border border-sage-200 dark:border-sage-700">
                  <span className="truncate max-w-[180px]" title={search}>Search: &quot;{search}&quot;</span>
                  <button
                    type="button"
                    onClick={() => { setSearch(''); setPage(1); }}
                    className="p-0.5 rounded hover:bg-sage-200 dark:hover:bg-sage-700 text-sage-600 dark:text-sage-300 hover:text-sage-800 dark:hover:text-sage-100 transition-colors"
                    aria-label="Remove search filter"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              )}
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
                      onClick={() => {
                        setSelectedStates((prev) => prev.filter((x) => x !== st));
                        setPage(1);
                      }}
                      className="p-0.5 rounded hover:bg-sage-200 dark:hover:bg-sage-700 text-sage-600 dark:text-sage-300 hover:text-sage-800 dark:hover:text-sage-100 transition-colors"
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
                      onClick={() => {
                        setSelectedUnitCategories((prev) => prev.filter((x) => x !== cat));
                        setPage(1);
                      }}
                      className="p-0.5 rounded hover:bg-sage-200 dark:hover:bg-sage-700 text-sage-600 dark:text-sage-300 hover:text-sage-800 dark:hover:text-sage-100 transition-colors"
                      aria-label={`Remove unit type filter ${label}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSelectedStates([]);
                  setSelectedUnitCategories([]);
                  setPage(1);
                }}
                className="text-sm font-medium text-sage-600 dark:text-sage-400 hover:text-sage-800 dark:hover:text-sage-200 hover:underline"
              >
                Clear all
              </button>
            </div>
          )}
          {/* Results count - updates with search */}
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {loading ? (
                <span className="text-gray-500 dark:text-gray-400">Loading...</span>
              ) : (
                <>
                  <span className="text-sage-600 dark:text-sage-400">{total.toLocaleString()}</span>
                  {' '}
                  {(search || debouncedSearch || selectedStates.length > 0 || selectedUnitCategories.length > 0)
                    ? `result${total === 1 ? '' : 's'} found`
                    : `comparable${total === 1 ? '' : 's'} total`}
                </>
              )}
            </p>
          </div>
        </Card>

        {compareModeActive && (
          <div className="mb-4 px-4 py-2 bg-sage-50 dark:bg-sage-900/30 border border-sage-200 dark:border-sage-800 rounded-lg text-sm text-sage-800 dark:text-sage-200">
            Select 2–4 properties using the checkboxes, then click <strong>Compare</strong> in the bar below.
          </div>
        )}

        {isFuzzyResults && comparables.length > 0 && (
          <div className="mb-4 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-200">
            No exact matches. Showing similar results.
          </div>
        )}

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
                  setSelectedStates([]);
                  setSelectedUnitCategories([]);
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
                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                      {compareModeActive && (
                        <th className="w-12 px-3 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                          Select
                        </th>
                      )}
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
                      <th className="text-center px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 w-24">
                        Reports
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {comparables.map((comp) => {
                      const units = comp.feasibility_comp_units || [];
                      const hasUnitData = units.length > 0;
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
                      const studyDisplay = getStudyDisplay(comp);
                      const isExpanded = expandedIds.has(comp.id);
                      const studyIds = comp._studyIds?.filter(Boolean) || [];

                      return (
                        <Fragment key={comp.id}>
                          <tr
                            role={hasUnitData ? 'button' : undefined}
                            tabIndex={hasUnitData ? 0 : undefined}
                            aria-expanded={hasUnitData ? isExpanded : undefined}
                            aria-label={hasUnitData ? `${comp.comp_name}, ${isExpanded ? 'collapse' : 'expand'} to view unit details` : undefined}
                            className={hasUnitData ? 'hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer transition-colors' : 'transition-colors'}
                            onClick={hasUnitData ? () => toggleExpanded(comp.id) : undefined}
                            onKeyDown={
                              hasUnitData
                                ? (e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      toggleExpanded(comp.id);
                                    }
                                  }
                                : undefined
                            }
                          >
                            {compareModeActive && (
                              <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(comp.id)}
                                  onChange={() => toggleSelected(comp.id)}
                                  disabled={selectedIds.size >= 4 && !selectedIds.has(comp.id)}
                                  className="rounded border-gray-300 dark:border-gray-600 text-sage-600 focus:ring-sage-500 w-4 h-4"
                                  aria-label={`Select ${comp.comp_name} for comparison`}
                                />
                              </td>
                            )}
                            <td className="px-4 py-3">
                              <div className="flex items-start gap-2">
                                <span className="shrink-0 mt-0.5 text-gray-400 dark:text-gray-500" aria-hidden>
                                  {hasUnitData ? (
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
                                    className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[200px]"
                                    title={comp.comp_name}
                                  >
                                    {comp.comp_name}
                                  </p>
                                </div>
                              </div>
                            </td>
                          <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300">
                            {studyDisplay.text}
                          </td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs">
                            {getDisplayState(comp)}
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
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                              {studyIds.length === 0 ? (
                                <span className="text-gray-400 text-xs">-</span>
                              ) : studyIds.length === 1 ? (
                                <button
                                  type="button"
                                  title={`View report ${studyIds[0]}`}
                                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-gray-500 hover:text-sage-600 hover:bg-sage-50 dark:text-gray-400 dark:hover:text-sage-400 dark:hover:bg-sage-900/30 transition-colors"
                                  onClick={() => router.push(`/admin/comparables/${studyIds[0]}`)}
                                >
                                  <FileText className="w-4 h-4 shrink-0" />
                                  <span className="text-xs font-medium truncate max-w-[72px]" title={studyIds[0]}>
                                    {studyIds[0]}
                                  </span>
                                </button>
                              ) : (
                                <>
                                  <button
                                  ref={(el) => {
                                    if (el && openReportsDropdown?.compId === comp.id) reportsTriggerRef.current = el;
                                    else if (!openReportsDropdown) reportsTriggerRef.current = null;
                                  }}
                                  type="button"
                                  title={`View report (${studyIds.length} jobs)`}
                                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-gray-500 hover:text-sage-600 hover:bg-sage-50 dark:text-gray-400 dark:hover:text-sage-400 dark:hover:bg-sage-900/30 transition-colors"
                                  onClick={(e) => {
                                    if (openReportsDropdown?.compId === comp.id) {
                                      setOpenReportsDropdown(null);
                                      return;
                                    }
                                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                    const width = Math.max(rect.width, 300);
                                    const vw = typeof window !== 'undefined' ? window.innerWidth : 400;
                                    const left = Math.max(8, Math.min(rect.left, vw - width - 8));
                                    setOpenReportsDropdown({
                                      compId: comp.id,
                                      reportOptions: getReportOptions(comp),
                                      top: rect.bottom + 4,
                                      left,
                                      width,
                                    });
                                  }}
                                >
                                  <FileText className="w-4 h-4 shrink-0" />
                                  <span className="text-xs font-medium">{studyIds.length}</span>
                                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                                </button>
                                {openReportsDropdown?.compId === comp.id &&
                                  createPortal(
                                    <div
                                      ref={reportsDropdownRef}
                                      className="fixed z-[9999] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl overflow-hidden py-1"
                                      style={{
                                        top: openReportsDropdown.top,
                                        left: openReportsDropdown.left,
                                        width: openReportsDropdown.width,
                                        maxHeight: 280,
                                        position: 'fixed',
                                      }}
                                      onMouseDown={(e) => e.stopPropagation()}
                                    >
                                      <div className="overflow-y-auto max-h-[272px]">
                                        {openReportsDropdown.reportOptions.map(({ studyId, resortName }) => (
                                          <button
                                            key={studyId}
                                            type="button"
                                            className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-sage-50 dark:hover:bg-sage-900/30 flex items-center gap-2"
                                            onClick={() => {
                                              router.push(`/admin/comparables/${studyId}`);
                                              setOpenReportsDropdown(null);
                                            }}
                                          >
                                            <FileText className="w-4 h-4 shrink-0 text-gray-400" />
                                            <span className="whitespace-nowrap">
                                              {resortName ? `${resortName} - ${studyId}` : studyId}
                                            </span>
                                          </button>
                                        ))}
                                      </div>
                                    </div>,
                                    document.body
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                        {isExpanded && hasUnitData && (
                          <tr key={`${comp.id}-expanded`} className="bg-gray-50 dark:bg-gray-800/30">
                            <td colSpan={compareModeActive ? TABLE_COLUMNS : TABLE_COLUMNS - 1} className="px-4 py-3 align-top">
                              {units.length > 0 ? (
                                <div className="pl-6 pr-4 pb-2">
                                  {(comp._studyCount ?? 0) > 1 && studyDisplay.firstStudyId && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                      Unit data from study {studyDisplay.firstStudyId}
                                    </p>
                                  )}
                                  <div className="hidden sm:block overflow-x-auto">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="border-b border-gray-200 dark:border-gray-600">
                                        <th className="text-left py-2 pr-4 font-semibold text-gray-700 dark:text-gray-300">Unit Type</th>
                                        <th className="text-center py-2 px-2 font-semibold text-gray-700 dark:text-gray-300">Sites</th>
                                        <th className="text-right py-2 px-2 font-semibold text-gray-700 dark:text-gray-300">Low ADR</th>
                                        <th className="text-right py-2 px-2 font-semibold text-gray-700 dark:text-gray-300">Peak ADR</th>
                                        <th className="text-right py-2 px-2 font-semibold text-gray-700 dark:text-gray-300">Low Occ.</th>
                                        <th className="text-right py-2 px-2 font-semibold text-gray-700 dark:text-gray-300">Peak Occ.</th>
                                        <th className="text-center py-2 pl-2 font-semibold text-gray-700 dark:text-gray-300">Quality</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                      {units.map((u) => (
                                        <tr key={u.id} className="hover:bg-gray-100/50 dark:hover:bg-gray-700/30">
                                          <td className="py-2 pr-4 text-gray-800 dark:text-gray-200">{u.unit_type}</td>
                                          <td className="py-2 px-2 text-center text-gray-700 dark:text-gray-300">{u.num_units ?? '-'}</td>
                                          <td className="py-2 px-2 text-right text-gray-700 dark:text-gray-300">{formatCurrency(u.low_adr)}</td>
                                          <td className="py-2 px-2 text-right text-gray-700 dark:text-gray-300">{formatCurrency(u.peak_adr)}</td>
                                          <td className="py-2 px-2 text-right text-gray-700 dark:text-gray-300">{formatOccupancyPercent(u.low_occupancy)}</td>
                                          <td className="py-2 px-2 text-right text-gray-700 dark:text-gray-300">{formatOccupancyPercent(u.peak_occupancy)}</td>
                                          <td className="py-2 pl-2 text-center text-gray-700 dark:text-gray-300">
                                            {qualityScoreToDisplay(u.quality_score)?.toFixed(1) ?? '-'}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                  </div>
                                  <div className="sm:hidden space-y-2">
                                    {units.map((u) => (
                                      <div
                                        key={u.id}
                                        className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/50 p-3 text-xs"
                                      >
                                        <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">{u.unit_type}</p>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-700 dark:text-gray-300">
                                          <span>Sites:</span>
                                          <span className="text-right">{u.num_units ?? '-'}</span>
                                          <span>Low ADR:</span>
                                          <span className="text-right">{formatCurrency(u.low_adr)}</span>
                                          <span>Peak ADR:</span>
                                          <span className="text-right">{formatCurrency(u.peak_adr)}</span>
                                          <span>Low Occ.:</span>
                                          <span className="text-right">{formatOccupancyPercent(u.low_occupancy)}</span>
                                          <span>Peak Occ.:</span>
                                          <span className="text-right">{formatOccupancyPercent(u.peak_occupancy)}</span>
                                          <span>Quality:</span>
                                          <span className="text-right">{qualityScoreToDisplay(u.quality_score)?.toFixed(1) ?? '-'}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="pl-6 py-2 text-sm text-gray-500 dark:text-gray-400">No unit data</div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
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

        {compareModeActive && selectedIds.size >= 2 && (
          <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Compare {selectedIds.size} properties
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={clearSelected}>
                Clear
              </Button>
              <Button
                size="sm"
                onClick={() => setComparePanelOpen(true)}
                disabled={selectedIds.size < 2}
              >
                Compare
              </Button>
            </div>
          </div>
        )}

        {comparePanelOpen && selectedComps.length >= 2 && (
          <>
            <div
              className="fixed inset-0 z-50 bg-black/40"
              aria-hidden="true"
              onClick={handleComparePanelClose}
            />
            <div
              className="fixed top-0 right-0 bottom-0 w-full max-w-2xl z-50 bg-white dark:bg-gray-800 shadow-xl overflow-y-auto flex flex-col"
              role="dialog"
              aria-modal="true"
              aria-labelledby="compare-panel-title"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
                <h2 id="compare-panel-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Compare
                </h2>
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
                      <tr className="border-b border-gray-200 dark:border-gray-600">
                        <th className="text-left py-2 pr-4 font-semibold text-gray-700 dark:text-gray-300 w-28" />
                        {selectedComps.map((comp) => (
                          <th
                            key={comp.id}
                            className="text-left py-2 px-3 font-semibold text-gray-700 dark:text-gray-300 min-w-[120px]"
                          >
                            {comp.comp_name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { key: 'property', label: 'Property', get: (c: ComparableRow) => c.comp_name },
                        {
                          key: 'job',
                          label: 'Job Number',
                          get: (c: ComparableRow) => getStudyDisplay(c).text,
                        },
                        {
                          key: 'state',
                          label: 'State',
                          get: (c: ComparableRow) => getDisplayState(c),
                        },
                        { key: 'sites', label: 'Sites', get: (c: ComparableRow) => String(c.total_sites ?? '-') },
                        {
                          key: 'quality',
                          label: 'Quality',
                          get: (c: ComparableRow) => (qualityScoreToDisplay(c.quality_score)?.toFixed(1) ?? '-'),
                        },
                        {
                          key: 'adr',
                          label: 'ADR Range',
                          get: (c: ComparableRow) => {
                            const units = c.feasibility_comp_units || [];
                            const min = units.reduce((m, u) => (u.low_adr != null && (m == null || u.low_adr < m) ? u.low_adr : m), null as number | null);
                            const max = units.reduce((m, u) => (u.peak_adr != null && (m == null || u.peak_adr > m) ? u.peak_adr : m), null as number | null);
                            return min != null || max != null ? `${formatCurrency(min)} – ${formatCurrency(max)}` : '-';
                          },
                        },
                        {
                          key: 'occ',
                          label: 'Occupancy',
                          get: (c: ComparableRow) => {
                            const units = c.feasibility_comp_units || [];
                            const low = units.filter((u) => u.low_occupancy != null);
                            const peak = units.filter((u) => u.peak_occupancy != null);
                            const lowVal = low.length ? low.reduce((s, u) => s + (u.low_occupancy || 0), 0) / low.length : null;
                            const peakVal = peak.length ? peak.reduce((s, u) => s + (u.peak_occupancy || 0), 0) / peak.length : null;
                            return lowVal != null || peakVal != null ? `${formatOccupancyPercent(lowVal)} – ${formatOccupancyPercent(peakVal)}` : '-';
                          },
                        },
                      ].map(({ key, label, get }) => (
                        <tr key={key} className="border-b border-gray-100 dark:border-gray-700">
                          <td className="py-2 pr-4 text-gray-600 dark:text-gray-400 font-medium">{label}</td>
                          {selectedComps.map((comp) => (
                            <td key={comp.id} className="py-2 px-3 text-gray-800 dark:text-gray-200">
                              {key === 'job' ? (
                                (() => {
                                  const studyIds = getStudyIds(comp);
                                  const count = comp._studyCount ?? 0;
                                  if (studyIds.length === 0) return '-';
                                  if (count > 1 && studyIds.length > 1) {
                                    return (
                                      <span>
                                        In {count} jobs:{' '}
                                        {studyIds.map((id, i) => (
                                          <Fragment key={id}>
                                            {i > 0 && ' · '}
                                            <Link
                                              href={`/admin/comparables/${id}`}
                                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                                            >
                                              {id}
                                            </Link>
                                          </Fragment>
                                        ))}
                                      </span>
                                    );
                                  }
                                  return (
                                    <Link
                                      href={`/admin/comparables/${studyIds[0]}`}
                                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                                    >
                                      {studyIds[0]}
                                    </Link>
                                  );
                                })()
                              ) : (
                                get(comp)
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-6 mb-2">Unit Types</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-600">
                        <th className="text-left py-2 pr-4 font-semibold text-gray-700 dark:text-gray-300 w-28">Category</th>
                        {selectedComps.map((comp) => (
                          <th
                            key={comp.id}
                            className="text-left py-2 px-3 font-semibold text-gray-700 dark:text-gray-300 min-w-[120px]"
                          >
                            {comp.comp_name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ...new Set(
                          selectedComps.flatMap((c) =>
                            (c.feasibility_comp_units || []).map((u) => u.unit_category || 'other')
                          )
                        ),
                      ]
                        .sort()
                        .map((cat) => (
                          <tr key={cat} className="border-b border-gray-100 dark:border-gray-700">
                            <td className="py-2 pr-4 text-gray-600 dark:text-gray-400 font-medium capitalize">
                              {cat.replace(/_/g, ' ')}
                            </td>
                            {selectedComps.map((comp) => {
                              const units = comp.feasibility_comp_units || [];
                              const unit = units.find((u) => (u.unit_category || 'other') === cat);
                              return (
                                <td key={comp.id} className="py-2 px-3 text-gray-800 dark:text-gray-200">
                                  {unit ? (
                                    <span>
                                      {unit.num_units ?? '-'} sites, {formatCurrency(unit.low_adr)}–{formatCurrency(unit.peak_adr)}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">—</span>
                                  )}
                                </td>
                              );
                            })}
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
              <p className="text-gray-500 dark:text-gray-400">Loading comparables...</p>
            </div>
          </div>
        </main>
      }
    >
      <ComparablesPageContent />
    </Suspense>
  );
}
