/**
 * Feasibility financial model — typed intake, assumptions, and outputs.
 * Mirrors the Sage workbook chain (ToT → costs → rates → occ → PF → financing → IRR).
 */

export type AssumptionState = 'proposed' | 'analyst_set' | 'locked';

export interface AssumptionValue<T> {
  value: T;
  state: AssumptionState;
}

export interface UnitRateAssumption {
  unitType: string;
  quantity: number;
  /** Low-season daily rate */
  lowAdr: number;
  /** Peak-season daily rate */
  peakAdr: number;
  /** Stabilized low-season occupancy (0–1) */
  lowOccupancy: number;
  /** Stabilized peak-season occupancy (0–1) */
  peakOccupancy: number;
}

export interface FeasibilityAssumptions {
  /** Per-unit-type rate & occupancy drivers */
  units: AssumptionValue<UnitRateAssumption>[];
  /** Low-season month count (default 4) */
  lowSeasonMonths: AssumptionValue<number>;
  /** Peak-season month count (default 8) */
  peakSeasonMonths: AssumptionValue<number>;
  /** Occupancy ramp as fraction of stabilized: Y1..Y5 (e.g. 0.6, 0.75, 0.9, 0.975, 1) */
  occupancyRamp: AssumptionValue<number[]>;
  /** ADR YoY growth (e.g. 0.03) */
  adrGrowth: AssumptionValue<number>;
  /** Expense YoY growth (e.g. 0.025) */
  expenseGrowth: AssumptionValue<number>;
  /** Misc revenue as fraction of lodging revenue */
  miscRevenuePct: AssumptionValue<number>;
  /** Soft costs as fraction of hard costs */
  softCostPct: AssumptionValue<number>;
  /** Contingency as fraction of hard costs */
  contingencyPct: AssumptionValue<number>;
  /** FF&E as fraction of unit costs */
  ffePct: AssumptionValue<number>;
  /** Pre-opening $ per unit */
  preOpeningPerUnit: AssumptionValue<number>;
  /** Real-market cost multiplier on site/unit costs (e.g. 1.0–1.3) */
  realMarketAdj: AssumptionValue<number>;
  /** Land / acquisition cost */
  landCost: AssumptionValue<number>;
  /** Loan-to-cost (e.g. 0.75) */
  loanToCost: AssumptionValue<number>;
  /** Annual interest rate as decimal (e.g. 0.095) */
  interestRate: AssumptionValue<number>;
  /** Loan term years */
  loanTermYears: AssumptionValue<number>;
  /** Assessment ratio for RE taxes (e.g. 0.5) */
  assessmentRatio: AssumptionValue<number>;
  /** Mill levy as decimal (e.g. 0.049846) */
  millLevy: AssumptionValue<number>;
  /** Expense ratios / $ per site (annual, stabilized Year 5 basis) */
  expenses: AssumptionValue<{
    payrollPerSite: number;
    creditCardPct: number;
    roomTurnoverPerSite: number;
    gAndAPerSite: number;
    marketingPct: number;
    marketingYear1Override: number | null;
    marketingYear2Override: number | null;
    repairsPerSite: number;
    utilitiesPerSite: number;
    managementPct: number;
    insurancePerSite: number;
    legalPerSite: number;
    reservesPct: number;
  }>;
  /** Cap / terminal rate for reversion (e.g. 0.085) */
  exitCapRate: AssumptionValue<number>;
  /** Selling cost on reversion (e.g. 0.05) */
  sellingCostPct: AssumptionValue<number>;
}

export interface FeasibilityProjectInput {
  propertyName: string;
  city: string;
  state: string;
  county?: string;
  acres?: number;
  parcelNumber?: string;
  unitMix: Array<{ type: string; count: number }>;
  /** Hard site+unit costs before soft/contingency (from Site Builder or override) */
  hardCostOverride?: number;
  /** Site development portion of hard costs */
  siteDevCost?: number;
  /** Unit cost portion of hard costs */
  unitCost?: number;
  /** Additional building improvements */
  addBldgCost?: number;
}

export interface YearProFormaRow {
  year: number;
  lodgingRevenue: number;
  miscRevenue: number;
  totalRevenue: number;
  expenses: number;
  propertyTaxes: number;
  noi: number;
  expenseRatio: number;
  occupancyWeighted: number;
  adrWeighted: number;
}

/** Year-1 monthly pro forma row (matches Monthly PF sheet shape) */
export interface MonthProFormaRow {
  month: number;
  monthName: string;
  isPeak: boolean;
  lodgingRevenue: number;
  miscRevenue: number;
  totalRevenue: number;
  expenses: number;
  propertyTaxes: number;
  noi: number;
  occupancyWeighted: number;
  adrWeighted: number;
}

export interface FinancingMetrics {
  totalDevelopmentCost: number;
  loanAmount: number;
  equityAmount: number;
  annualDebtService: number;
  monthlyPayment: number;
  mortgageConstant: number;
  dcrByYear: number[];
  cashOnCashByYear: number[];
  paybackYears: number | null;
}

export interface FeasibilityModelOutput {
  costs: {
    siteDev: number;
    unitCosts: number;
    addBldg: number;
    hardCosts: number;
    softCosts: number;
    contingency: number;
    ffe: number;
    preOpening: number;
    land: number;
    totalDevelopmentCost: number;
  };
  reTaxes: {
    assessedValue: number;
    annualTax: number;
  };
  rates: Array<{
    unitType: string;
    quantity: number;
    lowAdr: number;
    peakAdr: number;
    year1WeightedAdr: number;
  }>;
  occupancy: Array<{
    unitType: string;
    lowOccupancy: number;
    peakOccupancy: number;
    stabilizedWeighted: number;
    ramp: number[];
  }>;
  proForma: YearProFormaRow[];
  /** Year-1 monthly breakdown (12 rows) */
  monthlyProForma: MonthProFormaRow[];
  financing: FinancingMetrics;
  irr: {
    equityIrr10Year: number | null;
    terminalValue: number;
    year10EquityCashFlow: number;
  };
  assumptionsUsed: FeasibilityAssumptions;
}
