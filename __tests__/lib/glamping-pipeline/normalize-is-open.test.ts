import {
  normalizeGlampingIsOpenLabel,
  isPipelineTrackedIsOpen,
} from '@/lib/glamping-pipeline/normalize-is-open';

describe('normalizeGlampingIsOpenLabel — Cancelled', () => {
  it.each([
    'cancelled',
    'canceled',
    'abandoned',
    'project cancelled',
    'shelved',
    'permanently on hold',
  ])('maps %s to Cancelled', (raw) => {
    expect(normalizeGlampingIsOpenLabel(raw)).toBe('Cancelled');
  });

  it('does not treat temporarily closed as Cancelled', () => {
    expect(normalizeGlampingIsOpenLabel('temporarily closed')).toBe('Temporarily closed');
  });
});

describe('isPipelineTrackedIsOpen', () => {
  it('tracks only active pipeline stages', () => {
    expect(isPipelineTrackedIsOpen('Proposed Development')).toBe(true);
    expect(isPipelineTrackedIsOpen('Under Construction')).toBe(true);
    expect(isPipelineTrackedIsOpen('Cancelled')).toBe(false);
  });
});
