/**
 * Feasibility financial model engine (Phase 1).
 */

export type {
  AssumptionState,
  AssumptionValue,
  FeasibilityAssumptions,
  FeasibilityModelOutput,
  FeasibilityProjectInput,
  FinancingMetrics,
  MonthProFormaRow,
  UnitRateAssumption,
  YearProFormaRow,
} from './types';

export { proposeAssumptions } from './propose-assumptions';
export {
  runFeasibilityModel,
  computeIrr,
  monthlyLoanPayment,
  remainingLoanBalance,
  formatModelMetricsForPrompt,
} from './compute';
