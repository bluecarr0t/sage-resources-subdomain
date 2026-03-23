'use client';

import { Fragment, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button, Card } from '@/components/ui';
import { formatComponentSectionName } from '@/lib/cce-component-section-display';
import { ArrowDown, ArrowUp, Calculator, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ExternalLink, FileUp, Loader2, PieChart, Ruler, Search, Star, Tent, Wrench, X } from 'lucide-react';

type TabType = 'cost' | 'percent' | 'catalog' | 'component';

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

interface CceCostPctRow {
  id: string;
  section_name: string;
  section_number: number | null;
  occupancy: string;
  category: string;
  low_pct: number | null;
  median_pct: number | null;
  high_pct: number | null;
  source_page: number | null;
}

interface CceComponentRow {
  id: string;
  section_name: string | null;
  item_name: string | null;
  cost_tier: string | null;
  col_1: number | null;
  col_2: number | null;
  col_3: number | null;
  col_4: number | null;
  source_page: number | null;
}

interface CceCatalogRow {
  id: string;
  catalog_section: string | null;
  manufacturer: string | null;
  product_model: string | null;
  unit_link: string | null;
  price: number | null;
  price_category: string | null;
  length_ft: number | null;
  width_ft: number | null;
  dimensions_ft: string | null;
  floor_area_sqft: number | null;
  frame_material: string | null;
  exterior_material: string | null;
  insulation_material: string | null;
  bathroom: string | null;
  shower: string | null;
  kitchen: string | null;
  hvac: string | null;
  plumbing_system: string | null;
  electrical_system: string | null;
  lead_time_weeks: string | null;
  warranty: string | null;
  certification: string | null;
  source_page: number | null;
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

function formatPct(val: number | null): string {
  if (val === null) return '-';
  return `${val}%`;
}

function SortableTh({
  label,
  sortKey,
  currentSort,
  currentDir,
  onSort,
  align = 'left',
}: {
  label: string;
  sortKey: CostSortBy | PctSortBy | CatalogSortBy | ComponentSortBy;
  currentSort: string;
  currentDir: string;
  onSort: (k: CostSortBy | PctSortBy | CatalogSortBy | ComponentSortBy) => void;
  align?: 'left' | 'right';
}) {
  const isActive = currentSort === sortKey;
  return (
    <th
      className={`px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 ${align === 'right' ? 'text-right' : 'text-left'}`}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive ? (
          currentDir === 'asc' ? (
            <ArrowUp className="w-3.5 h-3.5" />
          ) : (
            <ArrowDown className="w-3.5 h-3.5" />
          )
        ) : (
          <span className="w-3.5 h-3.5 opacity-30" />
        )}
      </span>
    </th>
  );
}

const FALLBACK_BUILDING_CLASSES = ['A-B', 'C', 'D', 'D POLE', 'D MASONRY VENEER', 'C MILL', 'S'];
const FALLBACK_QUALITY_TYPES = ['Excellent', 'Very Good', 'Good', 'Average', 'Fair', 'Low cost'];

/** Fixed unit type categories for catalog filter (from The Categories) */
const CATALOG_UNIT_TYPES = [
  'Converted Containers',
  'Domes',
  'Pods',
  'Treehouses',
  'Tents',
  'Wagons',
  'Yurts',
] as const;

const CCE_FAVORITES_KEY = 'cce-favorites';

type CostSortBy = 'cost_sq_ft' | 'cost_sq_m' | 'cost_cu_ft' | 'occupancy_name' | 'building_class' | 'quality_type' | 'source_page';

const COST_TAB_DEFAULT_PAGE = 1;
const COST_TAB_DEFAULT_SORT: CostSortBy = 'occupancy_name';
type PctSortBy = 'section_name' | 'occupancy' | 'category' | 'median_pct' | 'low_pct' | 'high_pct' | 'source_page';
type CatalogSortBy = 'price' | 'floor_area_sqft' | 'manufacturer' | 'product_model' | 'source_page';
type ComponentSortBy =
  | 'item_name'
  | 'section_name'
  | 'col_1'
  | 'col_2'
  | 'col_3'
  | 'col_4'
  | 'source_page'
  | 'price';

const COMPONENT_VALID_SORT_KEYS = new Set<string>([
  'item_name',
  'section_name',
  'col_1',
  'col_2',
  'col_3',
  'col_4',
  'source_page',
  'price',
]);

function loadFavorites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const s = localStorage.getItem(CCE_FAVORITES_KEY);
    if (!s) return [];
    const parsed = JSON.parse(s) as unknown;
    if (!Array.isArray(parsed)) return [];
    // Migrate from old format (occupancy codes as numbers) to new format (row IDs as strings)
    const valid = parsed.filter((v): v is string => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v));
    if (valid.length !== parsed.length) {
      saveFavorites(valid);
    }
    return valid;
  } catch {
    return [];
  }
}

function saveFavorites(ids: string[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CCE_FAVORITES_KEY, JSON.stringify(ids));
  } catch {}
}

