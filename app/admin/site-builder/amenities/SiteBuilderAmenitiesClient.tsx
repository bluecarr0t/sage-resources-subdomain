'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Card, Button, Input, Select } from '@/components/ui';
import { ArrowLeft, Loader2, Check } from 'lucide-react';

type AppliesTo = 'glamping' | 'rv' | 'both';
type ResortTypeFilter = 'all' | AppliesTo;

interface GlampingFieldLink {
  column: string;
  scope: string;
}

interface AmenityApiRow {
  id: string;
  slug: string | null;
  glamping_property_column: string | null;
  name: string;
  cost_per_unit: number;
  applies_to: AppliesTo;
  scope: 'unit' | 'rv' | 'property' | null;
  glamping_fields: unknown;
  default_cost_basis?: string | null;
  default_cost_source_url?: string | null;
  sort_order?: number | null;
}

interface RowEditState extends Omit<AmenityApiRow, 'glamping_fields' | 'applies_to'> {
  applies_to: AppliesTo;
  glamping_fields: GlampingFieldLink[];
  dirty: boolean;
  error: string | null;
}

function parseGlampingFields(raw: unknown): GlampingFieldLink[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (x): x is GlampingFieldLink =>
        x != null &&
        typeof x === 'object' &&
        typeof (x as { column?: unknown }).column === 'string' &&
        typeof (x as { scope?: unknown }).scope === 'string'
    )
    .map((x) => ({ column: (x as GlampingFieldLink).column, scope: (x as GlampingFieldLink).scope }));
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

type DatasetScope = 'unit' | 'rv' | 'property';

function isDatasetScope(s: string): s is DatasetScope {
  return s === 'unit' || s === 'rv' || s === 'property';
}

/**
 * Dataset column row: use row.scope.
 * Catalog row: prefer glamping_fields (linked dataset columns); else explicit row.scope;
 * else infer from applies_to when no columns map to that slug (Site Builder = unit vs RV site).
 */
function amenityLevelDisplay(r: RowEditState, t: (key: string) => string): string {
  if (r.glamping_property_column != null) {
    if (r.scope === 'property') return t('amenitiesLevelProperty');
    if (r.scope === 'unit') return t('amenitiesLevelUnit');
    if (r.scope === 'rv') return t('amenitiesLevelSite');
    return '—';
  }
  const scopesFromLinks = new Set<DatasetScope>();
  for (const f of r.glamping_fields) {
    if (isDatasetScope(f.scope)) scopesFromLinks.add(f.scope);
  }
  if (scopesFromLinks.size > 0) {
    const parts: string[] = [];
    if (scopesFromLinks.has('property')) parts.push(t('amenitiesLevelProperty'));
    if (scopesFromLinks.has('unit')) parts.push(t('amenitiesLevelUnit'));
    if (scopesFromLinks.has('rv')) parts.push(t('amenitiesLevelSite'));
    return parts.join(', ');
  }
  if (r.slug && r.scope && isDatasetScope(r.scope)) {
    if (r.scope === 'property') return t('amenitiesLevelProperty');
    if (r.scope === 'unit') return t('amenitiesLevelUnit');
    if (r.scope === 'rv') return t('amenitiesLevelSite');
  }
  if (r.slug) {
    if (r.applies_to === 'glamping') return t('amenitiesLevelUnit');
    if (r.applies_to === 'rv') return t('amenitiesLevelSite');
    if (r.applies_to === 'both') {
      return `${t('amenitiesLevelUnit')}, ${t('amenitiesLevelSite')}`;
    }
  }
  return '—';
}

