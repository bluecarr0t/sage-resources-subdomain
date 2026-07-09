/**
 * @jest-environment node
 */
import { otaMonthlyExportParamsSchema } from '@/lib/sage-ai/ota-monthly-export-params';

describe('otaMonthlyExportParamsSchema', () => {
  it('accepts a zip and applies radius/years/sources defaults', () => {
    const parsed = otaMonthlyExportParamsSchema.safeParse({ zip: '78624' });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.radius_miles).toBe(50);
      expect(parsed.data.years).toEqual([2025, 2026]);
      expect(parsed.data.sources).toEqual(['hipcamp', 'campspot']);
    }
  });

  it('accepts city + state together', () => {
    expect(
      otaMonthlyExportParamsSchema.safeParse({ city: 'Austin', state: 'TX' }).success
    ).toBe(true);
  });

  it('rejects city without state (and vice versa)', () => {
    expect(otaMonthlyExportParamsSchema.safeParse({ city: 'Austin' }).success).toBe(false);
    expect(otaMonthlyExportParamsSchema.safeParse({ state: 'TX' }).success).toBe(false);
  });

  it('rejects a payload with neither zip nor city+state', () => {
    const parsed = otaMonthlyExportParamsSchema.safeParse({ radius_miles: 25 });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toMatch(/zip OR city and state/i);
    }
  });

  it('enforces radius bounds (1–200)', () => {
    expect(otaMonthlyExportParamsSchema.safeParse({ zip: '78624', radius_miles: 0 }).success).toBe(
      false
    );
    expect(
      otaMonthlyExportParamsSchema.safeParse({ zip: '78624', radius_miles: 201 }).success
    ).toBe(false);
    expect(
      otaMonthlyExportParamsSchema.safeParse({ zip: '78624', radius_miles: 200 }).success
    ).toBe(true);
  });

  it('enforces year bounds and integer years', () => {
    expect(otaMonthlyExportParamsSchema.safeParse({ zip: '78624', years: [2023] }).success).toBe(
      false
    );
    expect(otaMonthlyExportParamsSchema.safeParse({ zip: '78624', years: [2031] }).success).toBe(
      false
    );
    expect(
      otaMonthlyExportParamsSchema.safeParse({ zip: '78624', years: [2025.5] }).success
    ).toBe(false);
  });

  it('only allows the hipcamp/campspot source enum', () => {
    expect(
      otaMonthlyExportParamsSchema.safeParse({ zip: '78624', sources: ['hipcamp'] }).success
    ).toBe(true);
    expect(
      otaMonthlyExportParamsSchema.safeParse({ zip: '78624', sources: ['airbnb'] }).success
    ).toBe(false);
  });
});
