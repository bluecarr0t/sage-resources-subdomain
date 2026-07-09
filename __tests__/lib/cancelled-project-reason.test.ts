import {
  CANCELLED_PROJECT_REASONS,
  isCancelledProjectReason,
  sanitizeCancelledReasonPatch,
} from '@/lib/cancelled-project-reason';

describe('isCancelledProjectReason', () => {
  it('accepts canonical slugs', () => {
    expect(isCancelledProjectReason('developer_withdrawal')).toBe(true);
    expect(isCancelledProjectReason('not_a_reason')).toBe(false);
  });
});

describe('sanitizeCancelledReasonPatch', () => {
  it('clears reason fields when is_open is not Cancelled', () => {
    const patch = {
      is_open: 'Yes',
      cancelled_reason: 'developer_withdrawal',
      cancelled_reason_notes: 'Market softened',
      cancelled_year: 2025,
    };
    const result = sanitizeCancelledReasonPatch(patch);
    expect(result.ok).toBe(true);
    expect(patch.cancelled_reason).toBeNull();
    expect(patch.cancelled_reason_notes).toBeNull();
    expect(patch.cancelled_year).toBeNull();
  });

  it('rejects invalid reason slugs', () => {
    const patch = { is_open: 'Cancelled', cancelled_reason: 'bad_slug' };
    const result = sanitizeCancelledReasonPatch(patch);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain(CANCELLED_PROJECT_REASONS[0]);
    }
  });

  it('normalizes notes and allows empty reason', () => {
    const patch = {
      is_open: 'Cancelled',
      cancelled_reason: '',
      cancelled_reason_notes: '  CEQA lawsuit  ',
    };
    const result = sanitizeCancelledReasonPatch(patch);
    expect(result.ok).toBe(true);
    expect(patch.cancelled_reason).toBeNull();
    expect(patch.cancelled_reason_notes).toBe('CEQA lawsuit');
  });

  it('validates cancelled_year', () => {
    const ok = sanitizeCancelledReasonPatch({
      is_open: 'Cancelled',
      cancelled_year: '2023',
    });
    expect(ok.ok).toBe(true);

    const bad = sanitizeCancelledReasonPatch({
      is_open: 'Cancelled',
      cancelled_year: 1800,
    });
    expect(bad.ok).toBe(false);
  });
});
