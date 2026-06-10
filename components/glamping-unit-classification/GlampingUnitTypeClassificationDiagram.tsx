'use client';

import Link from 'next/link';
import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { ChevronRight, Search, X } from 'lucide-react';
import {
  GLAMPING_UNIT_CLASSIFICATION_FAMILIES,
  GLAMPING_UNIT_CLASSIFICATION_ROOT,
  type GlampingUnitFamily,
  type GlampingUnitSubtype,
  type UnitPropertyTypeFilter,
} from '@/lib/glamping-unit-type-classification';
import {
  DEFAULT_UNIT_PROPERTY_TYPE_FILTERS,
  UNIT_PROPERTY_TYPE_FILTER_OPTIONS,
  filterSubtypesByPropertyType,
  getUnitPropertyTypeFilterOption,
} from '@/lib/outdoor-hospitality-unit-property-type';
import { getUnitTypeDotColor } from '@/lib/unit-type-dot-color';

type Selection =
  | { kind: 'family'; family: GlampingUnitFamily }
  | { kind: 'subtype'; family: GlampingUnitFamily; subtype: GlampingUnitSubtype };

function subtypeMatchesSearch(
  subtype: GlampingUnitSubtype,
  familyLabel: string,
  query: string
): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  if (subtype.canonical.toLowerCase().includes(q)) return true;
  if (familyLabel.toLowerCase().includes(q)) return true;
  return (subtype.aliases ?? []).some((a) => a.toLowerCase().includes(q));
}

function propertyTypeBadgeClass(id: UnitPropertyTypeFilter): string {
  switch (id) {
    case 'glamping':
      return 'border-sage-200 bg-sage-50 text-sage-800';
    case 'rvResort':
      return 'border-neutral-300 bg-neutral-100 text-neutral-700';
    case 'campground':
      return 'border-amber-200 bg-amber-50 text-amber-900';
    case 'marina':
      return 'border-teal-200 bg-teal-50 text-teal-900';
  }
}

function PropertyTypeBadges({
  propertyTypes,
}: {
  propertyTypes: readonly UnitPropertyTypeFilter[];
}) {
  return (
    <>
      {propertyTypes.map((id) => {
        const opt = getUnitPropertyTypeFilterOption(id);
        return (
          <span
            key={id}
            className={`inline-flex shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${propertyTypeBadgeClass(id)}`}
          >
            {opt.shortLabel}
          </span>
        );
      })}
    </>
  );
}

