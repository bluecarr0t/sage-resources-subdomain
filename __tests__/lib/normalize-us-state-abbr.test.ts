import { normalizeDbStateToUspsAbbr } from '@/lib/normalize-us-state-abbr';

describe('normalizeDbStateToUspsAbbr', () => {
  it('accepts USPS abbreviations', () => {
    expect(normalizeDbStateToUspsAbbr('TX')).toBe('TX');
    expect(normalizeDbStateToUspsAbbr(' ca ')).toBe('CA');
  });

  it('maps full state names', () => {
    expect(normalizeDbStateToUspsAbbr('Texas')).toBe('TX');
    expect(normalizeDbStateToUspsAbbr('new york')).toBe('NY');
  });

  it('maps District of Columbia', () => {
    expect(normalizeDbStateToUspsAbbr('District of Columbia')).toBe('DC');
    expect(normalizeDbStateToUspsAbbr('DC')).toBe('DC');
  });

  it('returns null for unknown', () => {
    expect(normalizeDbStateToUspsAbbr('')).toBeNull();
    expect(normalizeDbStateToUspsAbbr('Narnia')).toBeNull();
  });
});
