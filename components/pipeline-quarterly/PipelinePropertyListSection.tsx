'use client';

import { useMemo, useState } from 'react';
import MultiSelect from '@/components/MultiSelect';
import SearchableMultiSelect from '@/components/SearchableMultiSelect';
import { PipelinePropertiesTable } from '@/components/pipeline-quarterly/PipelinePropertiesTable';
import { PipelineQuarterlyExportDropdown } from '@/components/pipeline-quarterly/PipelineQuarterlyExportDropdown';
import {
  buildPipelinePropertyStateOptions,
  buildPipelinePropertyTierOptions,
  buildPipelinePropertyUnitTypeOptions,
  filterPipelineQuarterlyProperties,
} from '@/lib/pipeline-quarterly/filter-properties';
import type { PipelineQuarterlyPropertyRow } from '@/lib/pipeline-quarterly/fetch-status-breakdown';
import type { PipelinePropertySortState } from '@/lib/pipeline-quarterly/sort-properties';

function formatInt(n: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);
}

function toggleValue(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
}

type Props = {
  rows: readonly PipelineQuarterlyPropertyRow[];
  filenamePrefix: string;
  hidePlannedOpenColumn?: boolean;
  initialSelectedStates?: string[];
  rateColumnLabel?: string;
  initialSort?: PipelinePropertySortState;
  pageSize?: number;
  emptyCellDisplay?: string;
};

export function PipelinePropertyListSection({
  rows,
  filenamePrefix,
  hidePlannedOpenColumn = false,
  initialSelectedStates = [],
  rateColumnLabel,
  initialSort,
  pageSize,
  emptyCellDisplay,
}: Props) {
  const [selectedStates, setSelectedStates] = useState<string[]>(initialSelectedStates);
  const [selectedTiers, setSelectedTiers] = useState<string[]>([]);
  const [selectedUnitTypes, setSelectedUnitTypes] = useState<string[]>([]);

  const stateOptions = useMemo(() => buildPipelinePropertyStateOptions(rows), [rows]);
  const tierOptions = useMemo(() => buildPipelinePropertyTierOptions(rows), [rows]);
  const unitTypeOptions = useMemo(() => buildPipelinePropertyUnitTypeOptions(rows), [rows]);

  const filteredRows = useMemo(
    () =>
      filterPipelineQuarterlyProperties(rows, {
        states: selectedStates,
        tiers: selectedTiers,
        unitTypes: selectedUnitTypes,
      }),
    [rows, selectedStates, selectedTiers, selectedUnitTypes]
  );

  const hasActiveFilters =
    selectedStates.length > 0 || selectedTiers.length > 0 || selectedUnitTypes.length > 0;

  const countLabel =
    hasActiveFilters && filteredRows.length !== rows.length
      ? `${formatInt(filteredRows.length)} of ${formatInt(rows.length)} properties`
      : `${formatInt(rows.length)} properties`;

  return (
    <section className="mt-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[11px] uppercase tracking-widest text-neutral-500">Property list</h2>
          <p className="mt-2 text-[10px] leading-relaxed text-neutral-500">
            {countLabel} · export for full detail
          </p>
        </div>
        <PipelineQuarterlyExportDropdown
          rows={filteredRows}
          filenamePrefix={filenamePrefix}
          hidePlannedOpenDate={hidePlannedOpenColumn}
        />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="min-w-0">
          <SearchableMultiSelect
            id="pipeline-property-state-filter"
            label="State"
            options={stateOptions}
            selectedValues={selectedStates}
            onToggle={(value) => setSelectedStates((prev) => toggleValue(prev, value))}
            placeholder="All states"
            allSelectedText="All states"
            searchPlaceholder="Search states…"
            activeColor="sage"
            maxDropdownHeightPx={520}
            disabled={stateOptions.length === 0}
            variant="editorial"
          />
        </div>
        <div className="min-w-0">
          <MultiSelect
            id="pipeline-property-tier-filter"
            label="Tier"
            options={tierOptions}
            selectedValues={selectedTiers}
            onToggle={(value) => setSelectedTiers((prev) => toggleValue(prev, value))}
            onClear={() => setSelectedTiers([])}
            placeholder="All tiers"
            allSelectedText="All tiers"
            activeColor="sage"
            variant="editorial"
          />
        </div>
        <div className="min-w-0">
          <MultiSelect
            id="pipeline-property-unit-type-filter"
            label="Unit type"
            options={unitTypeOptions}
            selectedValues={selectedUnitTypes}
            onToggle={(value) => setSelectedUnitTypes((prev) => toggleValue(prev, value))}
            onClear={() => setSelectedUnitTypes([])}
            placeholder="All unit types"
            allSelectedText="All unit types"
            activeColor="sage"
            variant="editorial"
          />
        </div>
      </div>

      {hasActiveFilters && filteredRows.length === 0 ? (
        <p className="mt-6 text-sm text-neutral-500">
          No properties match the current filters.
        </p>
      ) : (
        <div className="mt-6">
          <PipelinePropertiesTable
            rows={filteredRows}
            hidePlannedOpenColumn={hidePlannedOpenColumn}
            rateColumnLabel={rateColumnLabel}
            initialSort={initialSort}
            pageSize={pageSize}
            emptyCellDisplay={emptyCellDisplay}
          />
        </div>
      )}
    </section>
  );
}
