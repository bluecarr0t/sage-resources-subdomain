import {
  fromManagedUserDivisionSelectValue,
  managedUserDivisionMatchesSegmentFilter,
  toManagedUserDivisionSelectValue,
} from '@/lib/managed-users/division';

describe('managed user division select', () => {
  it('maps null and both to the Both option', () => {
    expect(toManagedUserDivisionSelectValue(null)).toBe('both');
    expect(toManagedUserDivisionSelectValue('both')).toBe('both');
    expect(toManagedUserDivisionSelectValue('outdoor')).toBe('outdoor');
  });

  it('parses select values', () => {
    expect(fromManagedUserDivisionSelectValue('both')).toBe('both');
    expect(fromManagedUserDivisionSelectValue('outdoor')).toBe('outdoor');
    expect(fromManagedUserDivisionSelectValue('')).toBe('both');
  });

  it('matches both division to outdoor and commercial filters', () => {
    expect(managedUserDivisionMatchesSegmentFilter('both', 'Outdoor')).toBe(true);
    expect(managedUserDivisionMatchesSegmentFilter('both', 'Commercial')).toBe(true);
    expect(managedUserDivisionMatchesSegmentFilter(null, 'Outdoor')).toBe(true);
    expect(managedUserDivisionMatchesSegmentFilter('outdoor', 'Outdoor')).toBe(true);
    expect(managedUserDivisionMatchesSegmentFilter('outdoor', 'Commercial')).toBe(false);
    expect(managedUserDivisionMatchesSegmentFilter('commercial', 'Commercial')).toBe(true);
  });
});
