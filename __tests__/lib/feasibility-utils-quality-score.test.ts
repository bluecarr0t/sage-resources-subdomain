/**
 * @jest-environment node
 */

import { getStateFromText, qualityScoreToDisplay } from '@/lib/feasibility-utils';

describe('qualityScoreToDisplay', () => {
  it('maps 0–5 scores as-is', () => {
    expect(qualityScoreToDisplay(4.25)).toBe(4.3);
    expect(qualityScoreToDisplay(5)).toBe(5);
  });

  it('maps 0–10 (feasibility) to 0–5', () => {
    expect(qualityScoreToDisplay(8)).toBe(4);
    expect(qualityScoreToDisplay(10)).toBe(5);
  });

  it('maps 1–100 (Sage data completeness) to 0–5', () => {
    expect(qualityScoreToDisplay(40.5)).toBe(2);
    expect(qualityScoreToDisplay(100)).toBe(5);
    expect(qualityScoreToDisplay(20)).toBe(1);
  });

  it('returns null for invalid input', () => {
    expect(qualityScoreToDisplay(null)).toBeNull();
    expect(qualityScoreToDisplay(Number.NaN)).toBeNull();
  });

  it('accepts numeric strings from JSON', () => {
    expect(qualityScoreToDisplay('40.5')).toBe(2);
  });
});

describe('getStateFromText', () => {
  it('detects Texas in regional phrases like East Texas', () => {
    expect(
      getStateFromText(
        'Boutique glamping retreat located in East Texas, offering a collection of modern tiny homes.'
      )
    ).toBe('TX');
  });
});
