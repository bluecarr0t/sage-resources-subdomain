import type { SupabaseClient } from '@supabase/supabase-js';
import { ALL_SAGE_DATA_TABLE } from '@/lib/all-sage-data-table';
import { GLAMPING_IS_OPEN_VALUES } from '@/lib/glamping-is-open';
import { applyIsOpenChangeWithHistory } from '@/lib/glamping-pipeline/status-history';

/** `is_open` value eligible for scheduled open-date flips. */
export const PLANNED_OPEN_ELIGIBLE_IS_OPEN = 'Under Construction' as const;

export function isUnderConstructionIsOpen(
  isOpen: string | null | undefined
): boolean {
  return (isOpen ?? '').trim() === PLANNED_OPEN_ELIGIBLE_IS_OPEN;
}

/** Normalize admin/API input to `YYYY-MM-DD` or null. */
export function normalizePlannedOpenDate(
  raw: string | null | undefined
): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return s;
}

/** UTC calendar date `YYYY-MM-DD` for cron comparisons. */
export function todayUtcDateString(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Parse Sage / Postgres date fields (`YYYY-MM-DD` or ISO timestamp) for display. */
export function parsePlannedOpenDateField(
  raw: string | null | undefined
): string | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  return normalizePlannedOpenDate(trimmed.slice(0, 10));
}

/** Human-readable label for pipeline tables and exports. */
export function formatPlannedOpenDateLabel(
  raw: string | null | undefined
): string {
  const iso = parsePlannedOpenDateField(raw);
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(dt);
}

export function isPlannedOpenDateDue(
  plannedOpenDate: string | null | undefined,
  asOfDate: string
): boolean {
  const d = normalizePlannedOpenDate(plannedOpenDate);
  if (!d) return false;
  const asOf = normalizePlannedOpenDate(asOfDate);
  if (!asOf) return false;
  return d <= asOf;
}

export type PlannedOpenFlipRow = {
  id: number;
  slug: string;
  property_name: string | null;
  planned_open_date: string | null;
  year_site_opened: string | number | null;
};

export function buildPlannedOpenFlipPatch(
  row: PlannedOpenFlipRow,
  asOfDate: string
): Record<string, unknown> {
  const planned = normalizePlannedOpenDate(row.planned_open_date);
  const patch: Record<string, unknown> = {
    is_open: 'Yes',
    planned_open_date: null,
    date_updated: asOfDate,
  };
  if (!row.year_site_opened && planned) {
    patch.year_site_opened = planned.slice(0, 4);
  }
  return patch;
}

/**
 * Apply planned-open-date sanitization on admin PATCH payloads.
 * Clears `planned_open_date` when leaving Under Construction; validates format.
 */
export function sanitizePlannedOpenDatePatch(
  patch: Record<string, unknown>,
  currentIsOpen?: string | null
): { ok: true } | { ok: false; error: string } {
  if (
    'is_open' in patch &&
    typeof patch.is_open === 'string' &&
    !isUnderConstructionIsOpen(patch.is_open)
  ) {
    patch.planned_open_date = null;
  }

  const effectiveIsOpen =
    typeof patch.is_open === 'string'
      ? patch.is_open.trim()
      : (currentIsOpen ?? '').trim();

  if ('planned_open_date' in patch) {
    const normalized = normalizePlannedOpenDate(
      patch.planned_open_date as string | null | undefined
    );
    if (
      patch.planned_open_date != null &&
      String(patch.planned_open_date).trim() !== '' &&
      !normalized
    ) {
      return {
        ok: false,
        error: 'planned_open_date must be YYYY-MM-DD',
      };
    }
    patch.planned_open_date = normalized;
    if (normalized && !isUnderConstructionIsOpen(effectiveIsOpen)) {
      return {
        ok: false,
        error: `planned_open_date is only allowed when is_open is ${PLANNED_OPEN_ELIGIBLE_IS_OPEN}`,
      };
    }
  }

  return { ok: true };
}

export type FlipPlannedOpenResult = {
  flippedCount: number;
  propertyNames: string[];
  asOfDate: string;
};

/**
 * Flip Under Construction rows whose `planned_open_date` is on or before `asOfDate`.
 */
export async function flipDuePlannedOpenProperties(
  supabase: SupabaseClient,
  asOfDate: string = todayUtcDateString()
): Promise<FlipPlannedOpenResult> {
  const asOf = normalizePlannedOpenDate(asOfDate);
  if (!asOf) {
    throw new Error(`Invalid asOfDate: ${asOfDate}`);
  }

  const { data, error } = await supabase
    .from(ALL_SAGE_DATA_TABLE)
    .select('id, slug, property_name, planned_open_date, year_site_opened')
    .eq('is_open', PLANNED_OPEN_ELIGIBLE_IS_OPEN)
    .not('planned_open_date', 'is', null)
    .lte('planned_open_date', asOf);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as PlannedOpenFlipRow[];
  if (rows.length === 0) {
    return { flippedCount: 0, propertyNames: [], asOfDate: asOf };
  }

  const propertyNames = [
    ...new Set(
      rows
        .map((r) => (r.property_name ?? '').trim())
        .filter((n) => n.length > 0)
    ),
  ];

  for (const row of rows) {
    const patch = buildPlannedOpenFlipPatch(row, asOf);

    await applyIsOpenChangeWithHistory(supabase, {
      propertyId: row.id,
      slug: row.slug,
      previousIsOpen: PLANNED_OPEN_ELIGIBLE_IS_OPEN,
      nextIsOpen: 'Yes',
      asOfDate: asOf,
      changeSource: 'planned_open_cron',
      notes: row.planned_open_date
        ? `Planned open date ${row.planned_open_date} reached.`
        : null,
    });

    const { is_open: _isOpen, date_updated: _dateUpdated, ...rest } = patch;
    const { error: updateError } = await supabase
      .from(ALL_SAGE_DATA_TABLE)
      .update(rest)
      .eq('id', row.id);
    if (updateError) {
      throw new Error(
        `Failed to flip property row ${row.id}: ${updateError.message}`
      );
    }
  }

  return {
    flippedCount: rows.length,
    propertyNames,
    asOfDate: asOf,
  };
}

/** Documented allowed `is_open` values (re-export for admin hints). */
export const GLAMPING_IS_OPEN_OPTIONS = GLAMPING_IS_OPEN_VALUES;
