'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Save,
  Search,
  X,
} from 'lucide-react';
import { Modal, ModalContent } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

type PropertyRow = Record<string, unknown> & { id: string };
type ExportFormat = 'csv' | 'xlsx';

interface ListResponse {
  success: boolean;
  properties: PropertyRow[];
  total: number;
  page: number;
  pageSize: number;
  sortBy: string;
  sortDir: 'asc' | 'desc';
  error?: string;
}

interface UpdateResponse {
  success: boolean;
  property?: PropertyRow;
  rejected?: string[];
  error?: string;
}

const RESEARCH_STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'published', label: 'Published' },
  { value: 'new', label: 'New' },
  { value: 'rejected', label: 'Rejected' },
] as const;

const MISSING_DATA_OPTIONS = [
  { value: 'all' as const, i18nKey: 'missingAll' as const },
  { value: 'city' as const, i18nKey: 'missingCity' as const },
  { value: 'rates' as const, i18nKey: 'missingRates' as const },
  { value: 'website' as const, i18nKey: 'missingWebsite' as const },
  { value: 'lat_lng' as const, i18nKey: 'missingLatLng' as const },
  { value: 'total_sites' as const, i18nKey: 'missingTotalSites' as const },
];
type MissingDataFilter = (typeof MISSING_DATA_OPTIONS)[number]['value'];

interface QuickColumn {
  key: string;
  label: string;
  width?: string;
  type?: 'text' | 'url';
}

const QUICK_COLUMNS: QuickColumn[] = [
  { key: 'property_name', label: 'Property name', width: 'min-w-[220px]' },
  { key: 'url', label: 'Website', type: 'url', width: 'w-14' },
  { key: 'city', label: 'City', width: 'min-w-[140px]' },
  { key: 'state', label: 'State', width: 'w-20' },
  { key: 'country', label: 'Country', width: 'w-24' },
  { key: 'research_status', label: 'Status', width: 'w-32' },
  { key: 'is_glamping_property', label: 'Glamping?', width: 'w-24' },
  { key: 'is_open', label: 'Open?', width: 'w-20' },
  { key: 'property_type', label: 'Type', width: 'min-w-[160px]' },
  { key: 'discovery_source', label: 'Source', width: 'min-w-[160px]' },
  { key: 'date_updated', label: 'Updated', width: 'w-28' },
];

interface FieldGroup {
  title: string;
  fields: { key: string; type?: 'textarea' | 'select'; options?: string[] }[];
}

const EDIT_FIELD_GROUPS: FieldGroup[] = [
  {
    title: 'Core',
    fields: [
      { key: 'property_name' },
      { key: 'site_name' },
      { key: 'slug' },
      { key: 'property_type' },
      {
        key: 'research_status',
        type: 'select',
        options: ['in_progress', 'published', 'new', 'rejected'],
      },
      { key: 'is_glamping_property', type: 'select', options: ['Yes', 'No'] },
      { key: 'is_open', type: 'select', options: ['Yes', 'No'] },
      { key: 'source' },
      { key: 'discovery_source' },
    ],
  },
  {
    title: 'Location',
    fields: [
      { key: 'address' },
      { key: 'city' },
      { key: 'state' },
      { key: 'zip_code' },
      { key: 'country' },
      { key: 'lat' },
      { key: 'lon' },
    ],
  },
  {
    title: 'Contact & Description',
    fields: [
      { key: 'url' },
      { key: 'phone_number' },
      { key: 'description', type: 'textarea' },
      { key: 'notes', type: 'textarea' },
    ],
  },
  {
    title: 'Operational',
    fields: [
      { key: 'property_total_sites' },
      { key: 'quantity_of_units' },
      { key: 'year_site_opened' },
      { key: 'operating_season_months' },
      { key: 'number_of_locations' },
      { key: 'minimum_nights' },
    ],
  },
  {
    title: 'Unit',
    fields: [
      { key: 'unit_type' },
      { key: 'unit_capacity' },
      { key: 'unit_sq_ft' },
      { key: 'unit_description', type: 'textarea' },
      { key: 'unit_bed' },
      { key: 'unit_private_bathroom' },
      { key: 'unit_wifi' },
      { key: 'unit_pets' },
      { key: 'unit_air_conditioning' },
      { key: 'unit_full_kitchen' },
      { key: 'unit_kitchenette' },
      { key: 'unit_hot_tub' },
      { key: 'unit_ada_accessibility' },
    ],
  },
  {
    title: 'Rates',
    fields: [
      { key: 'rate_avg_retail_daily_rate' },
      { key: 'rate_winter_weekday' },
      { key: 'rate_winter_weekend' },
      { key: 'rate_spring_weekday' },
      { key: 'rate_spring_weekend' },
      { key: 'rate_summer_weekday' },
      { key: 'rate_summer_weekend' },
      { key: 'rate_fall_weekday' },
      { key: 'rate_fall_weekend' },
      { key: 'rate_category' },
    ],
  },
  {
    title: 'Source & Tracking',
    fields: [
      { key: 'date_added' },
      { key: 'date_updated' },
      { key: 'roverpass_campground_id' },
    ],
  },
];

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function humanizeKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function filenameFromContentDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const match = header.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  return match?.[1] ? decodeURIComponent(match[1]) : fallback;
}

