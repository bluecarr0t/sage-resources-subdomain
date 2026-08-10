/**
 * Helpers for assumption review / ship lock in Report Builder.
 */

import type { EnrichedInput } from './types';
import type {
  AssumptionState,
  AssumptionValue,
  FeasibilityAssumptions,
} from '@/lib/feasibility-model';
import { formatCompRadiusPivotsForPrompt } from './comp-radius-pivots';

export interface AssumptionEvidence {
  ratesSource: string;
  occSource: string;
  pivotSummary: string;
  compCount: number;
  pastReportCompCount: number;
  webCompCount: number;
  stvrSummary: string | null;
}

export function buildAssumptionEvidence(enriched: EnrichedInput): AssumptionEvidence {
  const comps = enriched.nearby_comps ?? [];
  const past = comps.filter((c) => c.source_table === 'past_reports').length;
  const web = comps.filter((c) => c.source_table === 'tavily_web_research').length;
  const db = comps.length - past - web;

  const rateBits: string[] = [];
  if (db > 0) rateBits.push(`${db} market DB comps`);
  if (past > 0) rateBits.push(`${past} past-report comps`);
  if (web > 0) rateBits.push(`${web} web comps`);
  if (enriched.comp_radius_pivots?.buckets?.[0]?.avg_adr != null) {
    rateBits.push(`50mi pivot ADR $${Math.round(enriched.comp_radius_pivots.buckets[0].avg_adr)}`);
  }
  if (enriched.stvr_indicators?.avg_adr != null) {
    rateBits.push(`STVR ADR $${Math.round(enriched.stvr_indicators.avg_adr)}`);
  }

  const occBits: string[] = [];
  if (comps.some((c) => c.low_occupancy != null || c.peak_occupancy != null)) {
    occBits.push('comp occupancy');
  }
  if (enriched.stvr_indicators?.avg_occupancy != null) {
    occBits.push(`STVR occ ${(enriched.stvr_indicators.avg_occupancy * 100).toFixed(0)}%`);
  }
  if (enriched.stvr_indicators?.airdna?.occupancy != null) {
    occBits.push(`AirDNA occ ${(enriched.stvr_indicators.airdna.occupancy * 100).toFixed(0)}%`);
  }

  const stvrSummary = enriched.stvr_indicators
    ? [
        enriched.stvr_indicators.avg_adr != null
          ? `ADR $${Math.round(enriched.stvr_indicators.avg_adr)}`
          : null,
        enriched.stvr_indicators.avg_occupancy != null
          ? `Occ ${(enriched.stvr_indicators.avg_occupancy * 100).toFixed(0)}%`
          : null,
        enriched.stvr_indicators.airdna ? 'AirDNA on' : 'AirDNA soft-fail/off',
      ]
        .filter(Boolean)
        .join(' · ')
    : null;

  return {
    ratesSource: rateBits.join('; ') || 'benchmark defaults',
    occSource: occBits.join('; ') || 'default ramp (30% / 75%)',
    pivotSummary: formatCompRadiusPivotsForPrompt(enriched.comp_radius_pivots) || 'no pivots',
    compCount: comps.length,
    pastReportCompCount: past,
    webCompCount: web,
    stvrSummary,
  };
}

function setState<T>(av: AssumptionValue<T>, state: AssumptionState): AssumptionValue<T> {
  return { value: av.value, state };
}

/** Promote all judgment drivers to analyst_set (or locked). */
export function markAssumptionsReviewed(
  assumptions: FeasibilityAssumptions,
  state: AssumptionState = 'analyst_set'
): FeasibilityAssumptions {
  return {
    units: assumptions.units.map((u) => setState(u, state)),
    lowSeasonMonths: setState(assumptions.lowSeasonMonths, state),
    peakSeasonMonths: setState(assumptions.peakSeasonMonths, state),
    occupancyRamp: setState(assumptions.occupancyRamp, state),
    adrGrowth: setState(assumptions.adrGrowth, state),
    expenseGrowth: setState(assumptions.expenseGrowth, state),
    miscRevenuePct: setState(assumptions.miscRevenuePct, state),
    softCostPct: setState(assumptions.softCostPct, state),
    contingencyPct: setState(assumptions.contingencyPct, state),
    ffePct: setState(assumptions.ffePct, state),
    preOpeningPerUnit: setState(assumptions.preOpeningPerUnit, state),
    realMarketAdj: setState(assumptions.realMarketAdj, state),
    landCost: setState(assumptions.landCost, state),
    loanToCost: setState(assumptions.loanToCost, state),
    interestRate: setState(assumptions.interestRate, state),
    loanTermYears: setState(assumptions.loanTermYears, state),
    assessmentRatio: setState(assumptions.assessmentRatio, state),
    millLevy: setState(assumptions.millLevy, state),
    expenses: setState(assumptions.expenses, state),
    exitCapRate: setState(assumptions.exitCapRate, state),
    sellingCostPct: setState(assumptions.sellingCostPct, state),
  };
}

/** Patch unit ADR/occ from a flat UI edit row. */
export function patchUnitAssumption(
  assumptions: FeasibilityAssumptions,
  unitType: string,
  patch: Partial<{
    lowAdr: number;
    peakAdr: number;
    lowOccupancy: number;
    peakOccupancy: number;
    quantity: number;
  }>,
  state: AssumptionState = 'analyst_set'
): FeasibilityAssumptions {
  return {
    ...assumptions,
    units: assumptions.units.map((u) => {
      if (u.value.unitType !== unitType) return u;
      return {
        state,
        value: {
          ...u.value,
          ...patch,
        },
      };
    }),
  };
}