function SubtypePill({
  subtype,
  selected,
  onSelect,
}: {
  subtype: GlampingUnitSubtype;
  selected: boolean;
  onSelect: () => void;
}) {
  const dot = getUnitTypeDotColor(subtype.canonical);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group flex w-full items-start gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
        selected
          ? 'border-sage-500 bg-white shadow-sm ring-1 ring-sage-500/30'
          : 'border-neutral-200/90 bg-white/80 hover:border-neutral-300 hover:bg-white'
      }`}
    >
      <span
        className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: dot }}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="font-medium text-neutral-900">{subtype.canonical}</span>
          <PropertyTypeBadges propertyTypes={subtype.propertyTypes} />
        </span>
      </span>
      <ChevronRight
        className={`mt-0.5 h-4 w-4 shrink-0 text-neutral-400 transition-transform ${
          selected ? 'translate-x-0.5 text-sage-600' : 'opacity-0 group-hover:opacity-100'
        }`}
        aria-hidden
      />
    </button>
  );
}

function DetailPanel({ selection }: { selection: Selection }) {
  const subtype = selection.kind === 'subtype' ? selection.subtype : null;
  const family = selection.family;

  return (
    <div className="rounded-xl border border-neutral-200/90 bg-white/95 p-5 shadow-sm backdrop-blur-sm sm:p-6">
      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-500">
        {family.label}
      </p>
      {selection.kind === 'family' ? (
        <>
          <h2 className="mt-2 font-[Georgia] text-2xl font-medium text-neutral-900">{family.label}</h2>
          <p className="mt-3 text-sm leading-relaxed text-neutral-600">{family.summary}</p>
          <p className="mt-4 text-sm text-neutral-500">
            Select a subtype in the diagram to see canonical labels, property-type cohorts, aliases,
            and glossary links.
          </p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {family.subtypes.map((s) => (
              <li key={s.canonical}>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs text-neutral-700">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: getUnitTypeDotColor(s.canonical) }}
                    aria-hidden
                  />
                  {s.canonical}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <h2 className="mt-2 font-[Georgia] text-2xl font-medium text-neutral-900">
            {subtype!.canonical}
          </h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <PropertyTypeBadges propertyTypes={subtype!.propertyTypes} />
          </div>
          <p className="mt-3 text-sm leading-relaxed text-neutral-600">{subtype!.description}</p>
          {subtype!.aliases && subtype!.aliases.length > 0 ? (
            <div className="mt-5">
              <h3 className="text-[11px] font-medium uppercase tracking-widest text-neutral-500">
                Normalizes from
              </h3>
              <p className="mt-2 text-sm text-neutral-700">{subtype!.aliases.join(' · ')}</p>
            </div>
          ) : null}
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[11px] uppercase tracking-widest text-neutral-500">Canonical</dt>
              <dd className="mt-1 font-mono text-xs text-neutral-800">{subtype!.canonical}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[11px] uppercase tracking-widest text-neutral-500">
                Property types
              </dt>
              <dd className="mt-1 text-neutral-700">
                {subtype!.propertyTypes
                  .map(
                    (id) =>
                      `${getUnitPropertyTypeFilterOption(id).label} — ${getUnitPropertyTypeFilterOption(id).description}`
                  )
                  .join(' · ')}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-widest text-neutral-500">
                Market overview
              </dt>
              <dd className="mt-1 text-neutral-700">
                {subtype!.excludedFromMarketSnapshot
                  ? 'Excluded from public glamping market overview counts'
                  : subtype!.propertyTypes.includes('glamping')
                    ? 'Included in public glamping market overview metrics'
                    : 'Outside the default glamping market overview cohort'}
              </dd>
            </div>
            {subtype!.inReportPicklist ? (
              <div>
                <dt className="text-[11px] uppercase tracking-widest text-neutral-500">
                  Report picklist
                </dt>
                <dd className="mt-1 text-neutral-700">Listed in Sage report unit types</dd>
              </div>
            ) : null}
          </dl>
          {subtype!.glossarySlug ? (
            <p className="mt-6">
              <Link
                href={`/en/glossary/${subtype!.glossarySlug}`}
                className="inline-flex items-center gap-1 text-sm font-medium text-[#006b5f] underline decoration-[#006b5f]/30 underline-offset-2 hover:decoration-[#006b5f]"
              >
                Read glossary definition
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Link>
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

export function GlampingUnitTypeClassificationDiagram() {
  const diagramTitleId = useId();
  const filterGroupId = useId();
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>(
    GLAMPING_UNIT_CLASSIFICATION_FAMILIES[0]!.id
  );
  const [selectedSubtypeCanonical, setSelectedSubtypeCanonical] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [propertyTypeFilters, setPropertyTypeFilters] = useState<Set<UnitPropertyTypeFilter>>(
    () => new Set(DEFAULT_UNIT_PROPERTY_TYPE_FILTERS)
  );

  const selectedFamily = useMemo(
    () =>
      GLAMPING_UNIT_CLASSIFICATION_FAMILIES.find((f) => f.id === selectedFamilyId) ??
      GLAMPING_UNIT_CLASSIFICATION_FAMILIES[0]!,
    [selectedFamilyId]
  );

  const filteredFamilies = useMemo(() => {
    const q = query.trim();
    return GLAMPING_UNIT_CLASSIFICATION_FAMILIES.map((family) => {
      const bySearch = family.subtypes.filter((s) =>
        subtypeMatchesSearch(s, family.label, q)
      );
      const subtypes = filterSubtypesByPropertyType(bySearch, propertyTypeFilters);
      if (subtypes.length === 0) return null;
      return { ...family, subtypes };
    }).filter(Boolean) as GlampingUnitFamily[];
  }, [query, propertyTypeFilters]);

  useEffect(() => {
    if (filteredFamilies.some((f) => f.id === selectedFamilyId)) return;
    const nextId = filteredFamilies[0]?.id;
    if (nextId) {
      setSelectedFamilyId(nextId);
      setSelectedSubtypeCanonical(null);
    }
  }, [filteredFamilies, selectedFamilyId]);

  const activeFamily = useMemo(
    () => filteredFamilies.find((f) => f.id === selectedFamilyId) ?? selectedFamily,
    [filteredFamilies, selectedFamilyId, selectedFamily]
  );

  const selectedSubtype = useMemo(() => {
    if (!selectedSubtypeCanonical) return null;
    return activeFamily.subtypes.find((s) => s.canonical === selectedSubtypeCanonical) ?? null;
  }, [activeFamily, selectedSubtypeCanonical]);

  const selection: Selection = selectedSubtype
    ? { kind: 'subtype', family: activeFamily, subtype: selectedSubtype }
    : { kind: 'family', family: activeFamily };

  const selectFamily = useCallback((familyId: string) => {
    setSelectedFamilyId(familyId);
    setSelectedSubtypeCanonical(null);
  }, []);

  const selectSubtype = useCallback((familyId: string, canonical: string) => {
    setSelectedFamilyId(familyId);
    setSelectedSubtypeCanonical(canonical);
  }, []);

  const togglePropertyType = useCallback((id: UnitPropertyTypeFilter) => {
    setPropertyTypeFilters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size <= 1) return prev;
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setSelectedSubtypeCanonical(null);
  }, []);

  const familyCount = GLAMPING_UNIT_CLASSIFICATION_FAMILIES.length;
  const subtypeCount = GLAMPING_UNIT_CLASSIFICATION_FAMILIES.reduce(
    (n, f) => n + f.subtypes.length,
    0
  );
  const visibleSubtypeCount = filteredFamilies.reduce((n, f) => n + f.subtypes.length, 0);

  return (
    <div className="space-y-8">
      <p className="max-w-3xl text-sm leading-relaxed text-neutral-600">
        {GLAMPING_UNIT_CLASSIFICATION_ROOT.summary} Explore{' '}
        <span className="tabular-nums text-neutral-800">{familyCount}</span> families and{' '}
        <span className="tabular-nums text-neutral-800">{subtypeCount}</span> canonical subtypes.
        Glamping is selected by default; toggle RV Resort, Campground, or Marina to see pads,
        hybrid resort inventory, and marina-adjacent unit labels.
      </p>

      <div role="group" aria-labelledby={filterGroupId} className="space-y-3">
        <p id={filterGroupId} className="text-[11px] font-medium uppercase tracking-widest text-neutral-500">
          Property type
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {UNIT_PROPERTY_TYPE_FILTER_OPTIONS.map((opt) => {
            const active = propertyTypeFilters.has(opt.id);
            const count = GLAMPING_UNIT_CLASSIFICATION_FAMILIES.reduce(
              (n, f) => n + f.subtypes.filter((s) => s.propertyTypes.includes(opt.id)).length,
              0
            );
            return (
              <button
                key={opt.id}
                type="button"
                aria-pressed={active}
                onClick={() => togglePropertyType(opt.id)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? 'border-sage-600 bg-sage-600 text-white shadow-sm'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'
                }`}
              >
                {opt.label}
                <span
                  className={`ml-1.5 tabular-nums text-xs ${active ? 'text-white/85' : 'text-neutral-500'}`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative max-w-xl">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search unit types or aliases…"
          className="w-full rounded-lg border border-neutral-200 bg-white py-2.5 pl-10 pr-10 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-sage-500 focus:outline-none focus:ring-2 focus:ring-sage-500/20"
          aria-label="Search unit types"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-400 hover:text-neutral-700"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <p className="text-xs text-neutral-500">
        Showing{' '}
        <span className="tabular-nums font-medium text-neutral-700">{visibleSubtypeCount}</span>{' '}
        subtypes matching filters
        {query ? (
          <>
            {' '}
            for &ldquo;<span className="text-neutral-700">{query.trim()}</span>&rdquo;
          </>
        ) : null}
        .
      </p>

      <section
        aria-labelledby={diagramTitleId}
        className="rounded-2xl border border-neutral-200/90 bg-white/60 p-4 sm:p-6"
      >
        <h2 id={diagramTitleId} className="sr-only">
          Unit type family diagram
        </h2>

        {filteredFamilies.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-500">
            No unit types match the current search and property-type filters. Enable more property
            type chips or clear the search box.
          </p>
        ) : (
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => setSelectedSubtypeCanonical(null)}
              className="rounded-full border border-neutral-300 bg-[#faf9f3] px-4 py-2 text-center text-sm font-medium text-neutral-900 shadow-sm transition hover:border-sage-400 hover:ring-2 hover:ring-sage-500/20"
            >
              {GLAMPING_UNIT_CLASSIFICATION_ROOT.label}
            </button>

            <div className="my-3 h-6 w-px bg-neutral-300" aria-hidden />

            <div
              className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4"
              role="list"
              aria-label="Unit type families"
            >
              {filteredFamilies.map((family) => {
                const active = family.id === selectedFamilyId;
                return (
                  <button
                    key={family.id}
                    type="button"
                    role="listitem"
                    onClick={() => selectFamily(family.id)}
                    className={`relative rounded-xl border px-2 py-3 text-center text-xs font-medium transition-all sm:text-sm ${
                      active
                        ? 'border-transparent text-white shadow-md'
                        : 'border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300'
                    }`}
                    style={
                      active
                        ? { backgroundColor: family.accent, borderColor: family.accent }
                        : undefined
                    }
                    aria-pressed={active}
                  >
                    <span className="block leading-snug">{family.label}</span>
                    <span
                      className={`mt-1 block text-[10px] font-normal tabular-nums sm:text-[11px] ${
                        active ? 'text-white/85' : 'text-neutral-500'
                      }`}
                    >
                      {family.subtypes.length} visible
                    </span>
                    {active ? (
                      <span
                        className="absolute -bottom-3 left-1/2 h-3 w-px -translate-x-1/2 bg-neutral-300"
                        aria-hidden
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="mt-8 w-full border-t border-neutral-200/80 pt-6">
              <p className="mb-3 text-[11px] font-medium uppercase tracking-widest text-neutral-500">
                Subtypes — {activeFamily.label}
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {activeFamily.subtypes.map((subtype) => (
                  <SubtypePill
                    key={subtype.canonical}
                    subtype={subtype}
                    selected={selectedSubtypeCanonical === subtype.canonical}
                    onSelect={() => selectSubtype(activeFamily.id, subtype.canonical)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      <DetailPanel selection={selection} />
    </div>
  );
}
