/**
 * Unit tests for discovery pipeline deduplication
 */

import { normalizePropertyName, propertyExistsInDb, filterNewProperties } from '../deduplicate';
import type { ExtractedProperty } from '../extract-properties';

describe('normalizePropertyName', () => {
  it('lowercases and removes special chars', () => {
    expect(normalizePropertyName('Riverside Glamping Resort')).toBe('riverside glamping resort');
  });

  it('removes parenthetical content', () => {
    expect(normalizePropertyName('Resort (North)')).toBe('resort');
  });
});

describe('propertyExistsInDb', () => {
  it('returns true for exact match', () => {
    const db = new Set(['skamania lodge', 'westgate river ranch']);
    expect(propertyExistsInDb({ property_name: 'Skamania Lodge' }, db)).toBe(true);
  });

  it('returns false when not in db', () => {
    const db = new Set(['other resort']);
    expect(propertyExistsInDb({ property_name: 'New Glamping Co' }, db)).toBe(false);
  });

  it('returns true for substring match when ratio >= 0.6', () => {
    const db = new Set(['riverside glamping resort']);
    expect(propertyExistsInDb({ property_name: 'Riverside Glamping' }, db)).toBe(true);
  });

  it('returns false for short substring (ratio < 0.6)', () => {
    const db = new Set(['riverside glamping resort']);
    expect(propertyExistsInDb({ property_name: 'Riverside' }, db)).toBe(false);
  });
});

describe('filterNewProperties', () => {
  it('filters out duplicates', () => {
    const props: ExtractedProperty[] = [
      { property_name: 'Existing Resort', city: 'A' },
      { property_name: 'New Resort', city: 'B' },
    ];
    const db = new Set(['existing resort']);
    expect(filterNewProperties(props, db)).toEqual([{ property_name: 'New Resort', city: 'B' }]);
  });
});
