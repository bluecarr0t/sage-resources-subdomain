'use client';

import { useState, useRef, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button, Input } from '@/components/ui';
import { FileText, Pencil, Search, X } from 'lucide-react';

export interface SiteBuilderAmenitySource {
  report_id: string;
  study_id: string | null;
  report_title: string | null;
  line_item: string;
}

export interface SiteBuilderAmenityCost {
  slug: string;
  name: string;
  cost_per_unit: number;
  applies_to: string;
  sources?: SiteBuilderAmenitySource[];
}

function AmenityNameWithOptionalTooltip({
  amenity,
  displayCostPerUnit,
  formatCurrency,
  t,
}: {
  amenity: SiteBuilderAmenityCost;
  displayCostPerUnit: number;
  formatCurrency: (n: number) => string;
  t: (key: string) => string;
}) {
  const hasSources = amenity.sources && amenity.sources.length > 0;
  const sourcesWithStudy = hasSources ? amenity.sources!.filter((s) => s.study_id) : [];

  if (!hasSources || sourcesWithStudy.length === 0) {
    return (
      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
        {amenity.name}{' '}
        <span className="font-normal text-gray-500 dark:text-gray-400">
          ({formatCurrency(displayCostPerUnit)})
        </span>
      </span>
    );
  }

  return (
    <span className="group relative inline-block text-left">
      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-help underline decoration-dotted decoration-sage-400/60 underline-offset-1">
        {amenity.name}{' '}
        <span className="font-normal text-gray-500 dark:text-gray-400">
          ({formatCurrency(displayCostPerUnit)})
        </span>
      </span>
      <span
        role="tooltip"
        className="absolute left-0 bottom-full z-50 mb-1 hidden w-max max-w-[320px] rounded-lg border border-gray-200 bg-white py-2.5 text-left text-xs shadow-lg dark:border-gray-600 dark:bg-gray-800 group-hover:block"
      >
        <div className="px-3 pb-2 border-b border-gray-100 dark:border-gray-700">
          <p className="font-semibold text-gray-900 dark:text-gray-100">{amenity.name}</p>
          <p className="text-gray-500 dark:text-gray-400 mt-0.5">
            {t('sourceReports')} — {formatCurrency(displayCostPerUnit)}
          </p>
        </div>
        <ul className="mt-2 space-y-0 max-h-[260px] overflow-y-auto">
          {sourcesWithStudy.map((s, i) => (
            <li
              key={`${s.report_id}-${s.line_item}-${i}`}
              className="border-b border-gray-50 dark:border-gray-700/50 last:border-0"
            >
              <Link
                href={`/admin/reports/${encodeURIComponent(s.study_id!)}`}
                className="block px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="font-medium text-gray-900 dark:text-gray-100 truncate" title={s.report_title ?? undefined}>
                  {s.report_title || t('unnamedReport')}
                </p>
                <p className="text-gray-500 dark:text-gray-400 mt-0.5 text-[11px]">{s.line_item}</p>
                <span className="inline-flex items-center gap-1 mt-1 text-sage-600 dark:text-sage-400 text-[11px] font-medium">
                  <FileText className="w-3 h-3" aria-hidden />
                  {t('viewStudy')}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </span>
    </span>
  );
}

function AmenityCostPopover({
  amenityName,
  editDraft,
  onEditDraftChange,
  onApply,
  onCancel,
  onRevert,
  isOverridden,
  refCost,
  formatCurrency,
  t,
}: {
  amenityName: string;
  editDraft: string;
  onEditDraftChange: (v: string) => void;
  onApply: () => void;
  onCancel: () => void;
  onRevert: () => void;
  isOverridden: boolean;
  refCost: number;
  formatCurrency: (n: number) => string;
  t: (key: string) => string;
}) {
  return (
    <div
      className="absolute right-0 top-full z-[60] mt-1 w-[min(100vw-2rem,260px)] rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-600 dark:bg-gray-800"
      data-site-builder-amenity-cost-popover="1"
    >
      <p className="mb-1.5 text-xs font-medium text-gray-700 dark:text-gray-300">{amenityName}</p>
      <Input
        type="number"
        min={0}
        step={1}
        label={t('amenityEditCostLabel')}
        value={editDraft}
        onChange={(e) => onEditDraftChange(e.target.value)}
        className="text-sm"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={onApply}>
          {t('amenityEditCostApply')}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          {t('amenityEditCostCancel')}
        </Button>
        {isOverridden ? (
          <Button type="button" variant="ghost" size="sm" onClick={onRevert}>
            {t('amenityEditCostReset')}
          </Button>
        ) : null}
      </div>
      <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
        {t('amenityEditCostReference')}: {formatCurrency(refCost)}
      </p>
    </div>
  );
}

export default function SiteBuilderConfigAmenities({
  amenities,
  selectedSlugs,
  costOverrides,
  editingConfigSlug,
  editDraft,
  onEditDraftChange,
  onOpenEditCost,
  onCloseEditCost,
  onApplyCost,
  onRevertCost,
  onToggleSlug,
  onRemoveSlug,
  formatCurrency,
  getRefCost,
}: {
  amenities: SiteBuilderAmenityCost[];
  selectedSlugs: string[];
  costOverrides: Record<string, number>;
  editingConfigSlug: string | null;
  editDraft: string;
  onEditDraftChange: (v: string) => void;
  onOpenEditCost: (slug: string) => void;
  onCloseEditCost: () => void;
  onApplyCost: (slug: string, raw: string) => void;
  onRevertCost: (slug: string) => void;
  onToggleSlug: (slug: string) => void;
  onRemoveSlug: (slug: string) => void;
  formatCurrency: (n: number) => string;
  getRefCost: (slug: string) => number;
}) {
  const t = useTranslations('siteBuilder');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0, maxHeight: 280 });
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  const amenityBySlug = useMemo(() => new Map(amenities.map((a) => [a.slug, a])), [amenities]);

  const searchLower = search.trim().toLowerCase();
  const filteredOptions = useMemo(() => {
    if (!searchLower) return amenities;
    return amenities.filter(
      (a) => a.name.toLowerCase().includes(searchLower) || a.slug.toLowerCase().includes(searchLower)
    );
  }, [amenities, searchLower]);

  const effectiveCost = useCallback(
    (slug: string) => {
      const ref = getRefCost(slug);
      return costOverrides[slug] !== undefined ? costOverrides[slug]! : ref;
    },
    [costOverrides, getRefCost]
  );

  const overrideCount = useMemo(
    () => selectedSlugs.filter((s) => costOverrides[s] !== undefined).length,
    [selectedSlugs, costOverrides]
  );

  const summaryText =
    selectedSlugs.length === 0
      ? t('amenityPickerPlaceholder')
      : overrideCount > 0
        ? t('amenityPickerSummaryWithOverrides', { count: selectedSlugs.length, overrides: overrideCount })
        : t('amenityPickerSummary', { count: selectedSlugs.length });

  const updateDropdownPosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const spaceBelow = viewportHeight - rect.bottom - 4;
    const defaultMax = 280;
    let maxHeight = Math.min(spaceBelow, defaultMax);
    maxHeight = Math.max(maxHeight, 120);
    const top = rect.bottom + 4;
    /** Panel narrower than the full-width trigger for a compact picker. */
    const preferredWidth = 300;
    const width = Math.min(preferredWidth, viewportWidth - 8);
    let left = rect.left;
    if (left + width > viewportWidth - 4) left = viewportWidth - width - 4;
    left = Math.max(4, left);
    setDropdownPosition({ top, left, width, maxHeight });
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!pickerOpen) return;
    updateDropdownPosition();
    const onScroll = () => updateDropdownPosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    const tOut = setTimeout(() => updateDropdownPosition(), 0);
    return () => {
      clearTimeout(tOut);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [pickerOpen, updateDropdownPosition]);

  useEffect(() => {
    if (!pickerOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        dropdownRef.current?.contains(target) ||
        containerRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) {
        return;
      }
      setPickerOpen(false);
    };
    const timeout = setTimeout(() => document.addEventListener('mousedown', onMouseDown), 100);
    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [pickerOpen]);

  const selectedAmenityRows = useMemo(() => {
    const rows: { amenity: SiteBuilderAmenityCost }[] = [];
    for (const slug of selectedSlugs) {
      const a = amenityBySlug.get(slug);
      if (a) rows.push({ amenity: a });
    }
    return rows;
  }, [selectedSlugs, amenityBySlug]);

  const renderSourceLinks = (a: SiteBuilderAmenityCost): ReactNode =>
    a.sources?.length ? (
      <span className="inline-flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        {a.sources
          .filter((s) => s.study_id)
          .map((s, i) => (
            <Link
              key={`${s.report_id}-${s.line_item}-${i}`}
              href={`/admin/reports/${encodeURIComponent(s.study_id!)}`}
              className="inline-flex text-sage-600 hover:text-sage-700 dark:text-sage-400 dark:hover:text-sage-300"
              title={s.report_title ? `${s.report_title} — ${s.line_item}` : s.line_item}
              aria-label={t('viewStudy')}
            >
              <FileText className="w-3.5 h-3.5" aria-hidden />
            </Link>
          ))}
      </span>
    ) : null;

  return (
    <div className="mt-4 space-y-3">
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('amenities')}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t('amenityRowCostHelp')}</p>
      </div>

      <div className={`relative ${pickerOpen ? 'z-50' : 'z-auto'}`} ref={containerRef}>
        <button
          ref={buttonRef}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setPickerOpen((o) => !o);
            if (!pickerOpen) setSearch('');
          }}
          className={`w-full max-w-[300px] px-3 py-2 border rounded-lg shadow-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-sage-500 text-sm transition-all text-left flex items-center justify-between gap-2 cursor-pointer ${
            selectedSlugs.length > 0
              ? 'border-sage-300 bg-sage-50/50 dark:border-sage-600 dark:bg-sage-900/30 text-gray-900 dark:text-gray-100 font-medium'
              : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'
          }`}
          aria-expanded={pickerOpen}
          aria-haspopup="listbox"
        >
          <span className="truncate flex items-center gap-2 min-w-0">
            <Search className="w-4 h-4 shrink-0 text-gray-400" aria-hidden />
            <span className="truncate">{summaryText}</span>
          </span>
          <span className="text-gray-400 text-xs shrink-0">{pickerOpen ? '▲' : '▼'}</span>
        </button>

        {pickerOpen && mounted
          ? createPortal(
              <div
                ref={dropdownRef}
                className="fixed z-[9999] bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg shadow-2xl flex flex-col overflow-hidden"
                style={{
                  top: `${dropdownPosition.top}px`,
                  left: `${dropdownPosition.left}px`,
                  width: `${dropdownPosition.width}px`,
                  maxHeight: `${dropdownPosition.maxHeight}px`,
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="p-2 border-b border-gray-100 dark:border-gray-700 shrink-0">
                  <Input
                    type="search"
                    label={t('amenitySearchLabel')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="text-sm"
                    autoFocus
                    placeholder={t('amenitySearchPlaceholder')}
                  />
                </div>
                <div className="overflow-y-auto flex-1 min-h-0 p-2 space-y-0.5">
                  {filteredOptions.length === 0 ? (
                    <p className="px-2 py-3 text-sm text-gray-500 dark:text-gray-400">{t('amenitySearchNoResults')}</p>
                  ) : (
                    filteredOptions.map((a) => {
                      const checked = selectedSlugs.includes(a.slug);
                      return (
                        <label
                          key={a.slug}
                          className="flex items-start gap-2 px-2 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/80 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => onToggleSlug(a.slug)}
                            className="mt-1 rounded border-gray-300 dark:border-gray-600 text-sage-600 focus:ring-sage-500"
                          />
                          <span className="min-w-0 flex-1 text-sm text-gray-800 dark:text-gray-200">
                            <span className="font-medium">{a.name}</span>
                            <span className="text-gray-500 dark:text-gray-400 shrink-0 tabular-nums">
                              {' '}
                              · {formatCurrency(a.cost_per_unit)}
                            </span>
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>,
              document.body
            )
          : null}
      </div>

      {selectedAmenityRows.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-1">{t('amenitySelectedEmpty')}</p>
      ) : (
        <ul className="space-y-2 border border-gray-100 dark:border-gray-700/80 rounded-lg p-3 bg-gray-50/50 dark:bg-gray-900/20">
          {selectedAmenityRows.map(({ amenity: a }) => {
            const refCost = getRefCost(a.slug);
            const display = effectiveCost(a.slug);
            const isEditing = editingConfigSlug === a.slug;
            const isOverridden = costOverrides[a.slug] !== undefined;
            return (
              <li
                key={a.slug}
                className="flex flex-wrap items-start gap-2 sm:items-center sm:flex-nowrap border-b border-gray-100 dark:border-gray-700/60 last:border-0 last:pb-0 pb-2 last:mb-0 mb-0"
              >
                <div className="min-w-0 flex-1 basis-full sm:basis-auto">
                  <div className="flex flex-wrap items-center gap-2">
                    <AmenityNameWithOptionalTooltip
                      amenity={a}
                      displayCostPerUnit={display}
                      formatCurrency={formatCurrency}
                      t={t}
                    />
                    {isOverridden ? (
                      <span className="text-[10px] uppercase tracking-wide font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded">
                        {t('amenityCustomCostBadge')}
                      </span>
                    ) : null}
                    {renderSourceLinks(a)}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-auto sm:ml-0 relative">
                  <button
                    type="button"
                    className="inline-flex rounded p-1.5 text-gray-400 hover:bg-gray-200/80 hover:text-sage-600 dark:hover:bg-gray-700 dark:hover:text-sage-400"
                    aria-label={t('amenityEditCostAria')}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (isEditing) onCloseEditCost();
                      else onOpenEditCost(a.slug);
                    }}
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="inline-flex rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                    aria-label={t('amenityRemoveAria')}
                    onClick={() => onRemoveSlug(a.slug)}
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                  {isEditing ? (
                    <AmenityCostPopover
                      amenityName={a.name}
                      editDraft={editDraft}
                      onEditDraftChange={onEditDraftChange}
                      onApply={() => onApplyCost(a.slug, editDraft)}
                      onCancel={onCloseEditCost}
                      onRevert={() => onRevertCost(a.slug)}
                      isOverridden={isOverridden}
                      refCost={refCost}
                      formatCurrency={formatCurrency}
                      t={t}
                    />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
