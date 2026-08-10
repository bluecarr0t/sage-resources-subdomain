/**
 * Glamping XLSX driver-cell atlas (foundation: GLAMPING TEMPLATE 3-12-26).
 * Writes INPUT cells only — never overwrite formula outputs on PF/IRR sheets.
 */

export type DriverCell = {
  sheet: string;
  cell: string;
  /** Path into FeasibilityModelOutput / EnrichedInput via applyXlsxDriverMap */
  key: string;
};

export const GLAMPING_RATE_DRIVER_ROWS = [
  { low: 'C11', peak: 'D11' },
  { low: 'C12', peak: 'D12' },
  { low: 'C23', peak: 'D23' },
  { low: 'C24', peak: 'D24' },
  { low: 'C25', peak: 'D25' },
  { low: 'C36', peak: 'D36' },
  { low: 'C37', peak: 'D37' },
] as const;

export const GLAMPING_OCC_DRIVER_ROWS = [
  { low: 'C14', peak: 'D14' },
  { low: 'C15', peak: 'D15' },
  { low: 'C16', peak: 'D16' },
  { low: 'C17', peak: 'D17' },
  { low: 'C18', peak: 'D18' },
  { low: 'C19', peak: 'D19' },
  { low: 'C20', peak: 'D20' },
] as const;

/**
 * ToT financing INPUTS only (LTC, interest decimal, term).
 * C61/C63/C64 are formulas in the foundation template — never write those.
 */
export const GLAMPING_TOT_FINANCING_DRIVERS: DriverCell[] = [
  { sheet: 'ToT (Intake Form)', cell: 'C62', key: 'assumptions.loanToCost' },
  { sheet: 'ToT (Intake Form)', cell: 'C65', key: 'assumptions.interestRate' },
  { sheet: 'ToT (Intake Form)', cell: 'C66', key: 'assumptions.loanTermYears' },
];

/** Soft cost / land inputs when cells are not formulas (formula-safe skip otherwise). */
export const GLAMPING_COST_DRIVERS: DriverCell[] = [
  { sheet: 'Total Proj. Cost', cell: 'C14', key: 'costs.softCosts' },
  { sheet: 'Total Proj. Cost', cell: 'C16', key: 'costs.land' },
];

/** Unit-type label cells to rewrite from unit_mix (clear Mirror Cabin leftovers). */
export const GLAMPING_UNIT_LABEL_CELLS: Array<{ sheet: string; cells: string[] }> = [
  { sheet: 'Rates Proj', cells: ['B11', 'B12', 'B23', 'B24', 'B25', 'B36', 'B37'] },
  { sheet: 'Occ. Proj', cells: ['B14', 'B15', 'B16', 'B17', 'B18', 'B19', 'B20'] },
  { sheet: '10 yr PF', cells: ['B3', 'B8'] },
  { sheet: 'Monthly PF', cells: ['D4', 'R4'] },
];
