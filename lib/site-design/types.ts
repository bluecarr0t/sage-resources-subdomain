export interface SiteTypeConfig {
  id: string;
  name: string;
  width: number;
  depth: number;
  adr: number;
  occupancy: number;
  count: number | '';
  devCost: number;
}

export interface SiteCountBreakdown {
  id: string;
  name: string;
  count: number;
  isAutoFilled: boolean;
}

export interface SiteCalc extends SiteTypeConfig {
  effectiveSqftPerSite: number;
  maxSites: number;
  revenuePerSqft: number;
}

export interface SiteDesignResults {
  netUsableAcres: number;
  netUsableSqft: number;
  usableForSites: number;
  roadPct: number;
  siteCalcs: SiteCalc[];
  siteCountBreakdown: SiteCountBreakdown[];
  bestTypeName: string | null;
  bestTypeRevenuePerSqFt: number | null;
  partialFillTypeName: string | null;
  totalSites: number;
  totalLandUsed: number;
  annualRevenue: number;
  revenuePerAcre: number;
  noi: number;
  noiPerAcre: number;
  totalDevCost: number;
  estimatedValue: number | null;
  hasCounts: boolean;
  hasPartialFill: boolean;
  overCapacity: boolean;
  overCapacitySqft: number;
  overCapacityAcres: number;
}