function glampingYesNoPillClasses(raw: string): string {
  const v = raw.trim().toLowerCase();
  if (v === 'yes') {
    return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/45 dark:text-emerald-100';
  }
  if (v === 'no') {
    return 'bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100';
  }
  return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
}

/** Normalize status for matching (DB uses snake_case). */
function normalizeResearchStatusKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '_');
}

const RESEARCH_STATUS_DISPLAY: Record<string, string> = {
  in_progress: 'In-progress',
  published: 'Published',
  new: 'New',
  rejected: 'Rejected',
};

function formatResearchStatusLabel(raw: string): string {
  const k = normalizeResearchStatusKey(raw);
  if (RESEARCH_STATUS_DISPLAY[k]) return RESEARCH_STATUS_DISPLAY[k];
  if (!k) return raw;
  return k
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function researchStatusPillClasses(raw: string): string {
  switch (normalizeResearchStatusKey(raw)) {
    case 'in_progress':
      return 'bg-amber-100 text-amber-950 dark:bg-amber-900/50 dark:text-amber-100';
    case 'published':
      return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/45 dark:text-emerald-100';
    case 'new':
      return 'bg-violet-100 text-violet-900 dark:bg-violet-900/45 dark:text-violet-100';
    case 'rejected':
      return 'bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  }
}

function TableCellReadOnly({ value, column }: { value: unknown; column: QuickColumn }) {
  const t = useTranslations('admin.sageData');
  const displayValue = formatCellValue(value);
  const isEmpty = displayValue === '';
  const isUrl = column.type === 'url' && !isEmpty;
  const isYesNoPill =
    (column.key === 'is_glamping_property' || column.key === 'is_open') && !isEmpty;
  const isResearchStatusPill = column.key === 'research_status' && !isEmpty;

  return (
    <div
      className={`px-1 py-0.5 min-w-0${isEmpty && column.type === 'url' ? ' text-center' : ''}`}
    >
      {isEmpty ? (
        <span className="text-gray-400 dark:text-gray-500" aria-label="No value">
          —
        </span>
      ) : isUrl ? (
        <a
          href={displayValue}
          target="_blank"
          rel="noopener noreferrer"
          title={displayValue}
          className="inline-flex items-center justify-center rounded p-1.5 text-sage-600 hover:text-sage-800 hover:bg-sage-50 dark:text-sage-400 dark:hover:text-sage-200 dark:hover:bg-sage-900/30 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:ring-offset-1"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          aria-label={t('openWebsiteNewTab')}
        >
          <ExternalLink className="w-4 h-4 shrink-0" aria-hidden />
        </a>
      ) : isResearchStatusPill ? (
        <span
          className={`inline-flex max-w-full items-center truncate rounded-full px-2 py-0.5 text-xs font-medium ${researchStatusPillClasses(displayValue)}`}
        >
          {formatResearchStatusLabel(displayValue)}
        </span>
      ) : isYesNoPill ? (
        <span
          className={`inline-flex max-w-full items-center truncate rounded-full px-2 py-0.5 text-xs font-medium ${glampingYesNoPillClasses(displayValue)}`}
        >
          {displayValue}
        </span>
      ) : (
        <span className="block truncate text-gray-800 dark:text-gray-200">{displayValue}</span>
      )}
    </div>
  );
}

interface EditModalProps {
  open: boolean;
  property: PropertyRow | null;
  onClose: () => void;
  onSaved: (updated: PropertyRow) => void;
}

function EditModal({ open, property, onClose, onSaved }: EditModalProps) {
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!property) return;
    const initial: Record<string, string> = {};
    for (const group of EDIT_FIELD_GROUPS) {
      for (const field of group.fields) {
        initial[field.key] = formatCellValue(property[field.key]);
      }
    }
    setDraft(initial);
    setError(null);
  }, [property]);

  if (!property) return null;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updates: Record<string, string | null> = {};
      for (const [key, raw] of Object.entries(draft)) {
        const original = formatCellValue(property[key]);
        if (raw === original) continue;
        updates[key] = raw.trim() === '' ? null : raw;
      }
      if (Object.keys(updates).length === 0) {
        onClose();
        return;
      }

      const res = await fetch('/api/admin/sage-glamping-data/properties', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: String(property.id), updates }),
      });
      const json = (await res.json()) as UpdateResponse;
      if (!res.ok || !json.success || !json.property) {
        throw new Error(json.error || 'Failed to save changes');
      }
      onSaved(json.property);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={saving ? () => undefined : onClose} className="max-w-3xl">
      <ModalContent className="max-h-[85vh] flex flex-col">
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Edit property
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {String(property.property_name ?? 'Untitled property')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
            aria-label="Close edit dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          {EDIT_FIELD_GROUPS.map((group) => (
            <section key={group.title}>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                {group.title}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {group.fields.map((field) => {
                  const id = `edit-${field.key}`;
                  const value = draft[field.key] ?? '';
                  const inputClasses =
                    'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-sage-600 focus:border-transparent focus:outline-none disabled:opacity-50';
                  const colSpan = field.type === 'textarea' ? 'md:col-span-2' : '';
                  return (
                    <div key={field.key} className={colSpan}>
                      <label
                        htmlFor={id}
                        className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
                      >
                        {humanizeKey(field.key)}
                        <span className="ml-1 font-mono text-[10px] text-gray-400 dark:text-gray-500">
                          {field.key}
                        </span>
                      </label>
                      {field.type === 'textarea' ? (
                        <textarea
                          id={id}
                          value={value}
                          disabled={saving}
                          onChange={(e) =>
                            setDraft((prev) => ({ ...prev, [field.key]: e.target.value }))
                          }
                          rows={4}
                          className={inputClasses}
                        />
                      ) : field.type === 'select' ? (
                        <select
                          id={id}
                          value={value}
                          disabled={saving}
                          onChange={(e) =>
                            setDraft((prev) => ({ ...prev, [field.key]: e.target.value }))
                          }
                          className={inputClasses}
                        >
                          <option value=""></option>
                          {field.options?.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id={id}
                          type="text"
                          value={value}
                          disabled={saving}
                          onChange={(e) =>
                            setDraft((prev) => ({ ...prev, [field.key]: e.target.value }))
                          }
                          className={inputClasses}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-lg">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            <span className="inline-flex items-center gap-1.5">
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : 'Save changes'}
            </span>
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}

export default function AdminGlampingPropertiesTable() {
  const t = useTranslations('admin.sageData');
  const [rows, setRows] = useState<PropertyRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  /** `null` = list not loaded yet */
  const [countryNames, setCountryNames] = useState<string[] | null>(null);
  const [missingDataFilter, setMissingDataFilter] = useState<MissingDataFilter>('all');
  const [sortBy, setSortBy] = useState<string>('date_updated');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [editingProperty, setEditingProperty] = useState<PropertyRow | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const loadProperties = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        sortBy,
        sortDir,
      });
      if (search) params.set('q', search);
      if (statusFilter !== 'all') params.set('research_status', statusFilter);
      if (countryFilter !== 'all') params.set('country', countryFilter);
      if (missingDataFilter !== 'all') {
        params.set('missing', missingDataFilter);
      }

      const res = await fetch(
        `/api/admin/sage-glamping-data/properties?${params.toString()}`
      );
      const json = (await res.json()) as ListResponse;
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load properties');
      }
      setRows(json.properties);
      setTotal(json.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load properties');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter, countryFilter, missingDataFilter, sortBy, sortDir]);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  useEffect(() => {
    if (!toastMessage) return undefined;
    const timer = window.setTimeout(() => setToastMessage(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/sage-glamping-data/glamping-countries');
        const json = (await res.json()) as { success?: boolean; countries?: string[] };
        if (cancelled) return;
        if (res.ok && json.success && Array.isArray(json.countries)) {
          setCountryNames(json.countries);
        } else {
          setCountryNames([]);
        }
      } catch {
        if (!cancelled) setCountryNames([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const countrySelectOptions = useMemo(() => {
    const allLabel = t('countryAll');
    const names = countryNames ?? [];
    const opts: { value: string; label: string }[] = [
      { value: 'all', label: allLabel },
      ...names.map((c) => ({ value: c, label: c })),
    ];
    if (
      countryFilter !== 'all' &&
      !opts.some((o) => o.value === countryFilter)
    ) {
      opts.push({ value: countryFilter, label: countryFilter });
    }
    return opts;
  }, [countryNames, countryFilter, t]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleStatusChange = (value: string) => {
    setPage(1);
    setStatusFilter(value);
  };

  const handleCountryChange = (value: string) => {
    setPage(1);
    setCountryFilter(value);
  };

  const handleMissingDataChange = (value: string) => {
    setPage(1);
    if (
      value === 'all' ||
      value === 'city' ||
      value === 'rates' ||
      value === 'website' ||
      value === 'lat_lng' ||
      value === 'total_sites'
    ) {
      setMissingDataFilter(value);
    } else {
      setMissingDataFilter('all');
    }
  };

  const handleSortHeader = (columnKey: string) => {
    setPage(1);
    if (sortBy === columnKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(columnKey);
      setSortDir(
        columnKey === 'date_updated' || columnKey === 'date_added' ? 'desc' : 'asc'
      );
    }
  };

  const handleExport = async (format: ExportFormat) => {
    setExportingFormat(format);
    setError(null);
    setToastMessage(t('exportPreparing'));
    try {
      const res = await fetch(`/api/admin/sage-glamping-data/export?format=${format}`);
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(json?.error || t('exportError'));
      }

      const blob = await res.blob();
      const filename = filenameFromContentDisposition(
        res.headers.get('Content-Disposition'),
        `glamping-and-roverpass-unified.${format}`
      );
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setToastMessage(t('exportDownloaded', { format: format.toUpperCase() }));
    } catch (err) {
      setToastMessage(null);
      setError(err instanceof Error ? err.message : t('exportError'));
    } finally {
      setExportingFormat(null);
    }
  };

  const headerCellClass =
    'text-left bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700';
  const sortHeaderButtonClass =
    'flex w-full min-w-0 items-center justify-between gap-1 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700/60 dark:hover:text-white transition-colors';
  const bodyCellClass = 'px-3 py-2 text-sm align-top border-b border-gray-100 dark:border-gray-800';

  const summary = useMemo(() => {
    if (total === 0) return '0 properties';
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    return `${start.toLocaleString()}–${end.toLocaleString()} of ${total.toLocaleString()}`;
  }, [total, page, pageSize]);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50/80 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/70 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {t('controlsHeading')}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {t('controlsDescription')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleExport('csv')}
              disabled={exportingFormat !== null}
              aria-label={t('exportCsvAria')}
              className="bg-white dark:bg-gray-800"
            >
              <span className="inline-flex items-center gap-1.5">
                <Download className="w-4 h-4" aria-hidden />
                {exportingFormat === 'csv' ? t('exportingCsv') : t('exportCsv')}
              </span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleExport('xlsx')}
              disabled={exportingFormat !== null}
              aria-label={t('exportXlsxAria')}
              className="bg-white dark:bg-gray-800"
            >
              <span className="inline-flex items-center gap-1.5">
                <Download className="w-4 h-4" aria-hidden />
                {exportingFormat === 'xlsx' ? t('exportingXlsx') : t('exportXlsx')}
              </span>
            </Button>
          </div>
        </div>

        <form
          onSubmit={handleSearchSubmit}
          className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-[minmax(18rem,1.4fr)_auto_minmax(10rem,1fr)_minmax(10rem,1fr)_minmax(12rem,1fr)] xl:items-end"
        >
          <div className="space-y-1.5">
            <label
              htmlFor="sage-data-search"
              className="text-xs font-medium text-gray-600 dark:text-gray-300"
            >
              {t('searchLabel')}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="sage-data-search"
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sage-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
          </div>

          <div className="flex items-end gap-2">
            <Button type="submit" variant="primary" size="sm" className="h-10">
              {t('searchButton')}
            </Button>
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setSearch('');
                  setPage(1);
                }}
                className="h-10 rounded-lg px-2 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700/60 dark:hover:text-gray-200"
              >
                {t('clearSearch')}
              </button>
            )}
          </div>

          <label className="space-y-1.5 text-xs font-medium text-gray-600 dark:text-gray-300">
            <span>{t('statusLabel')}</span>
            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm font-normal text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            >
              {RESEARCH_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label
            className="space-y-1.5 text-xs font-medium text-gray-600 dark:text-gray-300"
            htmlFor="sage-data-country-filter"
          >
            <span>{t('countryLabel')}</span>
            <select
              id="sage-data-country-filter"
              value={countryFilter}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm font-normal text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              aria-busy={countryNames === null}
              aria-label={t('countryLabel')}
              title={
                countryNames === null
                  ? t('countriesLoading')
                  : countryNames.length === 0
                    ? t('countriesFromDataEmpty')
                    : undefined
              }
            >
              {countrySelectOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label
            className="space-y-1.5 text-xs font-medium text-gray-600 dark:text-gray-300"
            htmlFor="sage-data-missing-filter"
          >
            <span>{t('missingDataLabel')}</span>
            <select
              id="sage-data-missing-filter"
              value={missingDataFilter}
              onChange={(e) => handleMissingDataChange(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm font-normal text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              aria-label={t('missingDataAria')}
            >
              {MISSING_DATA_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(opt.i18nKey)}
                </option>
              ))}
            </select>
          </label>
        </form>

        {missingDataFilter === 'rates' && (
          <p className="mt-2 text-xs text-amber-800 dark:text-amber-200/90 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 rounded-md px-3 py-2">
            {t('missingRatesHint')}
          </p>
        )}

        {missingDataFilter === 'lat_lng' && (
          <p className="mt-2 text-xs text-amber-800 dark:text-amber-200/90 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 rounded-md px-3 py-2">
            {t('missingLatLngHint')}
          </p>
        )}

        {missingDataFilter === 'total_sites' && (
          <p className="mt-2 text-xs text-amber-800 dark:text-amber-200/90 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 rounded-md px-3 py-2">
            {t('missingTotalSitesHint')}
          </p>
        )}

        <div className="flex items-center justify-between px-4 pb-4 text-xs text-gray-500 dark:text-gray-400">
          <span>{summary}</span>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr>
                {QUICK_COLUMNS.map((col) => {
                  const active = sortBy === col.key;
                  const sortLabel =
                    active && sortDir === 'asc'
                      ? t('sortAscending')
                      : active && sortDir === 'desc'
                        ? t('sortDescending')
                        : '';
                  return (
                    <th
                      key={col.key}
                      scope="col"
                      className={`${headerCellClass} ${col.width ?? ''} align-bottom`}
                      aria-sort={
                        active
                          ? sortDir === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : undefined
                      }
                    >
                      <button
                        type="button"
                        onClick={() => handleSortHeader(col.key)}
                        className={sortHeaderButtonClass}
                        aria-label={
                          sortLabel
                            ? `${t('sortByColumn', { column: col.label })} — ${sortLabel}`
                            : t('sortByColumn', { column: col.label })
                        }
                      >
                        <span className="truncate">{col.label}</span>
                        {active ? (
                          sortDir === 'asc' ? (
                            <ArrowUp
                              className="w-3.5 h-3.5 shrink-0 text-sage-600 dark:text-sage-400"
                              aria-hidden
                            />
                          ) : (
                            <ArrowDown
                              className="w-3.5 h-3.5 shrink-0 text-sage-600 dark:text-sage-400"
                              aria-hidden
                            />
                          )
                        ) : (
                          <span
                            className="flex shrink-0 flex-col text-gray-300 dark:text-gray-600"
                            aria-hidden
                          >
                            <ArrowUp className="w-2.5 h-2.5 -mb-0.5" />
                            <ArrowDown className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`skel-${i}`}>
                    {QUICK_COLUMNS.map((col) => (
                      <td key={col.key} className={bodyCellClass}>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={QUICK_COLUMNS.length}
                    className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No properties match the current filters.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const nameLabel = formatCellValue(row.property_name) || 'property';
                  return (
                    <tr
                      key={row.id}
                      tabIndex={0}
                      className="hover:bg-sage-50/80 dark:hover:bg-sage-900/20 cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-sage-500"
                      onClick={() => setEditingProperty(row)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setEditingProperty(row);
                        }
                      }}
                      aria-label={`Open editor for ${nameLabel}`}
                    >
                      {QUICK_COLUMNS.map((col) => (
                        <td key={col.key} className={`${bodyCellClass} ${col.width ?? ''}`}>
                          <TableCellReadOnly value={row[col.key]} column={col} />
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Page {page} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
            >
              <span className="inline-flex items-center gap-1">
                <ChevronLeft className="w-4 h-4" />
                Previous
              </span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
            >
              <span className="inline-flex items-center gap-1">
                Next
                <ChevronRight className="w-4 h-4" />
              </span>
            </Button>
          </div>
        </div>
      </div>

      <EditModal
        open={editingProperty !== null}
        property={editingProperty}
        onClose={() => setEditingProperty(null)}
        onSaved={(updated) => {
          setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
          setToastMessage(t('toastSaveSuccess'));
        }}
      />

      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg animate-in fade-in slide-in-from-bottom-4 dark:bg-gray-100 dark:text-gray-900"
        >
          <CheckCircle className="h-4 w-4 text-emerald-300 dark:text-emerald-700" aria-hidden />
          {toastMessage}
        </div>
      )}
    </div>
  );
}
