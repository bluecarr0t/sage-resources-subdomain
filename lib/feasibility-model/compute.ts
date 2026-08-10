/**
 * Deterministic feasibility model engine.
 * Chain: costs → RE taxes → rates → occupancy → 10-yr PF → financing → IRR
 */

import type {
  FeasibilityAssumptions,
  FeasibilityModelOutput,
  FeasibilityProjectInput,
  FinancingMetrics,
  MonthProFormaRow,
  YearProFormaRow,
} from './types';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round0(n: number): number {
  return Math.round(n);
}

/** Monthly payment for fully amortizing loan */
export function monthlyLoanPayment(principal: number, annualRate: number, termYears: number): number {
  if (principal <= 0) return 0;
  const n = termYears * 12;
  if (annualRate <= 0) return principal / n;
  const r = annualRate / 12;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

/**
 * IRR via Newton-Raphson on annual cash flows (CF0 is typically negative equity).
 * Returns null if it fails to converge.
 */
export function computeIrr(cashFlows: number[], guess = 0.15): number | null {
  if (cashFlows.length < 2) return null;
  let rate = guess;
  for (let i = 0; i < 50; i++) {
    let npv = 0;
    let dnpv = 0;
    for (let t = 0; t < cashFlows.length; t++) {
      const denom = Math.pow(1 + rate, t);
      npv += cashFlows[t] / denom;
      if (t > 0) dnpv -= (t * cashFlows[t]) / Math.pow(1 + rate, t + 1);
    }
    if (Math.abs(dnpv) < 1e-12) break;
    const next = rate - npv / dnpv;
    if (!Number.isFinite(next)) return null;
    if (Math.abs(next - rate) < 1e-7) return next;
    rate = next;
  }
  return Number.isFinite(rate) ? rate : null;
}

function weightedAdr(low: number, peak: number, lowMonths: number, peakMonths: number): number {
  const total = lowMonths + peakMonths;
  if (total <= 0) return (low + peak) / 2;
  return (low * lowMonths + peak * peakMonths) / total;
}

function weightedOcc(low: number, peak: number, lowMonths: number, peakMonths: number): number {
  return weightedAdr(low, peak, lowMonths, peakMonths);
}

/**
 * Run the full feasibility model.
 */
export function runFeasibilityModel(
  project: FeasibilityProjectInput,
  assumptions: FeasibilityAssumptions
): FeasibilityModelOutput {
  const a = assumptions;
  const totalUnits = a.units.reduce((s, u) => s + u.value.quantity, 0) || 1;
  const lowM = a.lowSeasonMonths.value;
  const peakM = a.peakSeasonMonths.value;
  const adj = a.realMarketAdj.value;

  const siteDev = round0((project.siteDevCost ?? 0) * adj);
  const unitCosts = round0((project.unitCost ?? 0) * adj);
  const addBldg = round0((project.addBldgCost ?? 0) * adj);
  let hardCosts = siteDev + unitCosts + addBldg;
  if (project.hardCostOverride != null && project.hardCostOverride > 0) {
    hardCosts = round0(project.hardCostOverride * adj);
  }
  if (hardCosts <= 0 && project.hardCostOverride == null) {
    // Fallback: $180k/unit placeholder when no cost data
    hardCosts = round0(totalUnits * 180_000 * adj);
  }

  const softCosts = round0(hardCosts * a.softCostPct.value);
  const contingency = round0(hardCosts * a.contingencyPct.value);
  const ffe = round0(unitCosts * a.ffePct.value || hardCosts * a.ffePct.value * 0.5);
  const preOpening = round0(totalUnits * a.preOpeningPerUnit.value);
  const land = round0(a.landCost.value);
  const totalDevelopmentCost = hardCosts + softCosts + contingency + ffe + preOpening + land;

  const assessedValue = round0(hardCosts * a.assessmentRatio.value);
  const annualTax = round0(assessedValue * a.millLevy.value);

  const rates = a.units.map((u) => ({
    unitType: u.value.unitType,
    quantity: u.value.quantity,
    lowAdr: u.value.lowAdr,
    peakAdr: u.value.peakAdr,
    year1WeightedAdr: round2(weightedAdr(u.value.lowAdr, u.value.peakAdr, lowM, peakM)),
  }));

  const ramp = a.occupancyRamp.value;
  const occupancy = a.units.map((u) => {
    const stabilized = weightedOcc(u.value.lowOccupancy, u.value.peakOccupancy, lowM, peakM);
    return {
      unitType: u.value.unitType,
      lowOccupancy: u.value.lowOccupancy,
      peakOccupancy: u.value.peakOccupancy,
      stabilizedWeighted: round2(stabilized),
      ramp: ramp.map((r) => round2(stabilized * r)),
    };
  });

  const exp = a.expenses.value;
  const proForma: YearProFormaRow[] = [];

  for (let year = 1; year <= 10; year++) {
    const rampIdx = Math.min(year - 1, ramp.length - 1);
    const rampFactor = ramp[rampIdx] ?? 1;
    const adrGrowthFactor = Math.pow(1 + a.adrGrowth.value, year - 1);

    let lodgingRevenue = 0;
    let occWeightedSum = 0;
    let adrWeightedSum = 0;
    let unitWeight = 0;

    for (const u of a.units) {
      const qty = u.value.quantity;
      const baseAdr = weightedAdr(u.value.lowAdr, u.value.peakAdr, lowM, peakM) * adrGrowthFactor;
      const baseOcc = weightedOcc(u.value.lowOccupancy, u.value.peakOccupancy, lowM, peakM);
      const occ = Math.min(1, baseOcc * rampFactor);
      const siteNights = qty * 365 * occ;
      lodgingRevenue += siteNights * baseAdr;
      occWeightedSum += occ * qty;
      adrWeightedSum += baseAdr * qty;
      unitWeight += qty;
    }

    const miscRevenue = lodgingRevenue * a.miscRevenuePct.value;
    const totalRevenue = lodgingRevenue + miscRevenue;

    const expenseGrowthFactor = Math.pow(1 + a.expenseGrowth.value, year - 1);
    let operating =
      (exp.payrollPerSite +
        exp.roomTurnoverPerSite +
        exp.gAndAPerSite +
        exp.repairsPerSite +
        exp.utilitiesPerSite +
        exp.insurancePerSite +
        exp.legalPerSite) *
      totalUnits *
      expenseGrowthFactor;

    operating += totalRevenue * exp.creditCardPct;
    operating += totalRevenue * exp.managementPct;
    if (year >= 3) operating += totalRevenue * exp.reservesPct;

    let marketing = totalRevenue * exp.marketingPct;
    if (year === 1 && exp.marketingYear1Override != null) marketing = exp.marketingYear1Override;
    if (year === 2 && exp.marketingYear2Override != null) marketing = exp.marketingYear2Override;
    operating += marketing;

    const propertyTaxes = year === 1 ? Math.min(annualTax, annualTax * 0.1 + 5000) : annualTax;
    const expenses = operating + propertyTaxes;
    const noi = totalRevenue - expenses;

    proForma.push({
      year,
      lodgingRevenue: round0(lodgingRevenue),
      miscRevenue: round0(miscRevenue),
      totalRevenue: round0(totalRevenue),
      expenses: round0(expenses),
      propertyTaxes: round0(propertyTaxes),
      noi: round0(noi),
      expenseRatio: totalRevenue > 0 ? round2(expenses / totalRevenue) : 0,
      occupancyWeighted: unitWeight > 0 ? round2(occWeightedSum / unitWeight) : 0,
      adrWeighted: unitWeight > 0 ? round2(adrWeightedSum / unitWeight) : 0,
    });
  }

  const loanAmount = round0(totalDevelopmentCost * a.loanToCost.value);
  const equityAmount = round0(totalDevelopmentCost - loanAmount);
  const monthlyPayment = monthlyLoanPayment(loanAmount, a.interestRate.value, a.loanTermYears.value);
  const annualDebtService = round0(monthlyPayment * 12);
  const mortgageConstant = loanAmount > 0 ? annualDebtService / loanAmount : 0;

  const dcrByYear = proForma.map((y) =>
    annualDebtService > 0 ? round2(y.noi / annualDebtService) : 0
  );
  const cashOnCashByYear = proForma.map((y) => {
    const cfe = y.noi - annualDebtService;
    return equityAmount > 0 ? round2(cfe / equityAmount) : 0;
  });

  let paybackYears: number | null = null;
  let cumulative = -equityAmount;
  for (const y of proForma) {
    cumulative += y.noi - annualDebtService;
    if (cumulative >= 0) {
      paybackYears = y.year;
      break;
    }
  }

  const financing: FinancingMetrics = {
    totalDevelopmentCost,
    loanAmount,
    equityAmount,
    annualDebtService,
    monthlyPayment: round2(monthlyPayment),
    mortgageConstant: round2(mortgageConstant),
    dcrByYear,
    cashOnCashByYear,
    paybackYears,
  };

  // Year-10 terminal: NOI_11 ≈ NOI_10 * (1+g) / exit cap, less selling costs, less remaining mortgage
  const noi10 = proForma[9]?.noi ?? 0;
  const noi11 = noi10 * (1 + a.adrGrowth.value);
  const grossTerminal = a.exitCapRate.value > 0 ? noi11 / a.exitCapRate.value : 0;
  const terminalValue = round0(grossTerminal * (1 - a.sellingCostPct.value));

  // Remaining mortgage balance after 10 years of payments
  const remainingBalance = remainingLoanBalance(
    loanAmount,
    a.interestRate.value,
    a.loanTermYears.value,
    10
  );
  const year10EquityCashFlow = round0(
    (proForma[9]?.noi ?? 0) - annualDebtService + terminalValue - remainingBalance
  );

  const equityCashFlows = [
    -equityAmount,
    ...proForma.slice(0, 9).map((y) => y.noi - annualDebtService),
    year10EquityCashFlow,
  ];
  const equityIrr = computeIrr(equityCashFlows);

  // Year-1 monthly PF: first lowSeasonMonths are low; remaining are peak
  const MONTH_NAMES = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const y1 = proForma[0];
  const monthlyProForma: MonthProFormaRow[] = [];
  if (y1) {
    const peakShare = peakM / 12;
    const lowShare = lowM / 12;
    // Allocate annual Y1 across months with peak months getting higher weight
    let peakWeight = 0;
    let lowWeight = 0;
    for (let m = 0; m < 12; m++) {
      const isPeak = m >= lowM; // months after low season block treated as peak
      if (isPeak) peakWeight += 1.35;
      else lowWeight += 1;
    }
    const totalWeight = peakWeight + lowWeight || 12;
    for (let m = 0; m < 12; m++) {
      const isPeak = m >= lowM;
      const w = (isPeak ? 1.35 : 1) / totalWeight;
      const lodgingRevenue = round0(y1.lodgingRevenue * w);
      const miscRevenue = round0(y1.miscRevenue * w);
      const totalRevenue = lodgingRevenue + miscRevenue;
      const expenses = round0(y1.expenses * w);
      const propertyTaxes = round0(y1.propertyTaxes * w);
      const noi = totalRevenue - expenses;
      monthlyProForma.push({
        month: m + 1,
        monthName: MONTH_NAMES[m],
        isPeak,
        lodgingRevenue,
        miscRevenue,
        totalRevenue,
        expenses,
        propertyTaxes,
        noi,
        occupancyWeighted: y1.occupancyWeighted * (isPeak ? 1.05 : 0.9),
        adrWeighted: y1.adrWeighted * (isPeak ? 1.1 : 0.85),
      });
    }
    void peakShare;
    void lowShare;
  }

  return {
    costs: {
      siteDev,
      unitCosts,
      addBldg,
      hardCosts,
      softCosts,
      contingency,
      ffe,
      preOpening,
      land,
      totalDevelopmentCost,
    },
    reTaxes: { assessedValue, annualTax },
    rates,
    occupancy,
    proForma,
    monthlyProForma,
    financing,
    irr: {
      equityIrr10Year: equityIrr != null ? round2(equityIrr) : null,
      terminalValue,
      year10EquityCashFlow,
    },
    assumptionsUsed: assumptions,
  };
}

export function remainingLoanBalance(
  principal: number,
  annualRate: number,
  termYears: number,
  yearsElapsed: number
): number {
  if (principal <= 0) return 0;
  const monthly = monthlyLoanPayment(principal, annualRate, termYears);
  const r = annualRate / 12;
  let bal = principal;
  const payments = Math.min(yearsElapsed * 12, termYears * 12);
  for (let i = 0; i < payments; i++) {
    const interest = bal * r;
    const principalPaid = monthly - interest;
    bal = Math.max(0, bal - principalPaid);
  }
  return round0(bal);
}

/** Build a short metrics blurb for LLM prompts / exec summary */
export function formatModelMetricsForPrompt(output: FeasibilityModelOutput): string {
  const irr = output.irr.equityIrr10Year;
  const y5 = output.proForma[4];
  const dcr5 = output.financing.dcrByYear[4];
  const coc5 = output.financing.cashOnCashByYear[4];
  const lines = [
    `Total Development Cost: $${output.costs.totalDevelopmentCost.toLocaleString()}`,
    `Loan: $${output.financing.loanAmount.toLocaleString()} (${(output.assumptionsUsed.loanToCost.value * 100).toFixed(0)}% LTC) | Equity: $${output.financing.equityAmount.toLocaleString()}`,
    `Annual Debt Service: $${output.financing.annualDebtService.toLocaleString()}`,
    y5
      ? `Year 5: Revenue $${y5.totalRevenue.toLocaleString()}, NOI $${y5.noi.toLocaleString()}, DCR ${dcr5?.toFixed(2) ?? 'n/a'}, Cash-on-Cash ${(coc5 * 100).toFixed(1)}%`
      : '',
    irr != null
      ? `10-Year Equity IRR: ${(irr * 100).toFixed(1)}%`
      : '10-Year Equity IRR: not computable',
    output.financing.paybackYears != null
      ? `Equity payback: Year ${output.financing.paybackYears}`
      : 'Equity payback: beyond Year 10',
  ];
  return lines.filter(Boolean).join('\n');
}
