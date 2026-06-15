import {
  GLAMPING_SERVICE_TIERS,
  isGlampingServiceTier,
  tierDisplayLabel,
} from '@/lib/glamping-service-tier';
import type { PipelineQuarterlyPropertyRow } from '@/lib/pipeline-quarterly/fetch-status-breakdown';
import { US_STATE_NAMES } from '@/lib/us-states';

export type PipelinePropertyTableFilters = {
  states: string[];
  tiers: string[];
  unitTypes: string[];
};

export type PipelinePropertyFilterOption = {
  value: string;
  label: string;
};

export function pipelinePropertyStateKey(row: PipelineQuarterlyPropertyRow): string {
  return row.stateAbbr?.trim() || '—';
}

/** Parses `?state=TX` (or full state name) for pipeline property list deep links. */
export function parsePipelineStateParam(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const normalized = raw.trim().toUpperCase();
  if (normalized in US_STATE_NAMES) return normalized;

  const byName = Object.entries(US_STATE_NAMES as Record<string, string>).find(
    ([, name]) => name.toLowerCase() === raw.trim().toLowerCase()
  );
  return byName?.[0] ?? null;
}

export function pipelinePropertyTierKey(row: PipelineQuarterlyPropertyRow): string | null {
  const tier = row.serviceTier?.trim().toLowerCase();
  if (!tier || !isGlampingServiceTier(tier)) return null;
  return tier;
}

export function pipelinePropertyUnitTypeKey(row: PipelineQuarterlyPropertyRow): string {
  return row.unitType?.trim() || 'Unspecified';
}

export function buildPipelinePropertyStateOptions(
  rows: readonly PipelineQuarterlyPropertyRow[]
): PipelinePropertyFilterOption[] {
  const abbrs = new Set<string>();
  for (const row of rows) {
    const abbr = pipelinePropertyStateKey(row);
    if (abbr !== '—') abbrs.add(abbr);
  }

  return [...abbrs]
    .sort((a, b) => a.localeCompare(b))
    .map((abbr) => {
      const name = (US_STATE_NAMES as Record<string, string>)[abbr];
      return {
        value: abbr,
        label: name ? `${name} (${abbr})` : abbr,
      };
    });
}

export function buildPipelinePropertyTierOptions(
  rows: readonly PipelineQuarterlyPropertyRow[]
): PipelinePropertyFilterOption[] {
  const present = new Set<string>();
  for (const row of rows) {
    const tier = pipelinePropertyTierKey(row);
    if (tier) present.add(tier);
  }

  return GLAMPING_SERVICE_TIERS.filter((tier) => present.has(tier)).map((tier) => ({
    value: tier,
    label: tierDisplayLabel(tier, 'short'),
  }));
}

export function buildPipelinePropertyUnitTypeOptions(
  rows: readonly PipelineQuarterlyPropertyRow[]
): PipelinePropertyFilterOption[] {
  const types = new Set<string>();
  for (const row of rows) {
    types.add(pipelinePropertyUnitTypeKey(row));
  }

  return [...types]
    .sort((a, b) => {
      if (a === 'Unspecified') return 1;
      if (b === 'Unspecified') return -1;
      return a.localeCompare(b);
    })
    .map((unitType) => ({ value: unitType, label: unitType }));
}

export function filterPipelineQuarterlyProperties(
  rows: readonly PipelineQuarterlyPropertyRow[],
  filters: PipelinePropertyTableFilters
): PipelineQuarterlyPropertyRow[] {
  const { states, tiers, unitTypes } = filters;

  return rows.filter((row) => {
    if (states.length > 0 && !states.includes(pipelinePropertyStateKey(row))) {
      return false;
    }

    if (tiers.length > 0) {
      const tier = pipelinePropertyTierKey(row);
      if (!tier || !tiers.includes(tier)) return false;
    }

    if (unitTypes.length > 0 && !unitTypes.includes(pipelinePropertyUnitTypeKey(row))) {
      return false;
    }

    return true;
  });
}
