/**
 * Propose default assumptions from enriched comps / input (state: proposed).
 */

import type { EnrichedInput } from '@/lib/ai-report-builder/types';
import type {
  AssumptionValue,
  FeasibilityAssumptions,
  UnitRateAssumption,
} from './types';

function proposed<T>(value: T): AssumptionValue<T> {
  return { value, state: 'proposed' };
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/**
 * Build proposed assumptions from enriched report input.
 * Uses quality-adjusted comp ADRs / occupancy when available.
 */
export function proposeAssumptions(enriched: EnrichedInput): FeasibilityAssumptions {
  const comps = enriched.nearby_comps ?? [];
  const lowAdrs = comps.map((c) => c.low_rate ?? c.avg_retail_daily_rate).filter((n): n is number => n != null && n > 0);
  const peakAdrs = comps.map((c) => c.high_rate ?? c.avg_retail_daily_rate).filter((n): n is number => n != null && n > 0);
  const lowOccs = comps.map((c) => c.low_occupancy).filter((n): n is number => n != null && n > 0);
  const peakOccs = comps.map((c) => c.peak_occupancy).filter((n): n is number => n != null && n > 0);

  // Occupancy may be stored as percent (30) or fraction (0.3)
  const normOcc = (v: number) => (v > 1 ? v / 100 : v);

  // Prefer STVR / market-table occupancy when past-report occ is sparse
  const stvrOcc = enriched.stvr_indicators?.avg_occupancy
    ?? enriched.stvr_indicators?.airdna?.occupancy
    ?? null;
  const stvrAdr = enriched.stvr_indicators?.avg_adr
    ?? enriched.stvr_indicators?.airdna?.adr
    ?? null;
  const pivotAdr =
    enriched.comp_radius_pivots?.buckets.find((b) => b.radius_miles === 50)?.avg_adr
    ?? enriched.comp_radius_pivots?.buckets[0]?.avg_adr
    ?? null;

  const defaultLowAdr = avg(lowAdrs) ?? pivotAdr ?? stvrAdr ?? enriched.benchmarks?.[0]?.avg_low_adr ?? 150;
  const defaultPeakAdr = avg(peakAdrs) ?? (pivotAdr != null ? pivotAdr * 1.25 : null) ?? stvrAdr ?? enriched.benchmarks?.[0]?.avg_peak_adr ?? 250;

  let defaultLowOcc = avg(lowOccs.map(normOcc));
  let defaultPeakOcc = avg(peakOccs.map(normOcc));
  if (defaultLowOcc == null && stvrOcc != null) {
    defaultLowOcc = Math.max(0.15, stvrOcc * 0.55);
  }
  if (defaultPeakOcc == null && stvrOcc != null) {
    defaultPeakOcc = Math.min(0.95, Math.max(stvrOcc, stvrOcc * 1.15));
  }
  defaultLowOcc = defaultLowOcc ?? 0.3;
  defaultPeakOcc = defaultPeakOcc ?? 0.75;

  const units: AssumptionValue<UnitRateAssumption>[] =
    enriched.unit_mix.length > 0
      ? enriched.unit_mix.map((u) => {
          const catBench = enriched.benchmarks?.find(
            (b) => b.unit_category.toLowerCase() === u.type.toLowerCase()
          );
          return proposed({
            unitType: u.type,
            quantity: u.count,
            lowAdr: catBench?.avg_low_adr ?? defaultLowAdr,
            peakAdr: catBench?.avg_peak_adr ?? defaultPeakAdr,
            lowOccupancy: defaultLowOcc,
            peakOccupancy: defaultPeakOcc,
          });
        })
      : [
          proposed({
            unitType: 'Unit',
            quantity: 1,
            lowAdr: defaultLowAdr,
            peakAdr: defaultPeakAdr,
            lowOccupancy: defaultLowOcc,
            peakOccupancy: defaultPeakOcc,
          }),
        ];

  return {
    units,
    lowSeasonMonths: proposed(4),
    peakSeasonMonths: proposed(8),
    occupancyRamp: proposed([0.6, 0.75, 0.9, 0.975, 1.0]),
    adrGrowth: proposed(0.03),
    expenseGrowth: proposed(0.025),
    miscRevenuePct: proposed(0.1),
    softCostPct: proposed(enriched.soft_cost_pct ?? 0.1),
    contingencyPct: proposed(0.1),
    ffePct: proposed(0.125),
    preOpeningPerUnit: proposed(2000),
    realMarketAdj: proposed(1.0),
    landCost: proposed(enriched.land_cost ?? 0),
    loanToCost: proposed(enriched.loan_to_cost ?? 0.75),
    interestRate: proposed((enriched.interest_rate_pct ?? 9.5) / 100),
    loanTermYears: proposed(enriched.loan_term_years ?? 25),
    assessmentRatio: proposed(enriched.assessment_ratio ?? 0.5),
    millLevy: proposed((enriched.mill_levy_pct ?? 2.5) / 100),
    expenses: proposed({
      payrollPerSite: 2000,
      creditCardPct: 0.03,
      roomTurnoverPerSite: 800,
      gAndAPerSite: 1100,
      marketingPct: 0.025,
      marketingYear1Override: 200_000,
      marketingYear2Override: 150_000,
      repairsPerSite: 1500,
      utilitiesPerSite: 1500,
      managementPct: 0.05,
      insurancePerSite: 900,
      legalPerSite: 250,
      reservesPct: 0.03,
    }),
    exitCapRate: proposed(0.085),
    sellingCostPct: proposed(0.05),
  };
}
