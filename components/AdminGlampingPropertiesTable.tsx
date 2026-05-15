'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Modal, ModalContent } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { GlampingPropertyImagesPanel } from '@/components/admin/GlampingPropertyImagesPanel';

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

interface DeleteResponse {
  success: boolean;
  error?: string;
  deletedIds?: string[];
}

const RESEARCH_STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'in_progress', label: 'In-progress' },
  { value: 'published', label: 'Published' },
  { value: 'new', label: 'New' },
  { value: 'rejected', label: 'Rejected' },
] as const;

const RESEARCH_STATUS_EDIT_OPTIONS = RESEARCH_STATUS_OPTIONS.filter((o) => o.value !== 'all');

const LAND_OPERATOR_BULK_VALUES = [
  'private_commercial',
  'state_park',
  'federal_public',
  'other_public',
] as const;

/** PATCH: clear tenure (null in DB). Distinct from "no change" empty string. */
const BULK_TENURE_UNSET = '__unset__';

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
  /** When set, header uses `t(labelKey)` instead of `label`. */
  labelKey?: string;
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
  {
    key: 'land_operator_category',
    label: 'Tenure',
    labelKey: 'landOperatorColumn',
    width: 'min-w-[140px]',
  },
  { key: 'discovery_source', label: 'Source', width: 'min-w-[160px]' },
  { key: 'date_updated', label: 'Updated', width: 'w-28' },
];

interface FieldGroup {
  title: string;
  fields: {
    key: string;
    type?: 'textarea' | 'select';
    options?: string[];
    /** Use `admin.sageData.landOperator.*` labels for select options. */
    landOperatorSelect?: boolean;
    /** Canonical property types; labels from `admin.sageData.propertyType.*`. */
    propertyTypeSelect?: boolean;
  }[];
}

/** Stored `property_type` values for the Core modal (unknown / legacy → "Unknown"). */
const PROPERTY_TYPE_FORM_OPTIONS = [
  { value: 'Unknown', msg: 'unknown' as const },
  { value: 'Glamping', msg: 'glamping' as const },
  { value: 'RV Resort', msg: 'rvResort' as const },
  { value: 'Campground', msg: 'campground' as const },
  { value: 'Landscape Hotel', msg: 'landscapeHotel' as const },
  { value: 'Marina', msg: 'marina' as const },
] as const;

const PROPERTY_TYPE_ALLOWED = new Set<string>(
  PROPERTY_TYPE_FORM_OPTIONS.map((o) => o.value)
);

function normalizePropertyTypeForForm(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed === '' || !PROPERTY_TYPE_ALLOWED.has(trimmed)) {
    return 'Unknown';
  }
  return trimmed;
}

function applyPropertyTypeSelectNormalization(
  shared: Record<string, string>
): Record<string, string> {
  return {
    ...shared,
    property_type: normalizePropertyTypeForForm(shared.property_type ?? ''),
  };
}

