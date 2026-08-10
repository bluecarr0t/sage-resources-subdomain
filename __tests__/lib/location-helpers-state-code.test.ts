import {
  normalizeStateCode,
  normalizeStateName,
  stateValuesForDbQuery,
} from '@/lib/location-helpers';

describe('normalizeStateCode / stateValuesForDbQuery', () => {
  it('maps full names to USPS codes stored on all_sage_data.state', () => {
    expect(normalizeStateCode('Colorado')).toBe('CO');
    expect(normalizeStateCode('california')).toBe('CA');
    expect(normalizeStateCode('North Carolina')).toBe('NC');
  });

  it('passes through codes unchanged (canonical upper case)', () => {
    expect(normalizeStateCode('co')).toBe('CO');
    expect(normalizeStateCode('TX')).toBe('TX');
  });

  it('includes both code and full name for PostgREST .in() queries', () => {
    expect(stateValuesForDbQuery('Colorado')).toEqual(
      expect.arrayContaining(['Colorado', 'CO'])
    );
    expect(normalizeStateName('CO')).toBe('Colorado');
  });
});
