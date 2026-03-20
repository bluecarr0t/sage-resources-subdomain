import type { SiteDesignResults, SiteTypeConfig } from '@/lib/site-design/types';

export interface BuildSiteDesignExportDataInput {
  grossAcres: number | '';
  usablePct: number | '';
  roadWidth: number | '';
  blockEfficiency: number | '';
  operatingNights: number | '';
  operatingExpenseRatio: number | '';
  capRate: number | '';
  autoFillRemainingLand: boolean;
  siteTypes: SiteTypeConfig[];
  results: SiteDesignResults;
}

export function buildSiteDesignExportData(input: BuildSiteDesignExportDataInput) {
  const inputsRows = [
    { param: 'Gross acres', value: input.grossAcres },
    { param: 'Usable %', value: input.usablePct },
    { param: 'Road width (ft)', value: input.roadWidth },
    { param: 'Block efficiency', value: input.blockEfficiency },
    { param: 'Operating nights/year', value: input.operatingNights },
    { param: 'Operating expense ratio %', value: input.operatingExpenseRatio },
    { param: 'Cap rate %', value: input.capRate === '' ? '' : input.capRate },
    { param: 'Auto-fill remaining land', value: input.autoFillRemainingLand ? 'Yes' : 'No' },
  ];

  const siteTypeRows = input.siteTypes.map((st) => ({
    name: st.name,
    width: st.width,
    depth: st.depth,
    adr: st.adr,
    occupancy: st.occupancy,
    count: st.count === '' ? '' : st.count,
    devCost: st.devCost,
  }));

  const resultsRows = [
    { metric: 'Net usable acres', value: input.results.netUsableAcres.toFixed(2) },
    { metric: 'Total sites', value: input.results.totalSites },
    { metric: 'Annual revenue', value: input.results.annualRevenue },
    { metric: 'Revenue per acre', value: input.results.revenuePerAcre.toFixed(0) },
    { metric: 'Land used (acres)', value: (input.results.totalLandUsed / 43_560).toFixed(2) },
    { metric: 'NOI', value: input.results.noi.toFixed(0) },
    { metric: 'NOI per acre', value: input.results.noiPerAcre.toFixed(0) },
    { metric: 'Total dev cost', value: input.results.totalDevCost },
    {
      metric: 'Est. value',
      value: input.results.estimatedValue != null ? input.results.estimatedValue.toFixed(0) : '',
    },
  ];

  const breakdownRows = input.results.siteCountBreakdown
    .filter((b) => b.count > 0)
    .map((b) => ({ type: b.name, count: b.count, autoFilled: b.isAutoFilled }));

  return {
    inputsRows,
    siteTypeRows,
    resultsRows,
    breakdownRows,
    fileName: `site-design-${new Date().toISOString().slice(0, 10)}.xlsx`,
  };
}
