import {
  expandStateValuesForInQuery,
  formatStateAbbreviation,
  normalizeStateToCanonicalAbbrev,
} from '@/components/map/utils/stateUtils';

describe('formatStateAbbreviation', () => {
  it('returns dash for null, undefined, or blank', () => {
    expect(formatStateAbbreviation(null)).toBe('-');
    expect(formatStateAbbreviation(undefined)).toBe('-');
    expect(formatStateAbbreviation('')).toBe('-');
    expect(formatStateAbbreviation('   ')).toBe('-');
  });

  it('normalizes known abbreviations to uppercase', () => {
    expect(formatStateAbbreviation('tx')).toBe('TX');
    expect(formatStateAbbreviation('CA')).toBe('CA');
  });

  it('maps full US state names to abbreviations', () => {
    expect(formatStateAbbreviation('Texas')).toBe('TX');
    expect(formatStateAbbreviation('new york')).toBe('NY');
    expect(formatStateAbbreviation('District of Columbia')).toBe('DC');
  });

  it('maps Canadian province names and codes', () => {
    expect(formatStateAbbreviation('British Columbia')).toBe('BC');
    expect(formatStateAbbreviation('bc')).toBe('BC');
  });

  it('joins multiple states with comma', () => {
    expect(formatStateAbbreviation('Texas, California')).toBe('TX, CA');
  });
});

describe('normalizeStateToCanonicalAbbrev', () => {
  it('maps abbreviations and full names to a single code', () => {
    expect(normalizeStateToCanonicalAbbrev('al')).toBe('AL');
    expect(normalizeStateToCanonicalAbbrev('Alabama')).toBe('AL');
    expect(normalizeStateToCanonicalAbbrev('ALABAMA')).toBe('AL');
  });

  it('returns null for unknown strings', () => {
    expect(normalizeStateToCanonicalAbbrev('Narnia')).toBeNull();
  });
});

describe('expandStateValuesForInQuery', () => {
  it('includes abbreviation and common full-name variants for one state', () => {
    const expanded = expandStateValuesForInQuery(['AL']);
    expect(expanded).toContain('AL');
    expect(expanded).toContain('Alabama');
    expect(expanded).toContain('ALABAMA');
    expect(expanded).toContain('alabama');
  });

  it('dedupes when the same region is passed as abbr and full name', () => {
    const a = expandStateValuesForInQuery(['AL', 'Alabama']).sort();
    const b = expandStateValuesForInQuery(['AL']).sort();
    expect(a).toEqual(b);
  });
});