export default function SiteBuilderAmenitiesClient() {
  const t = useTranslations('siteBuilder');
  const [rows, setRows] = useState<RowEditState[]>([]);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [saveAllFlash, setSaveAllFlash] = useState(false);
  const saveAllInFlightRef = useRef(false);
  const [resortTypeFilter, setResortTypeFilter] = useState<ResortTypeFilter>('all');

  const loadRows = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/admin/site-builder/amenity-costs');
      const data = await res.json();
      if (!data.success || !Array.isArray(data.rows)) {
        throw new Error(typeof data.error === 'string' ? data.error : t('amenitiesLoadError'));
      }
      setRows(
        data.rows.map((r: AmenityApiRow) => ({
          ...r,
          cost_per_unit: Number(r.cost_per_unit) || 0,
          applies_to: (['glamping', 'rv', 'both'].includes(r.applies_to) ? r.applies_to : 'both') as AppliesTo,
          glamping_fields: parseGlampingFields(r.glamping_fields),
          dirty: false,
          error: null,
        }))
      );
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : t('amenitiesLoadError'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const updateRow = useCallback(
    (id: string, patch: Partial<Pick<AmenityApiRow, 'cost_per_unit' | 'applies_to'>>) => {
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...patch, dirty: true, error: null } : r))
      );
    },
    []
  );

  const saveAllDirty = useCallback(async () => {
    const dirtyList = rowsRef.current.filter((r) => r.dirty);
    if (dirtyList.length === 0 || saveAllInFlightRef.current) return;

    saveAllInFlightRef.current = true;
    setSavingAll(true);
    setSaveAllFlash(false);
    setRows((prev) => prev.map((r) => (r.dirty ? { ...r, error: null } : r)));

    let hadError = false;
    try {
      for (const initial of dirtyList) {
        const row = rowsRef.current.find((r) => r.id === initial.id);
        if (!row?.dirty) continue;

        try {
          const url = row.slug
            ? `/api/admin/site-builder/amenity-costs/${encodeURIComponent(row.slug)}`
            : `/api/admin/site-builder/amenity-costs/dataset/${encodeURIComponent(row.id)}`;
          const res = await fetch(url, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: row.name.trim(),
              cost_per_unit: row.cost_per_unit,
              applies_to: row.applies_to,
            }),
          });
          const data = await res.json();
          if (!data.success || !data.row) {
            throw new Error(typeof data.error === 'string' ? data.error : t('amenitiesSaveError'));
          }
          const u = data.row as {
            id?: string;
            slug: string | null;
            glamping_property_column?: string | null;
            name: string;
            cost_per_unit: number;
            applies_to: AppliesTo;
            scope?: RowEditState['scope'];
            default_cost_basis?: string | null;
            default_cost_source_url?: string | null;
          };
          setRows((prev) =>
            prev.map((r) =>
              r.id === row.id
                ? {
                    ...r,
                    name: u.name,
                    cost_per_unit: Number(u.cost_per_unit) || 0,
                    applies_to: u.applies_to,
                    slug: u.slug ?? r.slug,
                    glamping_property_column:
                      u.glamping_property_column ?? r.glamping_property_column,
                    scope: u.scope !== undefined ? u.scope : r.scope,
                    default_cost_basis: u.default_cost_basis ?? r.default_cost_basis,
                    default_cost_source_url: u.default_cost_source_url ?? r.default_cost_source_url,
                    dirty: false,
                    error: null,
                  }
                : r
            )
          );
        } catch (e) {
          hadError = true;
          const msg = e instanceof Error ? e.message : t('amenitiesSaveError');
          setRows((prev) => prev.map((r) => (r.id === initial.id ? { ...r, error: msg } : r)));
        }
      }
    } finally {
      saveAllInFlightRef.current = false;
      setSavingAll(false);
    }

    if (!hadError) {
      setSaveAllFlash(true);
      window.setTimeout(() => setSaveAllFlash(false), 2000);
    }
  }, [t]);

  const dirtyCount = useMemo(() => rows.filter((r) => r.dirty).length, [rows]);

  const visibleRows = useMemo(() => {
    if (resortTypeFilter === 'all') return rows;
    return rows.filter((r) => r.applies_to === resortTypeFilter);
  }, [rows, resortTypeFilter]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/site-builder"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-sage-600 hover:text-sage-700 dark:text-sage-400 dark:hover:text-sage-300"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t('amenitiesBackToSiteBuilder')}
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{t('amenitiesPageTitle')}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('amenitiesPageSubtitle')}</p>
      </div>

      {loadError ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {loadError}
        </p>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-gray-500 dark:text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          {t('loading')}
        </div>
      ) : (
        <>
          {rows.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('amenitiesNoRows')}</p>
          ) : (
            <Card padding="md" className="overflow-hidden">
              <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {t('amenitiesCatalogSectionTitle')}
                </h2>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  {dirtyCount > 0 ? (
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                      {t('amenitiesUnsavedCount', { count: dirtyCount })}
                    </span>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={dirtyCount === 0 || savingAll}
                    onClick={() => void saveAllDirty()}
                    className="whitespace-nowrap"
                  >
                    {savingAll ? (
                      <>
                        <Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" aria-hidden />
                        {t('amenitiesSaving')}
                      </>
                    ) : saveAllFlash ? (
                      <>
                        <Check className="mr-1 inline h-3.5 w-3.5 text-green-600" aria-hidden />
                        {t('amenitiesSaved')}
                      </>
                    ) : (
                      t('amenitiesSave')
                    )}
                  </Button>
                </div>
              </div>
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {resortTypeFilter === 'all'
                      ? t('amenitiesTableHint', { count: rows.length })
                      : t('amenitiesTableHintFiltered', {
                          filtered: visibleRows.length,
                          total: rows.length,
                        })}
                  </p>
                </div>
                <div className="flex flex-col gap-1 sm:min-w-[200px]">
                  <label
                    htmlFor="amenities-resort-type-filter"
                    className="text-xs font-medium text-gray-600 dark:text-gray-400"
                  >
                    {t('amenitiesResortTypeFilter')}
                  </label>
                  <Select
                    id="amenities-resort-type-filter"
                    value={resortTypeFilter}
                    onChange={(e) => setResortTypeFilter(e.target.value as ResortTypeFilter)}
                    className="text-sm"
                    aria-label={t('amenitiesResortTypeFilter')}
                  >
                    <option value="all">{t('amenitiesResortTypeAll')}</option>
                    <option value="glamping">{t('amenitiesResortTypeGlampingOnly')}</option>
                    <option value="rv">{t('amenitiesResortTypeRvOnly')}</option>
                    <option value="both">{t('amenitiesResortTypeBoth')}</option>
                  </Select>
                </div>
              </div>
              <div className="mb-3 space-y-2">
                {rows.some((r) => r.error) ? (
                  <ul
                    className="list-inside list-disc text-sm text-red-600 dark:text-red-400"
                    role="alert"
                  >
                    {rows
                      .filter((r) => r.error)
                      .map((r) => (
                        <li key={r.id}>
                          <span className="font-mono text-xs">
                            {r.slug ?? r.glamping_property_column}
                          </span>
                          : {r.error}
                        </li>
                      ))}
                  </ul>
                ) : null}
              </div>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-600 text-left">
                      <th className="pb-2 pr-3 font-medium text-gray-700 dark:text-gray-300 w-[110px]">
                        {t('amenitiesColumnLevel')}
                      </th>
                      <th className="pb-2 pr-3 font-medium text-gray-700 dark:text-gray-300">
                        {t('amenitiesColumnTitle')}
                      </th>
                      <th className="pb-2 pr-3 font-medium text-gray-700 dark:text-gray-300 w-[120px]">
                        {t('amenitiesColumnCost')}
                      </th>
                      <th className="pb-2 pr-3 font-medium text-gray-700 dark:text-gray-300 w-[200px]">
                        {t('amenitiesColumnAppliesTo')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="py-6 text-center text-sm text-gray-500 dark:text-gray-400"
                        >
                          {t('amenitiesFilterEmpty')}
                        </td>
                      </tr>
                    ) : null}
                    {visibleRows.map((r) => {
                      const levelText = amenityLevelDisplay(r, t);
                      const appliesHint =
                        r.applies_to === 'both'
                          ? t('amenitiesAppliesHintBoth')
                          : r.applies_to === 'glamping'
                            ? t('amenitiesAppliesHintGlamping')
                            : t('amenitiesAppliesHintRv');
                      const srContext = r.slug
                        ? `${r.slug}, `
                        : `${r.glamping_property_column ?? ''}, `;
                      return (
                        <tr
                          key={r.id}
                          className={`border-b border-gray-100 dark:border-gray-700/50 align-top ${
                            r.dirty ? 'bg-amber-50/50 dark:bg-amber-950/10' : ''
                          }`}
                        >
                          <td className="py-1.5 pr-3 text-gray-700 dark:text-gray-300">
                            <span className="sr-only">{`${t('amenitiesColumnLevel')}: `}</span>
                            {levelText}
                          </td>
                          <td className="py-1.5 pr-3 text-gray-900 dark:text-gray-100">
                            <span className="sr-only">{srContext}</span>
                            {r.name}
                          </td>
                          <td className="py-1.5 pr-3">
                            <Input
                              type="number"
                              min={0}
                              step={1}
                              value={r.cost_per_unit}
                              onChange={(e) => {
                                const n = parseInt(e.target.value, 10);
                                updateRow(r.id, {
                                  cost_per_unit: Number.isFinite(n) && n >= 0 ? n : 0,
                                });
                              }}
                              className="text-sm"
                              disabled={savingAll}
                              aria-label={`${t('amenitiesColumnCost')}, ${formatCurrency(r.cost_per_unit)}`}
                              title={formatCurrency(r.cost_per_unit)}
                            />
                          </td>
                          <td className="py-1.5 pr-3">
                            <span className="sr-only" id={`amenity-applies-hint-${r.id}`}>
                              {appliesHint}
                            </span>
                            <Select
                              id={`amenity-applies-${r.id}`}
                              value={r.applies_to}
                              onChange={(e) =>
                                updateRow(r.id, {
                                  applies_to: e.target.value as AppliesTo,
                                })
                              }
                              disabled={savingAll}
                              aria-label={t('amenitiesColumnAppliesTo')}
                              aria-describedby={`amenity-applies-hint-${r.id}`}
                              title={appliesHint}
                              className="text-sm"
                            >
                              <option value="glamping">{t('amenitiesAppliesGlamping')}</option>
                              <option value="rv">{t('amenitiesAppliesRv')}</option>
                              <option value="both">{t('amenitiesAppliesBoth')}</option>
                            </Select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
