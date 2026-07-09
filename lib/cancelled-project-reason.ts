/**
 * Canonical cancellation reasons for pipeline projects (`all_sage_data.is_open = Cancelled`).
 * Used by the Sage Data admin editor for structured pattern tracking.
 */

export const CANCELLED_PROJECT_REASONS = [
  'regulatory_denial',
  'developer_withdrawal',
  'community_opposition',
  'environmental_legal',
  'financing_failure',
  'site_disposition',
  'corporate_restructure',
  'other',
] as const;

export type CancelledProjectReason = (typeof CANCELLED_PROJECT_REASONS)[number];

export const CANCELLED_PROJECT_REASON_MSG_KEYS: Record<
  CancelledProjectReason,
  | 'regulatoryDenial'
  | 'developerWithdrawal'
  | 'communityOpposition'
  | 'environmentalLegal'
  | 'financingFailure'
  | 'siteDisposition'
  | 'corporateRestructure'
  | 'other'
> = {
  regulatory_denial: 'regulatoryDenial',
  developer_withdrawal: 'developerWithdrawal',
  community_opposition: 'communityOpposition',
  environmental_legal: 'environmentalLegal',
  financing_failure: 'financingFailure',
  site_disposition: 'siteDisposition',
  corporate_restructure: 'corporateRestructure',
  other: 'other',
};

/** English labels (admin i18n mirrors these under `admin.sageData.cancelledReason.*`). */
export const CANCELLED_PROJECT_REASON_LABELS: Record<CancelledProjectReason, string> = {
  regulatory_denial: 'Regulatory / permit denial',
  developer_withdrawal: 'Developer withdrawal (market / economics)',
  community_opposition: 'Community / neighbor opposition',
  environmental_legal: 'Environmental or legal challenge',
  financing_failure: 'Financing / capital failure',
  site_disposition: 'Site sold or repurposed',
  corporate_restructure: 'Corporate restructure / portfolio shift',
  other: 'Other',
};

const CANCELLED_REASON_SET = new Set<string>(CANCELLED_PROJECT_REASONS);

export function isCancelledProjectReason(value: unknown): value is CancelledProjectReason {
  return typeof value === 'string' && CANCELLED_REASON_SET.has(value);
}

export function cancelledProjectReasonLabel(value: string | null | undefined): string {
  const raw = (value ?? '').trim();
  if (!raw) return '';
  if (isCancelledProjectReason(raw)) return CANCELLED_PROJECT_REASON_LABELS[raw];
  return raw;
}

export const CANCELLED_YEAR_MIN = 1990;

/** Inclusive upper bound for cancellation year (allows near-future pipeline research). */
export function cancelledYearMax(referenceDate = new Date()): number {
  return referenceDate.getUTCFullYear() + 1;
}

export function cancelledYearOptions(referenceDate = new Date()): number[] {
  const max = cancelledYearMax(referenceDate);
  const years: number[] = [];
  for (let y = max; y >= CANCELLED_YEAR_MIN; y -= 1) {
    years.push(y);
  }
  return years;
}

export function isValidCancelledYear(
  value: unknown,
  referenceDate = new Date()
): value is number {
  if (value == null || value === '') return false;
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isInteger(n)) return false;
  return n >= CANCELLED_YEAR_MIN && n <= cancelledYearMax(referenceDate);
}

export function normalizeCancelledYear(
  value: unknown,
  referenceDate = new Date()
): number | null {
  if (value == null || String(value).trim() === '') return null;
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isInteger(n)) return null;
  if (n < CANCELLED_YEAR_MIN || n > cancelledYearMax(referenceDate)) return null;
  return n;
}

type CancelledReasonPatchRow = {
  is_open?: string | null;
  cancelled_reason?: string | null;
  cancelled_reason_notes?: string | null;
  cancelled_year?: string | number | null;
};

/**
 * Normalize cancellation fields on PATCH/POST:
 * - clear reason fields when `is_open` is not Cancelled
 * - validate canonical reason slug when set
 */
export function sanitizeCancelledReasonPatch<T extends CancelledReasonPatchRow>(
  patch: T
): { ok: true } | { ok: false; error: string } {
  const isOpen =
    'is_open' in patch && patch.is_open != null
      ? String(patch.is_open).trim()
      : undefined;

  if (isOpen !== undefined && isOpen !== 'Cancelled') {
    patch.cancelled_reason = null;
    patch.cancelled_reason_notes = null;
    patch.cancelled_year = null;
    return { ok: true };
  }

  if ('cancelled_reason' in patch) {
    const raw = patch.cancelled_reason;
    if (raw == null || String(raw).trim() === '') {
      patch.cancelled_reason = null;
    } else if (!isCancelledProjectReason(String(raw).trim())) {
      return {
        ok: false,
        error: `cancelled_reason must be one of: ${CANCELLED_PROJECT_REASONS.join(', ')}`,
      };
    } else {
      patch.cancelled_reason = String(raw).trim();
    }
  }

  if ('cancelled_reason_notes' in patch) {
    const notes = patch.cancelled_reason_notes;
    patch.cancelled_reason_notes =
      notes == null || String(notes).trim() === '' ? null : String(notes).trim();
  }

  if ('cancelled_year' in patch) {
    const raw = patch.cancelled_year;
    if (raw == null || String(raw).trim() === '') {
      patch.cancelled_year = null;
    } else {
      const normalized = normalizeCancelledYear(raw);
      if (normalized == null) {
        return {
          ok: false,
          error: `cancelled_year must be an integer from ${CANCELLED_YEAR_MIN} through ${cancelledYearMax()}`,
        };
      }
      patch.cancelled_year = normalized;
    }
  }

  return { ok: true };
}

export const CANCELLED_REASON_PROPAGATE_KEYS = [
  'cancelled_reason',
  'cancelled_reason_notes',
  'cancelled_year',
] as const;