export default function CostExplorerPage() {
  const t = useTranslations('admin.cceCosts');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TabType>(() => {
    const t = searchParams.get('tab');
    return t === 'percent' ? 'percent' : t === 'cost' ? 'cost' : t === 'component' ? 'component' : 'catalog';
  });
  const [rows, setRows] = useState<CceCostRow[]>([]);
  const [pctRows, setPctRows] = useState<CceCostPctRow[]>([]);
  const [catalogRows, setCatalogRows] = useState<CceCatalogRow[]>([]);
  const [componentRows, setComponentRows] = useState<CceComponentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '');
  const [buildingClass, setBuildingClass] = useState(() => searchParams.get('building_class') ?? '');
  const [qualityType, setQualityType] = useState(() => searchParams.get('quality_type') ?? '');
  const [minCost, setMinCost] = useState(() => searchParams.get('min_cost') ?? '');
  const [maxCost, setMaxCost] = useState(() => searchParams.get('max_cost') ?? '');
  const [category, setCategory] = useState(() => searchParams.get('category') ?? '');
  const [occupancyFilter, setOccupancyFilter] = useState(() => searchParams.get('occupancy') ?? '');
  const [manufacturerFilter, setManufacturerFilter] = useState(() => searchParams.get('manufacturer') ?? '');
  const [unitTypeFilter, setUnitTypeFilter] = useState(() => searchParams.get('unit_type') ?? '');
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [page, setPage] = useState(() => {
    const tabParam = searchParams.get('tab');
    const pageDefault = tabParam === 'cost' ? String(COST_TAB_DEFAULT_PAGE) : '1';
    return Math.max(1, parseInt(searchParams.get('page') ?? pageDefault, 10));
  });
  const [buildingClasses, setBuildingClasses] = useState<string[]>(FALLBACK_BUILDING_CLASSES);
  const [qualityTypes, setQualityTypes] = useState<string[]>(FALLBACK_QUALITY_TYPES);
  const [categories, setCategories] = useState<string[]>([]);
  const [occupancyOptions, setOccupancyOptions] = useState<string[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 50,
    total: 0,
    total_pages: 0,
  });
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [selectedPdf, setSelectedPdf] = useState<string>('');
  const [uploadedFilename, setUploadedFilename] = useState<string | null>(null);
  const [extractMessage, setExtractMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [sortBy, setSortBy] = useState<CostSortBy | PctSortBy | CatalogSortBy | ComponentSortBy>(() => {
    const tab = searchParams.get('tab');
    const sb = searchParams.get('sort_by') ?? '';
    if (sb) {
      if (tab === 'component' && !COMPONENT_VALID_SORT_KEYS.has(sb)) return 'section_name';
      return sb as CostSortBy | PctSortBy | CatalogSortBy | ComponentSortBy;
    }
    if (tab === 'cost') return COST_TAB_DEFAULT_SORT;
    if (tab === 'component') return 'section_name';
    return 'cost_sq_ft';
  });
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(() =>
    (searchParams.get('sort_dir') as 'asc' | 'desc') || 'asc'
  );
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [pdfExtractionExpanded, setPdfExtractionExpanded] = useState(false);
  const [outdoorHospitalityScope, setOutdoorHospitalityScope] = useState(
    () => searchParams.get('outdoor_hospitality') !== '0'
  );

  useEffect(() => {
    setFavorites(loadFavorites());
  }, []);

  const debouncedSearch = useDebounce(search, 300);

  const toggleRowExpand = (rowId: string) => {
    setExpandedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  const toggleFavorite = (rowId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId];
      saveFavorites(next);
      return next;
    });
  };

  const handleSort = (col: CostSortBy | PctSortBy | CatalogSortBy | ComponentSortBy) => {
    const nextDir = sortBy === col && sortDir === 'asc' ? 'desc' : 'asc';
    setSortBy(col);
    setSortDir(nextDir);
    setPage(1);
  };

  const isDebouncing = search !== debouncedSearch;

  // Fetch filter options on mount
  useEffect(() => {
    fetch('/api/admin/cce-filters')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (data.building_classes?.length) setBuildingClasses(data.building_classes);
          if (data.quality_types?.length) setQualityTypes(data.quality_types);
          if (data.categories?.length) setCategories(data.categories);
          if (data.occupancies?.length) setOccupancyOptions(data.occupancies);
          if (data.manufacturers?.length) setManufacturers(data.manufacturers);
        }
      })
      .catch(() => {});
  }, []);

  // Sync URL -> state on mount / navigation
  useEffect(() => {
    fetch('/api/admin/cce-uploads')
      .then((r) => r.ok ? r.json() : { files: [] })
      .then((d) => {
        const files = d.files || [];
        setUploadedFiles(files);
        if (files.length > 0 && !uploadedFilename) {
          const mostRecent = files[files.length - 1];
          setUploadedFilename(mostRecent);
          setSelectedPdf(`local_data/CCE_uploads/${mostRecent}`);
        }
      })
      .catch(() => setUploadedFiles([]));
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file?.name.toLowerCase().endsWith('.pdf')) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch('/api/admin/cce-upload', { method: 'POST', body: fd });
      const data = await r.json();
      if (data.success && data.filename) {
        setUploadedFiles((prev) => (prev.includes(data.filename) ? prev : [...prev, data.filename].sort()));
        setSelectedPdf(data.relativePath || `local_data/CCE_uploads/${data.filename}`);
        setUploadedFilename(data.filename);
      }
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    setTab(
      tabParam === 'percent'
        ? 'percent'
        : tabParam === 'cost'
          ? 'cost'
          : tabParam === 'component'
            ? 'component'
            : 'catalog'
    );
    const q = searchParams.get('search') ?? '';
    const bc = searchParams.get('building_class') ?? '';
    const qt = searchParams.get('quality_type') ?? '';
    const min = searchParams.get('min_cost') ?? '';
    const max = searchParams.get('max_cost') ?? '';
    const cat = searchParams.get('category') ?? '';
    const occ = searchParams.get('occupancy') ?? '';
    const mfr = searchParams.get('manufacturer') ?? '';
    const ut = searchParams.get('unit_type') ?? '';
    const sb = searchParams.get('sort_by') ?? '';
    const sd = searchParams.get('sort_dir') ?? '';
    const pageDefault =
      tabParam === 'cost' ? String(COST_TAB_DEFAULT_PAGE) : '1';
    const p = Math.max(1, parseInt(searchParams.get('page') ?? pageDefault, 10));
    setSearch(q);
    setBuildingClass(bc);
    setQualityType(qt);
    setMinCost(min);
    setMaxCost(max);
    setCategory(cat);
    setOccupancyFilter(occ);
    setManufacturerFilter(mfr);
    setUnitTypeFilter(ut);
    if (sb) {
      if (tabParam === 'component' && !COMPONENT_VALID_SORT_KEYS.has(sb)) {
        setSortBy('section_name');
      } else {
        setSortBy(sb as CostSortBy | PctSortBy | CatalogSortBy | ComponentSortBy);
      }
    } else if (tabParam === 'cost') {
      setSortBy(COST_TAB_DEFAULT_SORT);
    } else if (tabParam === 'component') {
      setSortBy('section_name');
    }
    if (sd) setSortDir(sd as 'asc' | 'desc');
    setPage(p);
    setOutdoorHospitalityScope(searchParams.get('outdoor_hospitality') !== '0');
  }, [searchParams]);

  // Sync state -> URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (tab === 'cost') params.set('tab', 'cost');
    else if (tab === 'percent') params.set('tab', 'percent');
    else if (tab === 'component') params.set('tab', 'component');
    else params.set('tab', 'catalog');
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (tab === 'cost') {
      if (buildingClass) params.set('building_class', buildingClass);
      if (qualityType) params.set('quality_type', qualityType);
      if (minCost) params.set('min_cost', minCost);
      if (maxCost) params.set('max_cost', maxCost);
    } else if (tab === 'percent') {
      if (category) params.set('category', category);
      if (occupancyFilter) params.set('occupancy', occupancyFilter);
    } else if (tab === 'component') {
      if (minCost) params.set('min_cost', minCost);
      if (maxCost) params.set('max_cost', maxCost);
    } else if (tab === 'catalog') {
      if (manufacturerFilter) params.set('manufacturer', manufacturerFilter);
      if (unitTypeFilter) params.set('unit_type', unitTypeFilter);
    }
    if (tab === 'cost' || page > 1) params.set('page', String(page));
    if ((tab === 'cost' || tab === 'component') && !outdoorHospitalityScope) {
      params.set('outdoor_hospitality', '0');
    }
    const defaultSort =
      tab === 'percent'
        ? 'occupancy'
        : tab === 'catalog'
          ? 'price'
          : tab === 'component'
            ? 'section_name'
            : COST_TAB_DEFAULT_SORT;
    if (tab === 'cost') {
      params.set('sort_by', sortBy);
    } else if (tab === 'component') {
      if (COMPONENT_VALID_SORT_KEYS.has(sortBy as string) && sortBy !== defaultSort) {
        params.set('sort_by', sortBy);
      }
    } else if (sortBy && sortBy !== defaultSort) {
      params.set('sort_by', sortBy);
    }
    if (sortDir && sortDir !== 'asc') params.set('sort_dir', sortDir);
    const next = params.toString();
    const current = searchParams.toString();
    if (next !== current) {
      router.replace(next ? `/admin/cost-explorer?${next}` : '/admin/cost-explorer', { scroll: false });
    }
  }, [
    tab,
    debouncedSearch,
    buildingClass,
    qualityType,
    minCost,
    maxCost,
    category,
    occupancyFilter,
    manufacturerFilter,
    unitTypeFilter,
    page,
    sortBy,
    sortDir,
    outdoorHospitalityScope,
    router,
    searchParams,
  ]);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('per_page', '50');
      if (tab === 'cost') {
        if (debouncedSearch) params.set('search', debouncedSearch);
        if (buildingClass) params.set('building_class', buildingClass);
        if (qualityType) params.set('quality_type', qualityType);
        if (minCost) params.set('min_cost', minCost);
        if (maxCost) params.set('max_cost', maxCost);
        if (showFavoritesOnly && favorites.length > 0) {
          params.set('ids', favorites.join(','));
        }
        const costSortBy = ['cost_sq_ft', 'cost_sq_m', 'cost_cu_ft', 'occupancy_name', 'building_class', 'quality_type', 'source_page'].includes(sortBy)
          ? sortBy
          : 'cost_sq_ft';
        params.set('sort_by', costSortBy);
        params.set('sort_dir', sortDir);
        if (outdoorHospitalityScope) params.set('scope', 'outdoor_hospitality');
        const res = await fetch(`/api/admin/cce-costs?${params}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load CCE costs');
        setRows(data.rows || []);
        setPagination(data.pagination || { page: 1, per_page: 50, total: 0, total_pages: 0 });
        if (data.message) setError(data.message);
      } else if (tab === 'percent') {
        if (debouncedSearch) params.set('search', debouncedSearch);
        if (category) params.set('category', category);
        if (occupancyFilter) params.set('occupancy', occupancyFilter);
        const pctSortBy = ['section_name', 'occupancy', 'category', 'median_pct', 'low_pct', 'high_pct', 'source_page'].includes(sortBy)
          ? sortBy
          : 'occupancy';
        params.set('sort_by', pctSortBy);
        params.set('sort_dir', sortDir);
        const res = await fetch(`/api/admin/cce-cost-percentages?${params}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load CCE cost percentages');
        setPctRows(data.rows || []);
        setPagination(data.pagination || { page: 1, per_page: 50, total: 0, total_pages: 0 });
        if (data.message) setError(data.message);
      } else if (tab === 'component') {
        if (debouncedSearch) params.set('search', debouncedSearch);
        if (minCost) params.set('min_cost', minCost);
        if (maxCost) params.set('max_cost', maxCost);
        const componentSortBy = ['item_name', 'section_name', 'col_1', 'col_2', 'col_3', 'col_4', 'source_page', 'price'].includes(sortBy)
          ? sortBy
          : 'section_name';
        params.set('sort_by', componentSortBy);
        params.set('sort_dir', sortDir);
        if (outdoorHospitalityScope) params.set('scope', 'outdoor_hospitality');
        const res = await fetch(`/api/admin/cce-component-costs?${params}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load CCE component costs');
        setComponentRows(data.rows || []);
        setPagination(data.pagination || { page: 1, per_page: 50, total: 0, total_pages: 0 });
        if (data.message) setError(data.message);
      } else if (tab === 'catalog') {
        if (debouncedSearch) params.set('search', debouncedSearch);
        if (manufacturerFilter) params.set('manufacturer', manufacturerFilter);
        if (unitTypeFilter) params.set('unit_type', unitTypeFilter);
        const catalogSortBy = ['price', 'floor_area_sqft', 'manufacturer', 'product_model', 'source_page'].includes(
          sortBy
        )
          ? sortBy
          : 'price';
        params.set('sort_by', catalogSortBy);
        params.set('sort_dir', sortDir);
        const res = await fetch(`/api/admin/cce-catalog-units?${params}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load CCE catalog units');
        setCatalogRows(data.rows || []);
        setPagination(data.pagination || { page: 1, per_page: 50, total: 0, total_pages: 0 });
        if (data.message) setError(data.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load CCE data');
      setRows([]);
      setPctRows([]);
      setCatalogRows([]);
      setComponentRows([]);
      setPagination({ page: 1, per_page: 50, total: 0, total_pages: 0 });
    } finally {
      setLoading(false);
    }
  }, [
    tab,
    debouncedSearch,
    buildingClass,
    qualityType,
    minCost,
    maxCost,
    category,
    occupancyFilter,
    manufacturerFilter,
    unitTypeFilter,
    showFavoritesOnly,
    favorites,
    sortBy,
    sortDir,
    page,
    outdoorHospitalityScope,
  ]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const handleExtract = useCallback(async () => {
    setExtracting(true);
    setExtractMessage(null);
    try {
      const body: { pdfPath?: string } = {};
      if (selectedPdf) body.pdfPath = selectedPdf;
      const r = await fetch('/api/admin/cce-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (data.success) {
        setExtractMessage({ type: 'success', text: data.message || t('upload.extractionSuccess') });
        loadRows();
      } else {
        setExtractMessage({ type: 'error', text: data.error || t('upload.extractionError') });
      }
    } catch {
      setExtractMessage({ type: 'error', text: t('upload.extractionError') });
    } finally {
      setExtracting(false);
    }
  }, [selectedPdf, loadRows]);

  const resetPageOnFilter = () => setPage(1);

  const hasFilters =
    search ||
    (tab === 'cost' && (buildingClass || qualityType || minCost || maxCost || showFavoritesOnly)) ||
    (tab === 'percent' && (category || occupancyFilter)) ||
    (tab === 'component' && (minCost || maxCost)) ||
    (tab === 'catalog' && (unitTypeFilter || manufacturerFilter));

  return (
    <main className="pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="pr-6 sm:pr-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Calculator className="w-10 h-10 text-sage-600" />
              {t('title')}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t('subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/api/admin/cce-pdf/March_2026"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              View Marshall & Swift PDF
            </a>
            <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 p-0.5">
              <button
                type="button"
                onClick={() => {
                  setTab('catalog');
                  setPage(1);
                  router.replace('/admin/cost-explorer?tab=catalog', { scroll: false });
                }}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
                  tab === 'catalog'
                    ? 'bg-sage-100 dark:bg-sage-900/50 text-sage-800 dark:text-sage-200 font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Tent className="w-4 h-4" />
                {t('catalogTab')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('component');
                  setPage(1);
                  setSortBy('section_name');
                  setSortDir('asc');
                  router.replace('/admin/cost-explorer?tab=component', { scroll: false });
                }}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
                  tab === 'component'
                    ? 'bg-sage-100 dark:bg-sage-900/50 text-sage-800 dark:text-sage-200 font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Wrench className="w-4 h-4" />
                <span className="inline-flex items-center gap-1.5">
                  {t('componentTab')}
                  <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/50 dark:text-amber-200">
                    {t('beta')}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('cost');
                  setPage(COST_TAB_DEFAULT_PAGE);
                  setSortBy(COST_TAB_DEFAULT_SORT);
                  setSortDir('asc');
                  router.replace(
                    `/admin/cost-explorer?tab=cost&page=${COST_TAB_DEFAULT_PAGE}&sort_by=${COST_TAB_DEFAULT_SORT}`,
                    { scroll: false }
                  );
                }}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
                  tab === 'cost'
                    ? 'bg-sage-100 dark:bg-sage-900/50 text-sage-800 dark:text-sage-200 font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Ruler className="w-4 h-4" />
                <span className="inline-flex items-center gap-1.5">
                  {t('costPerSqFtTab')}
                  <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/50 dark:text-amber-200">
                    {t('beta')}
                  </span>
                </span>
              </button>
              {tab === 'percent' && (
                <button
                  type="button"
                  onClick={() => {
                    setTab('percent');
                    setPage(1);
                    router.replace('/admin/cost-explorer?tab=percent', { scroll: false });
                  }}
                  className="px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 bg-sage-100 dark:bg-sage-900/50 text-sage-800 dark:text-sage-200 font-medium"
                >
                  <PieChart className="w-4 h-4" />
                  Cost %
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 text-sm">
            {error}
          </div>
        )}

        {/* PDF upload & extraction */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setPdfExtractionExpanded((v) => !v)}
            className="inline-flex items-center gap-2 text-sm font-medium text-sage-600 dark:text-sage-400 hover:text-sage-800 dark:hover:text-sage-200 hover:underline"
          >
            {pdfExtractionExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            {t('upload.title')}
          </button>
          {pdfExtractionExpanded && (
          <Card className="mt-3 p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('upload.uploadPdf')}</label>
              <label className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                <FileUp className="w-4 h-4" />
                {uploading ? t('upload.uploading') : t('upload.uploadPdf')}
                <input
                  type="file"
                  accept=".pdf"
                  className="sr-only"
                  onChange={handleUpload}
                  disabled={uploading}
                />
              </label>
            </div>
            <div className="min-w-[200px]">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('upload.fileLabel')}</label>
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 min-h-[40px] flex items-center">
                {uploadedFilename ?? t('upload.noFileSelected')}
              </div>
            </div>
            <div className="flex flex-col gap-0.5">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExtract}
                disabled={extracting}
                className={`inline-flex items-center gap-2 transition-all duration-300 ${
                  extracting
                    ? 'animate-pulse'
                    : 'hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                {extracting ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : null}
                {extracting ? t('upload.extracting') : t('upload.runExtraction')}
              </Button>
              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                {t('upload.extractionEstimate')}
              </span>
            </div>
          </div>
          {extractMessage && (
            <div
              className={`mt-3 p-2 rounded text-sm ${
                extractMessage.type === 'success'
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
              }`}
            >
              {extractMessage.text}
            </div>
          )}
          </Card>
          )}
        </div>

        {/* Filters */}
        <Card className="mb-6">
          {(tab === 'cost' || tab === 'component') && (
            <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 rounded border-gray-300 dark:border-gray-600"
                  checked={outdoorHospitalityScope}
                  onChange={(e) => {
                    setOutdoorHospitalityScope(e.target.checked);
                    setPage(1);
                  }}
                />
                <span>
                  <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                    {t('filters.outdoorHospitalityScope')}
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {t('filters.outdoorHospitalityScopeHint')}
                  </span>
                </span>
              </label>
            </div>
          )}
          {tab === 'cost' && (
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
                  className={`w-full pl-11 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sage-500 ${search || isDebouncing || loading ? 'pr-24' : 'pr-4'}`}
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
                className="w-full pl-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="">{t('filters.all')}</option>
                {buildingClasses.map((c) => (
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
                className="w-full pl-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="">{t('filters.all')}</option>
                {qualityTypes.map((q) => (
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
                className="w-full pl-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
                className="w-full pl-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            {favorites.length > 0 && (
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowFavoritesOnly((v) => !v);
                    setPage(1);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
                    showFavoritesOnly
                      ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200'
                      : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <Star className={`w-4 h-4 ${showFavoritesOnly ? 'fill-amber-500' : ''}`} />
                  {t('table.favorites')} ({favorites.length})
                </button>
              </div>
            )}
          </div>
          )}
          {tab === 'percent' && (
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-0 max-w-md">
              <label htmlFor="cce-pct-search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('filters.search')}
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="cce-pct-search"
                  type="text"
                  placeholder="Occupancy, category..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    resetPageOnFilter();
                  }}
                  className="w-full pl-10 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sage-500"
                />
              </div>
            </div>
            {categories.length > 0 && (
              <div className="w-full sm:w-40">
                <label htmlFor="cce-category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('filters.category')}
                </label>
                <select
                  id="cce-category"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    resetPageOnFilter();
                  }}
                  className="w-full pl-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="">{t('filters.all')}</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
            )}
            {occupancyOptions.length > 0 && (
              <div className="w-full sm:w-48">
                <label htmlFor="cce-occupancy" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('filters.occupancy')}
                </label>
                <select
                  id="cce-occupancy"
                  value={occupancyFilter}
                  onChange={(e) => {
                    setOccupancyFilter(e.target.value);
                    resetPageOnFilter();
                  }}
                  className="w-full pl-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="">{t('filters.all')}</option>
                  {occupancyOptions.map((o) => (
                    <option key={o} value={o}>{o.length > 40 ? `${o.slice(0, 37)}...` : o}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          )}
          {tab === 'component' && (
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-0 max-w-md">
              <label htmlFor="cce-component-search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('filters.search')}
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="cce-component-search"
                  type="text"
                  placeholder={t('component.searchPlaceholder')}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    resetPageOnFilter();
                  }}
                  className="w-full pl-10 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sage-500"
                />
              </div>
            </div>
            <div className="w-full sm:w-28">
              <label htmlFor="cce-component-min-cost" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('filters.minCost')}
              </label>
              <input
                id="cce-component-min-cost"
                type="number"
                min={0}
                step={1}
                placeholder="Min"
                value={minCost}
                onChange={(e) => {
                  setMinCost(e.target.value);
                  resetPageOnFilter();
                }}
                className="w-full pl-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="w-full sm:w-28">
              <label htmlFor="cce-component-max-cost" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('filters.maxCost')}
              </label>
              <input
                id="cce-component-max-cost"
                type="number"
                min={0}
                step={1}
                placeholder="Max"
                value={maxCost}
                onChange={(e) => {
                  setMaxCost(e.target.value);
                  resetPageOnFilter();
                }}
                className="w-full pl-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
          )}
          {tab === 'catalog' && (
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-0 max-w-md">
              <label htmlFor="cce-catalog-search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('filters.search')}
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="cce-catalog-search"
                  type="text"
                  placeholder={t('catalogSearchPlaceholder')}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    resetPageOnFilter();
                  }}
                  className="w-full pl-10 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sage-500"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <label htmlFor="cce-unit-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('catalog.unitType')}
              </label>
              <select
                id="cce-unit-type"
                value={unitTypeFilter}
                onChange={(e) => {
                  setUnitTypeFilter(e.target.value);
                  resetPageOnFilter();
                }}
                className="w-full pl-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="">{t('filters.all')}</option>
                {CATALOG_UNIT_TYPES.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            {manufacturers.length > 0 && (
              <div className="w-full sm:w-48">
                <label htmlFor="cce-manufacturer" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('catalog.manufacturer')}
                </label>
                <select
                  id="cce-manufacturer"
                  value={manufacturerFilter}
                  onChange={(e) => {
                    setManufacturerFilter(e.target.value);
                    resetPageOnFilter();
                  }}
                  className="w-full pl-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="">{t('filters.all')}</option>
                  {manufacturers.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          )}
          {hasFilters && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  if (tab === 'cost') {
                    setBuildingClass('');
                    setQualityType('');
                    setMinCost('');
                    setMaxCost('');
                  } else if (tab === 'percent') {
                    setCategory('');
                    setOccupancyFilter('');
                  } else if (tab === 'component') {
                    setMinCost('');
                    setMaxCost('');
                  } else if (tab === 'catalog') {
                    setUnitTypeFilter('');
                    setManufacturerFilter('');
                  }
                  setShowFavoritesOnly(false);
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
          ) : tab === 'catalog' ? (
            catalogRows.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              {hasFilters ? t('table.noSearchResults') : t('table.noDataGeneric')}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      <SortableTh label={t('catalog.manufacturer')} sortKey="manufacturer" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        {t('catalog.type')}
                      </th>
                      <SortableTh label={t('catalog.productModel')} sortKey="product_model" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                      <SortableTh label={t('catalog.price')} sortKey="price" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} align="right" />
                      <SortableTh label={t('catalog.dimensions')} sortKey="floor_area_sqft" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} align="right" />
                      <th
                        className="group relative px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-help"
                        aria-label={t('catalog.leadTimeTooltip')}
                      >
                        {t('catalog.leadTime')}
                        <span
                          className="absolute left-0 top-full z-50 mt-1 px-2 py-1 text-xs font-normal text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-none pointer-events-none whitespace-nowrap"
                          role="tooltip"
                        >
                          {t('catalog.leadTimeTooltip')}
                        </span>
                      </th>
                      <SortableTh label={t('catalog.link')} sortKey="source_page" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} align="right" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {catalogRows.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.manufacturer || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.catalog_section || '-'}</td>
                        <td className="px-4 py-3 text-sm">
                          {row.unit_link ? (
                            <a
                              href={row.unit_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sage-600 dark:text-sage-400 hover:underline font-medium"
                            >
                              {row.product_model || '-'}
                              <ExternalLink className="w-3.5 h-3.5 inline-block ml-1" />
                            </a>
                          ) : row.source_page ? (
                            <a
                              href={`/api/admin/cce-pdf?pdf=walden#page=${row.source_page}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sage-600 dark:text-sage-400 hover:underline"
                            >
                              {row.product_model || '-'}
                              <ExternalLink className="w-3.5 h-3.5 inline-block ml-1" />
                            </a>
                          ) : (
                            row.product_model || '-'
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">{formatCost(row.price)}</td>
                        <td className="px-4 py-3 text-sm text-right">
                          {row.dimensions_ft || row.floor_area_sqft != null ? (
                            <span title={row.dimensions_ft || ''}>
                              {row.floor_area_sqft != null ? `${row.floor_area_sqft} sqft` : row.dimensions_ft}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="group/lt relative px-4 py-3 text-sm text-gray-500 dark:text-gray-400 cursor-help">
                          {row.lead_time_weeks || '-'}
                          <span
                            className="absolute left-0 bottom-full z-50 mb-1 px-2 py-1 text-xs font-normal text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded shadow-sm opacity-0 group-hover/lt:opacity-100 transition-none pointer-events-none whitespace-nowrap"
                            role="tooltip"
                          >
                            {t('catalog.leadTimeTooltip')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          {row.source_page ? (
                            <a
                              href={`/api/admin/cce-pdf?pdf=walden#page=${row.source_page}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sage-600 dark:text-sage-400 hover:underline"
                              title={t('table.viewPdfPage', { page: row.source_page })}
                            >
                              {row.source_page}
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          ) : (
                            '-'
                          )}
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
                    <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))} disabled={page >= pagination.total_pages}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )
          ) : tab === 'component' ? (
            componentRows.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              {hasFilters ? t('table.noSearchResults') : t('table.noDataGeneric')}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      <SortableTh label={t('component.section')} sortKey="section_name" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                      <SortableTh label={t('component.itemName')} sortKey="item_name" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                      <SortableTh label={t('component.lowCost')} sortKey="col_1" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} align="right" />
                      <SortableTh label={t('component.highCost')} sortKey="col_2" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} align="right" />
                      <SortableTh label={t('component.col3')} sortKey="col_3" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} align="right" />
                      <SortableTh label={t('component.col4')} sortKey="col_4" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} align="right" />
                      <SortableTh label={t('table.page')} sortKey="source_page" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} align="right" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {componentRows.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{formatComponentSectionName(row.section_name)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.item_name || '-'}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatCost(row.col_1)}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatCost(row.col_2)}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatCost(row.col_3)}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatCost(row.col_4)}</td>
                        <td className="px-4 py-3 text-sm text-right">
                          {row.source_page ? (
                            <a
                              href={`/api/admin/cce-pdf/March_2026#page=${row.source_page}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sage-600 dark:text-sage-400 hover:underline"
                              title={t('table.viewPdfPage', { page: row.source_page })}
                            >
                              {row.source_page}
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          ) : (
                            '-'
                          )}
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
                    <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))} disabled={page >= pagination.total_pages}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )
          ) : tab === 'percent' ? (
            pctRows.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              {hasFilters ? t('table.noSearchResults') : t('table.noDataGeneric')}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      <SortableTh label="Section" sortKey="section_name" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                      <SortableTh label="Occupancy" sortKey="occupancy" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                      <SortableTh label="Category" sortKey="category" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                      <SortableTh label="Low %" sortKey="low_pct" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} align="right" />
                      <SortableTh label="Median %" sortKey="median_pct" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} align="right" />
                      <SortableTh label="High %" sortKey="high_pct" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} align="right" />
                      <SortableTh label={t('table.page')} sortKey="source_page" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} align="right" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {pctRows.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.section_name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.occupancy}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{row.category.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatPct(row.low_pct)}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{formatPct(row.median_pct)}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatPct(row.high_pct)}</td>
                        <td className="px-4 py-3 text-sm text-right">
                          {row.source_page ? (
                            <a
                              href={`/api/admin/cce-pdf/March_2026#page=${row.source_page}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sage-600 dark:text-sage-400 hover:underline"
                              title={t('table.viewPdfPage', { page: row.source_page })}
                            >
                              {row.source_page}
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          ) : (
                            '-'
                          )}
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
                    <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))} disabled={page >= pagination.total_pages}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )
          ) : rows.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              {hasFilters ? t('table.noSearchResults') : t('table.noDataGeneric')}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-10" />
                      <SortableTh
                        label={t('table.occupancy')}
                        sortKey="occupancy_name"
                        currentSort={sortBy}
                        currentDir={sortDir}
                        onSort={handleSort}
                      />
                      <SortableTh
                        label={t('table.class')}
                        sortKey="building_class"
                        currentSort={sortBy}
                        currentDir={sortDir}
                        onSort={handleSort}
                      />
                      <SortableTh
                        label={t('table.type')}
                        sortKey="quality_type"
                        currentSort={sortBy}
                        currentDir={sortDir}
                        onSort={handleSort}
                      />
                      <SortableTh
                        label={t('table.sqFtCost')}
                        sortKey="cost_sq_ft"
                        currentSort={sortBy}
                        currentDir={sortDir}
                        onSort={handleSort}
                        align="right"
                      />
                      <SortableTh
                        label={t('table.cuFtCost')}
                        sortKey="cost_cu_ft"
                        currentSort={sortBy}
                        currentDir={sortDir}
                        onSort={handleSort}
                        align="right"
                      />
                      <SortableTh
                        label={t('table.sqMCost')}
                        sortKey="cost_sq_m"
                        currentSort={sortBy}
                        currentDir={sortDir}
                        onSort={handleSort}
                        align="right"
                      />
                      <SortableTh
                        label={t('table.page')}
                        sortKey="source_page"
                        currentSort={sortBy}
                        currentDir={sortDir}
                        onSort={handleSort}
                        align="right"
                      />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {rows.map((row) => {
                      const isExpanded = expandedRowIds.has(row.id);
                      const hasExpandContent =
                        (row.exterior_walls && row.exterior_walls.trim()) ||
                        (row.interior_finish && row.interior_finish.trim()) ||
                        (row.lighting_plumbing && row.lighting_plumbing.trim()) ||
                        (row.heat && row.heat.trim());
                      return (
                        <Fragment key={row.id}>
                          <tr
                            key={row.id}
                            onClick={() => hasExpandContent && toggleRowExpand(row.id)}
                            className={`hover:bg-gray-50 dark:hover:bg-gray-800/30 ${
                              hasExpandContent ? 'cursor-pointer' : ''
                            } ${isExpanded ? 'bg-sage-50/50 dark:bg-sage-900/20' : ''}`}
                          >
                            <td className="px-4 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
                              {row.cce_occupancies && (
                                <button
                                  type="button"
                                  onClick={(e) => toggleFavorite(row.id, e)}
                                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                                  title={favorites.includes(row.id) ? t('table.removeFavorite') : t('table.addFavorite')}
                                >
                                  <Star
                                    className={`w-4 h-4 ${
                                      favorites.includes(row.id) ? 'fill-amber-500 text-amber-500' : 'text-gray-400'
                                    }`}
                                  />
                                </button>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                              <span className="inline-flex items-center gap-1">
                                {hasExpandContent && (
                                  <span className="text-gray-400 dark:text-gray-500">
                                    {isExpanded ? (
                                      <ChevronUp className="w-4 h-4" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4" />
                                    )}
                                  </span>
                                )}
                                {row.cce_occupancies
                                  ? `${row.cce_occupancies.occupancy_name} (${row.cce_occupancies.occupancy_code})`
                                  : '-'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                              {row.building_class || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                              {row.quality_type || '-'}
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
                            <td className="px-4 py-3 text-sm text-right">
                              {row.source_page ? (
                                <a
                                  href={`/api/admin/cce-pdf/March_2026#page=${row.source_page}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-sage-600 dark:text-sage-400 hover:underline"
                                  title={t('table.viewPdfPage', { page: row.source_page })}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {row.source_page}
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              ) : (
                                '-'
                              )}
                            </td>
                          </tr>
                          {isExpanded && hasExpandContent && (
                            <tr key={`${row.id}-expand`} className="bg-gray-50/80 dark:bg-gray-800/50">
                              <td colSpan={8} className="px-4 py-3 pl-8 text-sm">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl">
                                  <div>
                                    <p className="font-bold text-gray-700 dark:text-gray-300 mb-1">
                                      {t('table.exteriorWalls')}
                                    </p>
                                    <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-words">
                                      {row.exterior_walls || '-'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="font-bold text-gray-700 dark:text-gray-300 mb-1">
                                      {t('table.interior')}
                                    </p>
                                    <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-words">
                                      {row.interior_finish || '-'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="font-bold text-gray-700 dark:text-gray-300 mb-1">
                                      {t('table.lightingPlumbing')}
                                    </p>
                                    <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-words">
                                      {row.lighting_plumbing || '-'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="font-bold text-gray-700 dark:text-gray-300 mb-1">
                                      {t('table.heat')}
                                    </p>
                                    <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-words">
                                      {row.heat || '-'}
                                    </p>
                                  </div>
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
