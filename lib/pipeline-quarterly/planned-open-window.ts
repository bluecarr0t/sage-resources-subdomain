import {
  normalizePlannedOpenDate,
  parsePlannedOpenDateField,
  todayUtcDateString,
} from '@/lib/glamping-planned-open';

export const PIPELINE_OPENING_FORECAST_DAYS = 90;
export const PIPELINE_OPENING_FORECAST_MONTHS = 6;

function addUtcCalendarDays(isoDate: string, days: number): string {
  const normalized = normalizePlannedOpenDate(isoDate);
  if (!normalized) {
    throw new Error(`Invalid date: ${isoDate}`);
  }
  const [y, m, d] = normalized.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function addUtcCalendarMonths(isoDate: string, months: number): string {
  const normalized = normalizePlannedOpenDate(isoDate);
  if (!normalized) {
    throw new Error(`Invalid date: ${isoDate}`);
  }
  const [y, m, d] = normalized.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCMonth(dt.getUTCMonth() + months);
  return dt.toISOString().slice(0, 10);
}

function normalizeAsOfDate(asOfDate?: string): string {
  const fromArg = asOfDate ? normalizePlannedOpenDate(asOfDate.slice(0, 10)) : null;
  return fromArg ?? todayUtcDateString();
}

export function isPlannedOpenWithinDays(
  plannedOpenDate: string | null | undefined,
  withinDays: number,
  asOfDate?: string
): boolean {
  const planned = parsePlannedOpenDateField(plannedOpenDate);
  if (!planned) return false;

  const asOf = normalizeAsOfDate(asOfDate);
  const end = addUtcCalendarDays(asOf, withinDays);
  return planned >= asOf && planned <= end;
}

export function isPlannedOpenWithinMonths(
  plannedOpenDate: string | null | undefined,
  withinMonths: number,
  asOfDate?: string
): boolean {
  const planned = parsePlannedOpenDateField(plannedOpenDate);
  if (!planned) return false;

  const asOf = normalizeAsOfDate(asOfDate);
  const end = addUtcCalendarMonths(asOf, withinMonths);
  return planned >= asOf && planned <= end;
}

export type PipelineOpeningWithinWindow = {
  propertyCount: number;
  unitCount: number;
};

export function summarizePipelineOpeningWithinDays(
  properties: readonly {
    plannedOpenDate: string | null;
    units: number;
  }[],
  withinDays: number = PIPELINE_OPENING_FORECAST_DAYS,
  asOfDate?: string
): PipelineOpeningWithinWindow {
  let propertyCount = 0;
  let unitCount = 0;

  for (const property of properties) {
    if (!isPlannedOpenWithinDays(property.plannedOpenDate, withinDays, asOfDate)) {
      continue;
    }
    propertyCount += 1;
    unitCount += property.units;
  }

  return { propertyCount, unitCount };
}

export function summarizePipelineOpeningWithinMonths(
  properties: readonly {
    plannedOpenDate: string | null;
    units: number;
  }[],
  withinMonths: number = PIPELINE_OPENING_FORECAST_MONTHS,
  asOfDate?: string
): PipelineOpeningWithinWindow {
  let propertyCount = 0;
  let unitCount = 0;

  for (const property of properties) {
    if (!isPlannedOpenWithinMonths(property.plannedOpenDate, withinMonths, asOfDate)) {
      continue;
    }
    propertyCount += 1;
    unitCount += property.units;
  }

  return { propertyCount, unitCount };
}
