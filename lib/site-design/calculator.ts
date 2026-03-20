import type { SiteDesignResults, SiteTypeConfig } from '@/lib/site-design/types';

export const SQFT_PER_ACRE = 43_560;

export interface ComputeResultsOptions {
  autoFillRemainingLand: boolean;
}

const DEFAULT_OPTIONS: ComputeResultsOptions = {
  autoFillRemainingLand: true,
};

export function roadAllocationPct(roadWidthFt: number): number {
  const pct = 0.12 + (roadWidthFt - 18) * 0.008;
  return Math.max(0.10, Math.min(0.30, pct));
}

export function computeResults(
  grossAcres: number,
  usablePct: number,
  roadWidth: number,
  blockEfficiency: number,
  operatingNights: number,
  operatingExpenseRatio: number,
  capRate: number | null,
  siteTypes: SiteTypeConfig[],
  options: ComputeResultsOptions = DEFAULT_OPTIONS
): SiteDesignResults {
  const netUsableAcres = grossAcres * (usablePct / 100);
  const netUsableSqft = netUsableAcres * SQFT_PER_ACRE;
  const roadPct = roadAllocationPct(roadWidth);
  const usableForSites = netUsableSqft * (1 - roadPct);

  if (siteTypes.length === 0) {
    const noi = 0;
    return {
      netUsableAcres,
      netUsableSqft,
      usableForSites,
      roadPct,
      siteCalcs: [],
      siteCountBreakdown: [],
      bestTypeName: null,
      bestTypeRevenuePerSqFt: null,
      partialFillTypeName: null,
      totalSites: 0,
      totalLandUsed: 0,
      annualRevenue: 0,
      revenuePerAcre: 0,
      noi,
      noiPerAcre: 0,
      totalDevCost: 0,
      estimatedValue: capRate != null && capRate > 0 ? 0 : null,
      hasCounts: false,
      hasPartialFill: false,
      overCapacity: false,
      overCapacitySqft: 0,
      overCapacityAcres: 0,
    };
  }

  const siteCalcs = siteTypes.map((st) => {
    const padSqft = st.width * st.depth;
    const effectiveSqftPerSite = padSqft / blockEfficiency;
    const maxSites = Math.floor(usableForSites / effectiveSqftPerSite);
    const revenuePerSqft =
      effectiveSqftPerSite > 0
        ? (st.adr * (st.occupancy / 100) * operatingNights) / effectiveSqftPerSite
        : 0;
    return {
      ...st,
      effectiveSqftPerSite,
      maxSites,
      revenuePerSqft,
    };
  });

  const hasAnyCount = siteTypes.some((st) => st.count !== '' && Number(st.count) > 0);
  let totalSites = 0;
  let totalLandUsed = 0;
  let annualRevenue = 0;
  let hasPartialFill = false;
  let bestTypeName: string | null = null;
  let bestTypeRevenuePerSqFt: number | null = null;
  let partialFillTypeName: string | null = null;
  const siteCountBreakdown: { id: string; name: string; count: number; isAutoFilled: boolean }[] = [];

  if (hasAnyCount) {
    for (const st of siteCalcs) {
      const c = typeof st.count === 'number' ? st.count : parseInt(String(st.count), 10) || 0;
      totalSites += c;
      totalLandUsed += c * st.effectiveSqftPerSite;
      annualRevenue += c * st.adr * (st.occupancy / 100) * operatingNights;
      siteCountBreakdown.push({ id: st.id, name: st.name, count: c, isAutoFilled: false });
    }
    const remainingLand = usableForSites - totalLandUsed;
    const typesWithNoCount = siteCalcs.filter(
      (sc) => sc.count === '' || (typeof sc.count === 'number' && sc.count === 0)
    );
    if (options.autoFillRemainingLand && remainingLand > 0 && typesWithNoCount.length > 0) {
      const bestRemaining = typesWithNoCount.reduce((a, b) =>
        b.revenuePerSqft > a.revenuePerSqft ? b : a
      );
      const autoFillCount = Math.floor(remainingLand / bestRemaining.effectiveSqftPerSite);
      if (autoFillCount > 0) {
        totalSites += autoFillCount;
        totalLandUsed += autoFillCount * bestRemaining.effectiveSqftPerSite;
        annualRevenue += autoFillCount * bestRemaining.adr * (bestRemaining.occupancy / 100) * operatingNights;
        hasPartialFill = true;
        partialFillTypeName = bestRemaining.name;
        const entry = siteCountBreakdown.find((e) => e.id === bestRemaining.id);
        if (entry) {
          entry.count += autoFillCount;
          entry.isAutoFilled = true;
        } else {
          siteCountBreakdown.push({
            id: bestRemaining.id,
            name: bestRemaining.name,
            count: autoFillCount,
            isAutoFilled: true,
          });
        }
      }
    }
  } else {
    const best = siteCalcs.reduce((a, b) => (b.revenuePerSqft > a.revenuePerSqft ? b : a));
    totalSites = best.maxSites;
    totalLandUsed = totalSites * best.effectiveSqftPerSite;
    annualRevenue = totalSites * best.adr * (best.occupancy / 100) * operatingNights;
    bestTypeName = best.name;
    bestTypeRevenuePerSqFt = best.revenuePerSqft;
    for (const sc of siteCalcs) {
      siteCountBreakdown.push({
        id: sc.id,
        name: sc.name,
        count: sc.id === best.id ? totalSites : 0,
        isAutoFilled: sc.id === best.id,
      });
    }
  }

  const revenuePerAcre = netUsableAcres > 0 ? annualRevenue / netUsableAcres : 0;
  const overCapacity = totalLandUsed > usableForSites;
  const overCapacitySqft = overCapacity ? totalLandUsed - usableForSites : 0;
  const overCapacityAcres = overCapacitySqft / SQFT_PER_ACRE;

  const operatingExpenses = annualRevenue * (operatingExpenseRatio / 100);
  const noi = annualRevenue - operatingExpenses;
  const noiPerAcre = netUsableAcres > 0 ? noi / netUsableAcres : 0;

  let totalDevCost = 0;
  if (hasAnyCount) {
    const enteredCountSum = siteCalcs.reduce(
      (sum, sc) => sum + (typeof sc.count === 'number' ? sc.count : parseInt(String(sc.count), 10) || 0),
      0
    );
    for (const sc of siteCalcs) {
      const c = typeof sc.count === 'number' ? sc.count : parseInt(String(sc.count), 10) || 0;
      totalDevCost += c * sc.devCost;
    }
    if (hasPartialFill) {
      const autoFillCount = totalSites - enteredCountSum;
      const typesWithNoCount = siteCalcs.filter(
        (sc) => sc.count === '' || (typeof sc.count === 'number' && sc.count === 0)
      );
      const bestRemaining = typesWithNoCount.reduce((a, b) =>
        b.revenuePerSqft > a.revenuePerSqft ? b : a
      );
      totalDevCost += autoFillCount * bestRemaining.devCost;
    }
  } else {
    const best = siteCalcs.reduce((a, b) => (b.revenuePerSqft > a.revenuePerSqft ? b : a));
    totalDevCost = totalSites * best.devCost;
  }

  const estimatedValue = capRate != null && capRate > 0 ? noi / (capRate / 100) : null;

  return {
    netUsableAcres,
    netUsableSqft,
    usableForSites,
    roadPct,
    siteCalcs,
    siteCountBreakdown,
    bestTypeName,
    bestTypeRevenuePerSqFt,
    partialFillTypeName,
    totalSites,
    totalLandUsed,
    annualRevenue,
    revenuePerAcre,
    noi,
    noiPerAcre,
    totalDevCost,
    estimatedValue,
    hasCounts: hasAnyCount,
    hasPartialFill,
    overCapacity,
    overCapacitySqft,
    overCapacityAcres,
  };
}