/** Property-level sections (applied to every sibling row on save). */
const SHARED_EDIT_FIELD_GROUPS: FieldGroup[] = [
  {
    title: 'Core',
    fields: [
      { key: 'property_name' },
      { key: 'slug' },
      { key: 'property_type', type: 'select', propertyTypeSelect: true },
      {
        key: 'land_operator_category',
        type: 'select',
        options: [
          'private_commercial',
          'state_park',
          'federal_public',
          'other_public',
        ],
        landOperatorSelect: true,
      },
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
      { key: 'operating_season_months' },
      { key: 'number_of_locations' },
      { key: 'minimum_nights' },
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

/** Per-site / per-row sections (one collapsible card per `all_glamping_properties` row). */
const SITE_FIELD_GROUPS: FieldGroup[] = [
  {
    title: 'Site',
    fields: [
      { key: 'site_name' },
      { key: 'quantity_of_units' },
      { key: 'year_site_opened' },
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
      { key: 'rate_unit_rates_by_year', type: 'textarea' },
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
];

function fieldKeysFromGroups(groups: FieldGroup[]): string[] {
  const keys: string[] = [];
  for (const g of groups) {
    for (const f of g.fields) {
      keys.push(f.key);
    }
  }
  return keys;
}

const SHARED_FIELD_KEYS = fieldKeysFromGroups(SHARED_EDIT_FIELD_GROUPS);
const SITE_FIELD_KEYS = fieldKeysFromGroups(SITE_FIELD_GROUPS);

function emptySiteDraft(): Record<string, string> {
  const d: Record<string, string> = {};
  for (const k of SITE_FIELD_KEYS) {
    d[k] = '';
  }
  return d;
}

/** Fields that must be filled before creating a row (validated client + API). */
const REQUIRED_FIELDS_CREATE = new Set([
  'property_name',
  'city',
  'state',
  'url',
]);

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function propertyTypeRawFromAnchorRow(
  rows: PropertyRow[],
  anchorPropertyId: string
): string {
  const anchorId = String(anchorPropertyId).trim();
  const anchorRow = rows.find((r) => String(r.id) === anchorId) ?? rows[0];
  return formatCellValue(anchorRow.property_type);
}

function pickRowFields(row: PropertyRow, keys: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of keys) {
    out[k] = formatCellValue(row[k]);
  }
  return out;
}

/** Shared columns must match across siblings; baseline for edits should follow the row the user opened. */
function pickSharedFieldsForAnchorRow(
  rows: PropertyRow[],
  anchorPropertyId: string
): Record<string, string> {
  const anchorId = String(anchorPropertyId).trim();
  const anchorRow = rows.find((r) => String(r.id) === anchorId) ?? rows[0];
  return pickRowFields(anchorRow, SHARED_FIELD_KEYS);
}

function mergeSharedAndSiteDrafts(
  shared: Record<string, string>,
  site: Record<string, string>
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(shared)) {
    payload[key] = raw.trim() === '' ? null : raw.trim();
  }
  for (const [key, raw] of Object.entries(site)) {
    payload[key] = raw.trim() === '' ? null : raw.trim();
  }
  return payload;
}

function initEmptySharedDraftForCreate(): Record<string, string> {
  const d: Record<string, string> = {};
  for (const g of SHARED_EDIT_FIELD_GROUPS) {
    for (const f of g.fields) {
      d[f.key] = '';
    }
  }
  d.research_status = 'in_progress';
  d.is_glamping_property = 'Yes';
  d.is_open = 'Yes';
  d.source = 'Sage';
  d.property_type = 'Unknown';
  return d;
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

/** Browser tooltips truncate unpredictably; keep native `title` readable. */
function truncateForNativeTitle(text: string, maxChars = 900): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, maxChars)}…`;
}

function TableCellReadOnly({
  value,
  column,
  row,
  onOpenStatusNote,
}: {
  value: unknown;
  column: QuickColumn;
  row?: PropertyRow;
  onOpenStatusNote: (payload: { propertyName: string; notes: string }) => void;
}) {
  const t = useTranslations('admin.sageData');
  const displayValue = formatCellValue(value);
  const isPropertyTypeCol = column.key === 'property_type';
  const propertyTypeNormalized = isPropertyTypeCol
    ? normalizePropertyTypeForForm(displayValue)
    : '';
  const propertyTypeOpt = isPropertyTypeCol
    ? PROPERTY_TYPE_FORM_OPTIONS.find((o) => o.value === propertyTypeNormalized)
    : undefined;
  const isEmpty = !isPropertyTypeCol && displayValue === '';
  const cellPlainText =
    isPropertyTypeCol && propertyTypeOpt
      ? t(`propertyType.${propertyTypeOpt.msg}` as never)
      : column.key === 'land_operator_category' &&
          (displayValue === 'private_commercial' ||
            displayValue === 'state_park' ||
            displayValue === 'federal_public' ||
            displayValue === 'other_public')
        ? t(
            `landOperator.${displayValue}` as
              | 'landOperator.private_commercial'
              | 'landOperator.state_park'
              | 'landOperator.federal_public'
              | 'landOperator.other_public',
          )
        : displayValue;
  const isUrl = column.type === 'url' && !isEmpty;
  const isYesNoPill =
    (column.key === 'is_glamping_property' || column.key === 'is_open') && !isEmpty;
  const isResearchStatusPill = column.key === 'research_status' && !isEmpty;
  const notesText =
    column.key === 'research_status' && row
      ? formatCellValue(row.notes).trim()
      : '';
  const statusHoverTitle =
    column.key === 'research_status'
      ? notesText.length > 0
        ? truncateForNativeTitle(notesText)
        : t('statusNoteHoverEmpty')
      : undefined;

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
        <button
          type="button"
          title={statusHoverTitle}
          className={`inline-flex max-w-full min-w-0 cursor-pointer items-center truncate rounded-full px-2 py-0.5 text-left text-xs font-medium transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-gray-900 ${researchStatusPillClasses(displayValue)}`}
          aria-label={t('statusNoteShowAria', {
            status: formatResearchStatusLabel(displayValue),
          })}
          onClick={(e) => {
            e.stopPropagation();
            onOpenStatusNote({
              propertyName:
                row && formatCellValue(row.property_name).trim()
                  ? formatCellValue(row.property_name)
                  : t('statusNoteUntitledProperty'),
              notes: notesText,
            });
          }}
        >
          <span className="truncate">{formatResearchStatusLabel(displayValue)}</span>
        </button>
      ) : isYesNoPill ? (
        <span
          className={`inline-flex max-w-full items-center truncate rounded-full px-2 py-0.5 text-xs font-medium ${glampingYesNoPillClasses(displayValue)}`}
        >
          {displayValue}
        </span>
      ) : (
        <span className="block truncate text-gray-800 dark:text-gray-200">{cellPlainText}</span>
      )}
    </div>
  );
}

interface SiteEntry {
  clientKey: string;
  dbId?: string;
  draft: Record<string, string>;
}

interface SiblingListResponse {
  success: boolean;
  rows?: PropertyRow[];
  error?: string;
}

interface EditModalProps {
  open: boolean;
  mode: 'edit' | 'create';
  property: PropertyRow | null;
  onClose: () => void;
  onSaved: (meta?: { created?: boolean }) => void;
  onDeleted: (ids: string[]) => void;
}

function EditModal({
  open,
  mode,
  property,
  onClose,
  onSaved,
  onDeleted,
}: EditModalProps) {
  const t = useTranslations('admin.sageData');
  const [sharedDraft, setSharedDraft] = useState<Record<string, string>>({});
  const [siteEntries, setSiteEntries] = useState<SiteEntry[]>([]);
  const [siblingsLoad, setSiblingsLoad] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    'idle'
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const baselineRef = useRef<{
    shared: Record<string, string>;
    siteByDbId: Record<string, Record<string, string>>;
    /** Raw DB `property_type` on anchor row before modal normalization (for save diff). */
    propertyTypeRawFromDb: string;
  } | null>(null);

  const inputClasses =
    'w-full px-3 py-2 text-sm border border-neutral-300/80 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-sage-600 focus:border-transparent focus:outline-none disabled:opacity-50';

  useEffect(() => {
    if (!open) {
      setSiblingsLoad('idle');
      baselineRef.current = null;
      return;
    }
    if (mode === 'create') {
      setSharedDraft(initEmptySharedDraftForCreate());
      setSiteEntries([
        {
          clientKey: `new-${globalThis.crypto?.randomUUID?.() ?? String(Date.now())}`,
          draft: emptySiteDraft(),
        },
      ]);
      setSiblingsLoad('ready');
      setError(null);
      baselineRef.current = null;
      return;
    }
    if (!property) return;

    const controller = new AbortController();
    setSiblingsLoad('loading');
    setError(null);

    (async () => {
      try {
        const res = await fetch(
          `/api/admin/sage-glamping-data/properties?siblingOf=${encodeURIComponent(String(property.id))}`,
          { signal: controller.signal, cache: 'no-store' }
        );
        const json = (await res.json()) as SiblingListResponse;
        if (!res.ok || !json.success || !Array.isArray(json.rows)) {
          throw new Error(json.error || t('siblingsLoadError'));
        }
        const rows = json.rows.map((r) => ({ ...r, id: String(r.id) })) as PropertyRow[];
        if (rows.length === 0) {
          throw new Error(t('siblingsLoadError'));
        }
        const shared = applyPropertyTypeSelectNormalization(
          pickSharedFieldsForAnchorRow(rows, String(property.id))
        );
        const propertyTypeRawFromDb = propertyTypeRawFromAnchorRow(
          rows,
          String(property.id)
        );
        const siteByDbId: Record<string, Record<string, string>> = {};
        const entries: SiteEntry[] = rows.map((r) => {
          const id = String(r.id);
          const siteDraft = pickRowFields(r, SITE_FIELD_KEYS);
          siteByDbId[id] = siteDraft;
          return {
            clientKey: `db-${id}`,
            dbId: id,
            draft: siteDraft,
          };
        });
        baselineRef.current = {
          shared: { ...shared },
          siteByDbId,
          propertyTypeRawFromDb,
        };
        setSharedDraft(shared);
        setSiteEntries(entries);
        setSiblingsLoad('ready');
      } catch (err) {
        if (controller.signal.aborted) return;
        setSiblingsLoad('error');
        setError(err instanceof Error ? err.message : t('siblingsLoadError'));
        setSharedDraft({});
        setSiteEntries([]);
      }
    })();

    return () => controller.abort();
  }, [open, mode, property?.id, t]);

  if (!open) return null;
  if (mode === 'edit' && !property) return null;

  const busy = saving || deleting || removingKey !== null;
  const editBlocked = mode === 'edit' && siblingsLoad !== 'ready';

  const groupRowIdsFromServer = (): string[] => {
    if (!baselineRef.current) return [];
    return Object.keys(baselineRef.current.siteByDbId);
  };

  const handleDeleteGroup = async () => {
    if (mode !== 'edit' || !property) return;
    setDeleting(true);
    setError(null);
    try {
      const listRes = await fetch(
        `/api/admin/sage-glamping-data/properties?siblingOf=${encodeURIComponent(String(property.id))}`,
        { cache: 'no-store' }
      );
      const listJson = (await listRes.json()) as SiblingListResponse;
      if (!listRes.ok || !listJson.success || !Array.isArray(listJson.rows)) {
        throw new Error(listJson.error || t('siblingsLoadError'));
      }
      const ids = listJson.rows.map((r) => String(r.id));
      if (ids.length === 0) {
        throw new Error(t('siblingsLoadError'));
      }
      const name = String(property.property_name ?? property.id);
      if (!confirm(t('deleteGroupConfirm', { count: ids.length, name }))) {
        return;
      }
      const res = await fetch('/api/admin/sage-glamping-data/properties', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      const json = (await res.json()) as DeleteResponse;
      if (!res.ok || !json.success) {
        throw new Error(json.error || t('deleteError'));
      }
      onDeleted(ids);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('deleteError'));
    } finally {
      setDeleting(false);
    }
  };

  const handleRemoveSite = async (entry: SiteEntry) => {
    if (!entry.dbId) {
      if (!confirm(t('removeNewSiteConfirm'))) return;
      setSiteEntries((prev) => prev.filter((e) => e.clientKey !== entry.clientKey));
      return;
    }
    if (!property) return;
    if (!confirm(t('removeSiteConfirm', { siteName: entry.draft.site_name?.trim() || t('sitesUnnamedShort') }))) {
      return;
    }
    setRemovingKey(entry.clientKey);
    setError(null);
    try {
      const res = await fetch('/api/admin/sage-glamping-data/properties', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entry.dbId }),
      });
      const json = (await res.json()) as DeleteResponse;
      if (!res.ok || !json.success) {
        throw new Error(json.error || t('deleteError'));
      }
      onDeleted([entry.dbId]);

      const listRes = await fetch(
        `/api/admin/sage-glamping-data/properties?siblingOf=${encodeURIComponent(String(property.id))}`,
        { cache: 'no-store' }
      );
      if (listRes.status === 404) {
        onClose();
        return;
      }
      const listJson = (await listRes.json()) as SiblingListResponse;
      if (!listRes.ok || !listJson.success || !Array.isArray(listJson.rows)) {
        onClose();
        return;
      }
      const rows = listJson.rows.map((r) => ({ ...r, id: String(r.id) })) as PropertyRow[];
      if (rows.length === 0) {
        onClose();
        return;
      }
      const shared = applyPropertyTypeSelectNormalization(
        pickSharedFieldsForAnchorRow(rows, String(property.id))
      );
      const propertyTypeRawFromDb = propertyTypeRawFromAnchorRow(
        rows,
        String(property.id)
      );
      const siteByDbId: Record<string, Record<string, string>> = {};
      const entries: SiteEntry[] = rows.map((r) => {
        const id = String(r.id);
        const siteDraft = pickRowFields(r, SITE_FIELD_KEYS);
        siteByDbId[id] = siteDraft;
        return {
          clientKey: `db-${id}`,
          dbId: id,
          draft: siteDraft,
        };
      });
      baselineRef.current = {
        shared: { ...shared },
        siteByDbId,
        propertyTypeRawFromDb,
      };
      setSharedDraft(shared);
      setSiteEntries(entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('deleteError'));
    } finally {
      setRemovingKey(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (mode === 'create') {
        for (const key of REQUIRED_FIELDS_CREATE) {
          if (!(sharedDraft[key]?.trim())) {
            setError(t('createRequiredFields'));
            return;
          }
        }
        for (let i = 0; i < siteEntries.length; i++) {
          const payload = mergeSharedAndSiteDrafts(sharedDraft, siteEntries[i].draft);
          const res = await fetch('/api/admin/sage-glamping-data/properties', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const json = (await res.json()) as UpdateResponse;
          if (!res.ok || !json.success || !json.property) {
            throw new Error(json.error || t('createError'));
          }
        }
        onSaved({ created: true });
        onClose();
        return;
      }

      if (!property || !baselineRef.current) return;

      const baseline = baselineRef.current;
      const sharedUpdates: Record<string, string | null> = {};
      for (const key of SHARED_FIELD_KEYS) {
        const raw = sharedDraft[key] ?? '';
        const orig = baseline.shared[key] ?? '';
        if (key === 'property_type') {
          const normDraft = normalizePropertyTypeForForm(raw);
          const normDb = normalizePropertyTypeForForm(baseline.propertyTypeRawFromDb ?? '');
          if (normDraft === normDb) continue;
          sharedUpdates[key] = normDraft;
          continue;
        }
        if (raw === orig) continue;
        sharedUpdates[key] = raw.trim() === '' ? null : raw;
      }

      const rowIds = groupRowIdsFromServer();
      if (Object.keys(sharedUpdates).length > 0) {
        for (const rowId of rowIds) {
          const res = await fetch('/api/admin/sage-glamping-data/properties', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: rowId, updates: sharedUpdates }),
          });
          const json = (await res.json()) as UpdateResponse;
          if (!res.ok || !json.success) {
            throw new Error(json.error || t('saveError'));
          }
        }
      }

      for (const entry of siteEntries) {
        if (!entry.dbId) {
          const payload = mergeSharedAndSiteDrafts(sharedDraft, entry.draft);
          const res = await fetch('/api/admin/sage-glamping-data/properties', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const json = (await res.json()) as UpdateResponse;
          if (!res.ok || !json.success || !json.property) {
            throw new Error(json.error || t('createError'));
          }
          continue;
        }
        const origSite = baseline.siteByDbId[entry.dbId];
        if (!origSite) continue;
        const siteUpdates: Record<string, string | null> = {};
        for (const key of SITE_FIELD_KEYS) {
          const raw = entry.draft[key] ?? '';
          const o = origSite[key] ?? '';
          if (raw === o) continue;
          siteUpdates[key] = raw.trim() === '' ? null : raw;
        }
        if (Object.keys(siteUpdates).length === 0) continue;
        const res = await fetch('/api/admin/sage-glamping-data/properties', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: entry.dbId, updates: siteUpdates }),
        });
        const json = (await res.json()) as UpdateResponse;
        if (!res.ok || !json.success) {
          throw new Error(json.error || t('saveError'));
        }
      }

      const hadAnyChange =
        Object.keys(sharedUpdates).length > 0 ||
        siteEntries.some((e) => {
          if (!e.dbId) return true;
          const origSite = baseline.siteByDbId[e.dbId];
          if (!origSite) return false;
          return SITE_FIELD_KEYS.some((key) => (e.draft[key] ?? '') !== (origSite[key] ?? ''));
        });

      if (hadAnyChange) {
        onSaved();
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('saveError'));
    } finally {
      setSaving(false);
    }
  };

  const subtitle =
    mode === 'create'
      ? t('addPropertySubtitle')
      : String(property?.property_name ?? 'Untitled property');

  const renderSharedField = (field: FieldGroup['fields'][number], groupTitle: string) => {
    const id = `edit-shared-${field.key}`;
    const value = sharedDraft[field.key] ?? '';
    const colSpan = field.type === 'textarea' ? 'md:col-span-2' : '';
    const labelText =
      field.key === 'url'
        ? t('fieldWebsite')
        : field.key === 'land_operator_category'
          ? t('fieldLandOperatorCategory')
          : field.key === 'property_type'
            ? t('fieldPropertyType')
            : humanizeKey(field.key);
    const showRequired = mode === 'create' && REQUIRED_FIELDS_CREATE.has(field.key);
    const disabled = busy || editBlocked;

    return (
      <div key={`${groupTitle}-${field.key}`} className={colSpan}>
        <label
          htmlFor={id}
          className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          {labelText}
          {showRequired ? (
            <span className="text-red-600 dark:text-red-400 ml-0.5" aria-hidden>
              *
            </span>
          ) : null}
          <span className="ml-1 font-mono text-[10px] text-gray-400 dark:text-gray-500">
            {field.key}
          </span>
        </label>
        {field.type === 'textarea' ? (
          <textarea
            id={id}
            value={value}
            disabled={disabled}
            aria-required={showRequired}
            onChange={(e) =>
              setSharedDraft((prev) => ({ ...prev, [field.key]: e.target.value }))
            }
            rows={4}
            className={inputClasses}
          />
        ) : field.type === 'select' ? (
          <select
            id={id}
            value={value}
            disabled={disabled}
            aria-required={showRequired}
            onChange={(e) =>
              setSharedDraft((prev) => ({ ...prev, [field.key]: e.target.value }))
            }
            className={inputClasses}
          >
            {field.propertyTypeSelect ? (
              <>
                {PROPERTY_TYPE_FORM_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {t(`propertyType.${o.msg}` as never)}
                  </option>
                ))}
              </>
            ) : (
              <>
                <option value="">
                  {field.landOperatorSelect ? t('landOperatorUnset') : ''}
                </option>
                {field.options?.map((opt) => (
                  <option key={opt} value={opt}>
                    {field.landOperatorSelect
                      ? t(`landOperator.${opt}` as never)
                      : opt}
                  </option>
                ))}
              </>
            )}
          </select>
        ) : (
          <input
            id={id}
            type="text"
            value={value}
            disabled={disabled}
            aria-required={showRequired}
            autoComplete={field.key === 'url' ? 'url' : undefined}
            onChange={(e) =>
              setSharedDraft((prev) => ({ ...prev, [field.key]: e.target.value }))
            }
            className={inputClasses}
          />
        )}
      </div>
    );
  };

  const renderSiteField = (
    field: FieldGroup['fields'][number],
    entry: SiteEntry,
    groupTitle: string
  ) => {
    const id = `edit-site-${entry.clientKey}-${field.key}`;
    const value = entry.draft[field.key] ?? '';
    const colSpan = field.type === 'textarea' ? 'md:col-span-2' : '';
    const labelText = humanizeKey(field.key);
    const disabled = busy || editBlocked;

    return (
      <div key={`${entry.clientKey}-${groupTitle}-${field.key}`} className={colSpan}>
        <label
          htmlFor={id}
          className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          {labelText}
          <span className="ml-1 font-mono text-[10px] text-gray-400 dark:text-gray-500">
            {field.key}
          </span>
        </label>
        {field.type === 'textarea' ? (
          <textarea
            id={id}
            value={value}
            disabled={disabled}
            onChange={(e) => {
              const v = e.target.value;
              setSiteEntries((prev) =>
                prev.map((s) =>
                  s.clientKey === entry.clientKey
                    ? { ...s, draft: { ...s.draft, [field.key]: v } }
                    : s
                )
              );
            }}
            rows={field.key === 'rate_unit_rates_by_year' ? 6 : 4}
            className={inputClasses}
          />
        ) : (
          <input
            id={id}
            type="text"
            value={value}
            disabled={disabled}
            onChange={(e) => {
              const v = e.target.value;
              setSiteEntries((prev) =>
                prev.map((s) =>
                  s.clientKey === entry.clientKey
                    ? { ...s, draft: { ...s.draft, [field.key]: v } }
                    : s
                )
              );
            }}
            className={inputClasses}
          />
        )}
      </div>
    );
  };

  return (
    <Modal open={open} onClose={busy ? () => undefined : onClose} className="max-w-4xl">
      <ModalContent className="max-h-[85vh] flex flex-col">
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-neutral-200/75 dark:border-neutral-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {mode === 'create' ? t('addPropertyTitle') : t('editPropertyTitle')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
            aria-label={t('modalCloseAria')}
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

          {mode === 'edit' && siblingsLoad === 'loading' ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('siblingsLoading')}</p>
          ) : null}
          {mode === 'edit' && siblingsLoad === 'error' ? (
            <p className="text-sm text-red-600 dark:text-red-400">{t('siblingsLoadError')}</p>
          ) : null}

          {SHARED_EDIT_FIELD_GROUPS.map((group) => (
            <section key={group.title}>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                {group.title}
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {group.fields.map((field) => renderSharedField(field, group.title))}
              </div>
            </section>
          ))}

          {mode === 'edit' && property && siblingsLoad === 'ready' ? (
            <GlampingPropertyImagesPanel propertyId={String(property.id)} disabled={busy} />
          ) : null}

          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {t('sitesSectionTitle')}
              </h3>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={busy || editBlocked}
                onClick={() =>
                  setSiteEntries((prev) => [
                    ...prev,
                    {
                      clientKey: `new-${globalThis.crypto?.randomUUID?.() ?? String(Date.now())}`,
                      draft: emptySiteDraft(),
                    },
                  ])
                }
              >
                <span className="inline-flex items-center gap-1.5">
                  <Plus className="w-4 h-4 shrink-0" aria-hidden />
                  {t('addSite')}
                </span>
              </Button>
            </div>
            <div className="space-y-3">
              {siteEntries.map((entry, idx) => {
                const siteLabel =
                  entry.draft.site_name?.trim() ||
                  t('sitesUnnamed', { index: String(idx + 1) });
                return (
                  <details
                    key={entry.clientKey}
                    className="group rounded-lg border border-neutral-200/90 bg-neutral-50/40 dark:border-neutral-700 dark:bg-neutral-900/30"
                    open={idx === 0}
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-medium text-gray-900 marker:hidden dark:text-gray-100 [&::-webkit-details-marker]:hidden">
                      <span className="min-w-0 truncate">{siteLabel}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="text-xs"
                          disabled={busy || removingKey === entry.clientKey || editBlocked}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            void handleRemoveSite(entry);
                          }}
                        >
                          {removingKey === entry.clientKey
                            ? t('removeSiteWorking')
                            : t('removeSite')}
                        </Button>
                      </span>
                    </summary>
                    <div className="space-y-4 border-t border-neutral-200/80 px-3 py-3 dark:border-neutral-700">
                      {SITE_FIELD_GROUPS.map((sg) => (
                        <div key={sg.title}>
                          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            {sg.title}
                          </h4>
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {sg.fields.map((field) => renderSiteField(field, entry, sg.title))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                );
              })}
            </div>
          </section>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-b-lg border-t border-neutral-200/75 bg-neutral-50/85 px-6 py-3 dark:border-neutral-800 dark:bg-neutral-900/40">
          <div>
            {mode === 'edit' ? (
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => void handleDeleteGroup()}
                disabled={busy || editBlocked}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Trash2 className="w-4 h-4" aria-hidden />
                  {deleting ? t('deleteDeleting') : t('deleteRecord')}
                </span>
              </Button>
            ) : null}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
              {t('modalCancel')}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => void handleSave()}
              disabled={busy || editBlocked}
            >
              <span className="inline-flex items-center gap-1.5">
                <Save className="w-4 h-4" aria-hidden />
                {saving
                  ? mode === 'create'
                    ? t('createSaving')
                    : t('saveWorking')
                  : mode === 'create'
                    ? t('createRecord')
                    : t('saveChanges')}
              </span>
            </Button>
          </div>
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
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
  const [statusNotePreview, setStatusNotePreview] = useState<{
    propertyName: string;
    notes: string;
  } | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkLandOperator, setBulkLandOperator] = useState('');
  const [bulkResearchStatus, setBulkResearchStatus] = useState('');
  const [bulkIsGlamping, setBulkIsGlamping] = useState('');
  const [bulkSource, setBulkSource] = useState('');
  const [bulkApplying, setBulkApplying] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setSelectedIds(new Set());
  }, [search, statusFilter, countryFilter, missingDataFilter]);

  const pageRowIds = useMemo(() => rows.map((r) => String(r.id)), [rows]);
  const selectedOnPageCount = useMemo(
    () => pageRowIds.filter((id) => selectedIds.has(id)).length,
    [pageRowIds, selectedIds]
  );
  const allPageRowsSelected =
    pageRowIds.length > 0 && selectedOnPageCount === pageRowIds.length;

  const toggleSelectAllOnPage = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (pageRowIds.length === 0) return next;
      const allSelected = pageRowIds.every((id) => next.has(id));
      if (allSelected) {
        for (const id of pageRowIds) {
          next.delete(id);
        }
      } else {
        for (const id of pageRowIds) {
          next.add(id);
        }
      }
      return next;
    });
  }, [pageRowIds]);

  const toggleRowSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearBulkSelection = useCallback(() => {
    setSelectedIds(new Set());
    setBulkLandOperator('');
    setBulkResearchStatus('');
    setBulkIsGlamping('');
    setBulkSource('');
  }, []);

  const loadProperties = useCallback(async (overridePage?: number) => {
    const pageToFetch = overridePage ?? page;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(pageToFetch),
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

      const res = await fetch(`/api/admin/sage-glamping-data/properties?${params.toString()}`, {
        signal:
          typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
            ? AbortSignal.timeout(90_000)
            : undefined,
      });
      const json = (await res.json()) as ListResponse;
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load properties');
      }
      setRows(json.properties);
      setTotal(json.total);
    } catch (err) {
      const timedOut =
        err instanceof DOMException &&
        (err.name === 'TimeoutError' || err.name === 'AbortError');
      setError(
        timedOut
          ? t('propertiesLoadTimeout')
          : err instanceof Error
            ? err.message
            : 'Failed to load properties'
      );
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter, countryFilter, missingDataFilter, sortBy, sortDir, t]);

  const handleBulkApply = useCallback(async () => {
    const updates: Record<string, string | null> = {};
    if (bulkLandOperator === BULK_TENURE_UNSET) {
      updates.land_operator_category = null;
    } else if (bulkLandOperator !== '') {
      updates.land_operator_category = bulkLandOperator;
    }
    if (bulkResearchStatus !== '') {
      updates.research_status = bulkResearchStatus;
    }
    if (bulkIsGlamping !== '') {
      updates.is_glamping_property = bulkIsGlamping;
    }
    const sourceTrim = bulkSource.trim();
    if (sourceTrim !== '') {
      updates.source = sourceTrim;
    }
    if (Object.keys(updates).length === 0) {
      setError(t('bulkNothingToApply'));
      return;
    }
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setBulkApplying(true);
    setError(null);
    try {
      for (const id of ids) {
        const res = await fetch('/api/admin/sage-glamping-data/properties', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, updates }),
        });
        const json = (await res.json()) as UpdateResponse;
        if (!res.ok || !json.success) {
          throw new Error(json.error || t('bulkError'));
        }
      }
      clearBulkSelection();
      setToastMessage(t('bulkSuccess', { count: ids.length }));
      void loadProperties();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('bulkError'));
    } finally {
      setBulkApplying(false);
    }
  }, [
    bulkLandOperator,
    bulkResearchStatus,
    bulkIsGlamping,
    bulkSource,
    selectedIds,
    t,
    clearBulkSelection,
    loadProperties,
  ]);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  useEffect(() => {
    if (total <= 0) return;
    const maxPage = Math.max(1, Math.ceil(total / pageSize));
    setPage((p) => (p > maxPage ? maxPage : p));
  }, [total, pageSize]);

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
    'text-left bg-neutral-50/85 dark:bg-neutral-900/45 border-b border-neutral-200/75 dark:border-neutral-800';
  const sortHeaderButtonClass =
    'flex w-full min-w-0 items-center justify-between gap-1 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700/60 dark:hover:text-white transition-colors';
  const bodyCellClass = 'px-3 py-2 text-sm align-top border-b border-neutral-100/85 dark:border-neutral-800';

  const summary = useMemo(() => {
    if (loading) return t('propertiesLoadingSummary');
    if (total === 0) return t('propertiesEmptySummary');
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    return t('propertiesRangeSummary', {
      start: start.toLocaleString(),
      end: end.toLocaleString(),
      total: total.toLocaleString(),
    });
  }, [total, page, pageSize, loading, t]);

  const showBulkBar = selectedIds.size >= 2;
  const bulkControlClass =
    'h-9 min-w-[7.5rem] rounded-lg border border-gray-300 bg-white px-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-600 dark:border-neutral-600 dark:bg-neutral-800 dark:text-gray-100';
  const bulkTextInputClass =
    'h-9 min-w-[8rem] flex-1 rounded-lg border border-gray-300 bg-white px-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-600 dark:border-neutral-600 dark:bg-neutral-800 dark:text-gray-100 sm:max-w-xs';
  const checkboxHeaderClass = `${headerCellClass} w-11 px-2 text-center align-middle`;
  const checkboxCellClass = `${bodyCellClass} w-11 px-2 text-center align-middle`;

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-neutral-200/70 bg-white shadow-sm dark:border-neutral-800 dark:bg-gray-800">
        <div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50/80 px-4 py-3 dark:border-neutral-800 dark:bg-gray-800/70 sm:flex-row sm:items-center sm:justify-between">
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
              variant="primary"
              size="sm"
              onClick={() => {
                setIsCreatingNew(true);
                setEditingProperty(null);
              }}
              disabled={exportingFormat !== null}
              aria-label={t('addRecordAria')}
            >
              <span className="inline-flex items-center gap-1.5">
                <Plus className="w-4 h-4" aria-hidden />
                {t('addRecord')}
              </span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleExport('csv')}
              disabled={exportingFormat !== null}
              aria-label={t('exportCsvAria')}
              className="bg-white dark:bg-neutral-900"
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
              className="bg-white dark:bg-neutral-900"
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
                className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sage-600 dark:border-neutral-700 dark:bg-gray-700 dark:text-gray-100"
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
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm font-normal text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-600 dark:border-neutral-700 dark:bg-gray-700 dark:text-gray-100"
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
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm font-normal text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-600 dark:border-neutral-700 dark:bg-gray-700 dark:text-gray-100"
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
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm font-normal text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-600 dark:border-neutral-700 dark:bg-gray-700 dark:text-gray-100"
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

      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow border border-neutral-200/75 dark:border-neutral-800 overflow-hidden">
        {showBulkBar ? (
          <div className="border-b border-sage-200/80 bg-sage-50/90 px-4 py-3 dark:border-sage-900/50 dark:bg-sage-950/35">
            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {t('bulkBarTitle')}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {t('bulkSelectedCount', { count: selectedIds.size })}
                </p>
              </div>
              <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-gray-700 dark:text-gray-300">
                  <span>
                    {t('fieldLandOperatorCategory')}
                    <span className="ml-1 font-mono text-[10px] font-normal text-gray-400 dark:text-gray-500">
                      land_operator_category
                    </span>
                  </span>
                  <select
                    value={bulkLandOperator}
                    onChange={(e) => setBulkLandOperator(e.target.value)}
                    disabled={bulkApplying}
                    className={bulkControlClass}
                    aria-label={t('fieldLandOperatorCategory')}
                  >
                    <option value="">{t('bulkNoChange')}</option>
                    <option value={BULK_TENURE_UNSET}>{t('landOperatorUnset')}</option>
                    {LAND_OPERATOR_BULK_VALUES.map((v) => (
                      <option key={v} value={v}>
                        {t(`landOperator.${v}` as never)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-gray-700 dark:text-gray-300">
                  <span>
                    {t('fieldResearchStatus')}
                    <span className="ml-1 font-mono text-[10px] font-normal text-gray-400 dark:text-gray-500">
                      research_status
                    </span>
                  </span>
                  <select
                    value={bulkResearchStatus}
                    onChange={(e) => setBulkResearchStatus(e.target.value)}
                    disabled={bulkApplying}
                    className={bulkControlClass}
                    aria-label={t('fieldResearchStatus')}
                  >
                    <option value="">{t('bulkNoChange')}</option>
                    {RESEARCH_STATUS_EDIT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-gray-700 dark:text-gray-300">
                  <span>
                    {t('fieldIsGlampingProperty')}
                    <span className="ml-1 font-mono text-[10px] font-normal text-gray-400 dark:text-gray-500">
                      is_glamping_property
                    </span>
                  </span>
                  <select
                    value={bulkIsGlamping}
                    onChange={(e) => setBulkIsGlamping(e.target.value)}
                    disabled={bulkApplying}
                    className={bulkControlClass}
                    aria-label={t('fieldIsGlampingProperty')}
                  >
                    <option value="">{t('bulkNoChange')}</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </label>
                <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs font-medium text-gray-700 dark:text-gray-300 sm:min-w-[14rem]">
                  <span>
                    {t('fieldSource')}
                    <span className="ml-1 font-mono text-[10px] font-normal text-gray-400 dark:text-gray-500">
                      source
                    </span>
                  </span>
                  <input
                    type="text"
                    value={bulkSource}
                    onChange={(e) => setBulkSource(e.target.value)}
                    disabled={bulkApplying}
                    placeholder={t('bulkNoChange')}
                    className={bulkTextInputClass}
                    aria-label={t('fieldSource')}
                  />
                </label>
                <div className="flex flex-wrap items-center gap-2 pt-1 sm:pt-0">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={bulkApplying}
                    onClick={() => void handleBulkApply()}
                  >
                    {bulkApplying ? t('bulkApplying') : t('bulkApply')}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={bulkApplying}
                    onClick={clearBulkSelection}
                  >
                    {t('bulkClearSelection')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr>
                <th scope="col" className={checkboxHeaderClass}>
                  <input
                    type="checkbox"
                    ref={(el) => {
                      if (el) {
                        el.indeterminate =
                          pageRowIds.length > 0 &&
                          selectedOnPageCount > 0 &&
                          selectedOnPageCount < pageRowIds.length;
                      }
                    }}
                    checked={allPageRowsSelected}
                    onChange={toggleSelectAllOnPage}
                    disabled={loading || rows.length === 0}
                    className="h-4 w-4 rounded border-gray-300 text-sage-600 focus:ring-sage-600 dark:border-neutral-600 dark:bg-neutral-800"
                    aria-label={t('bulkSelectAllPageAria')}
                  />
                </th>
                {QUICK_COLUMNS.map((col) => {
                  const active = sortBy === col.key;
                  const colLabel = col.labelKey ? t(col.labelKey as never) : col.label;
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
                            ? `${t('sortByColumn', { column: colLabel })} — ${sortLabel}`
                            : t('sortByColumn', { column: colLabel })
                        }
                      >
                        <span className="truncate">{colLabel}</span>
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
                    <td className={checkboxCellClass}>
                      <div className="mx-auto h-4 w-4 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                    </td>
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
                    colSpan={QUICK_COLUMNS.length + 1}
                    className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No properties match the current filters.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const nameLabel = formatCellValue(row.property_name) || 'property';
                  const rowId = String(row.id);
                  return (
                    <tr
                      key={row.id}
                      tabIndex={0}
                      className="hover:bg-sage-50/80 dark:hover:bg-sage-900/20 cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-sage-500"
                      onClick={() => {
                        setIsCreatingNew(false);
                        setEditingProperty(row);
                      }}
                      onKeyDown={(e) => {
                        if (e.target !== e.currentTarget) return;
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setIsCreatingNew(false);
                          setEditingProperty(row);
                        }
                      }}
                      aria-label={`Open editor for ${nameLabel}`}
                    >
                      <td
                        className={checkboxCellClass}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(rowId)}
                          onChange={() => toggleRowSelected(rowId)}
                          className="h-4 w-4 rounded border-gray-300 text-sage-600 focus:ring-sage-600 dark:border-neutral-600 dark:bg-neutral-800"
                          aria-label={t('bulkSelectRowAria')}
                        />
                      </td>
                      {QUICK_COLUMNS.map((col) => (
                        <td key={col.key} className={`${bodyCellClass} ${col.width ?? ''}`}>
                          <TableCellReadOnly
                            value={row[col.key]}
                            column={col}
                            row={row}
                            onOpenStatusNote={setStatusNotePreview}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200/75 dark:border-neutral-800 bg-neutral-50/85 dark:bg-neutral-900/40">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Page {page} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
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
              type="button"
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
        open={editingProperty !== null || isCreatingNew}
        mode={isCreatingNew ? 'create' : 'edit'}
        property={editingProperty}
        onClose={() => {
          setEditingProperty(null);
          setIsCreatingNew(false);
        }}
        onSaved={(meta) => {
          if (meta?.created) {
            setPage(1);
            void loadProperties(1);
            setToastMessage(t('toastCreateSuccess'));
            return;
          }
          void loadProperties();
          setToastMessage(t('toastSaveSuccess'));
        }}
        onDeleted={(deletedIds) => {
          const idSet = new Set(deletedIds.map(String));
          setSelectedIds((prev) => {
            const next = new Set(prev);
            for (const id of idSet) {
              next.delete(id);
            }
            return next;
          });
          setRows((prev) => prev.filter((r) => !idSet.has(String(r.id))));
          setTotal((prevTotal) => Math.max(0, prevTotal - deletedIds.length));
          setToastMessage(
            deletedIds.length > 1 ? t('toastDeleteGroupSuccess') : t('toastDeleteSuccess')
          );
        }}
      />

      <Modal
        open={statusNotePreview !== null}
        onClose={() => setStatusNotePreview(null)}
        className="max-w-lg"
      >
        <ModalContent className="flex max-h-[min(70vh,560px)] flex-col">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-neutral-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t('statusNoteModalTitle')}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {statusNotePreview?.propertyName}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
            {statusNotePreview?.notes.trim()
              ? statusNotePreview.notes
              : t('statusNoteBodyEmpty')}
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-3 dark:border-neutral-800 bg-neutral-50/85 dark:bg-neutral-900/40 rounded-b-lg">
            <Button variant="secondary" onClick={() => setStatusNotePreview(null)}>
              {t('statusNoteClose')}
            </Button>
          </div>
        </ModalContent>
      </Modal>

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
