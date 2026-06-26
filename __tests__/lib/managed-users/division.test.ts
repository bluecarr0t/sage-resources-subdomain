import {
  compareManagedUsersByFirstName,
  fromManagedUserDivisionSelectValue,
  getManagedUserDivisionSelectTextClassName,
  managedUserDivisionMatchesSegmentFilter,
  sortManagedUsersByFirstName,
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

describe('getManagedUserDivisionSelectTextClassName', () => {
  it('returns distinct colors per division', () => {
    expect(getManagedUserDivisionSelectTextClassName('outdoor')).toContain('green');
    expect(getManagedUserDivisionSelectTextClassName('commercial')).toContain('yellow');
    expect(getManagedUserDivisionSelectTextClassName('both')).toContain('purple');
    expect(getManagedUserDivisionSelectTextClassName(null)).toContain('purple');
  });
});

describe('sortManagedUsersByFirstName', () => {
  it('sorts by first name ascending, then last name, then email', () => {
    const sorted = sortManagedUsersByFirstName([
      {
        email: 'zoe@example.com',
        first_name: 'Zoe',
        last_name: 'Adams',
        display_name: 'Zoe Adams',
      },
      {
        email: 'greg@sageoutdooradvisory.com',
        first_name: 'Greg',
        last_name: 'Garwood',
        display_name: 'Greg Garwood',
      },
      {
        email: 'admin@sageoutdooradvisory.com',
        first_name: null,
        last_name: null,
        display_name: 'Sage Admin',
      },
      {
        email: 'luke@example.com',
        first_name: 'Luke',
        last_name: 'Marran',
        display_name: 'Luke Marran',
      },
    ]);

    expect(sorted.map((user) => user.display_name)).toEqual([
      'Greg Garwood',
      'Luke Marran',
      'Sage Admin',
      'Zoe Adams',
    ]);
  });

  it('uses display_name first token when first_name is missing', () => {
    expect(
      compareManagedUsersByFirstName(
        { email: 'b@example.com', first_name: null, last_name: null, display_name: 'Mary Claire Sparrow' },
        { email: 'a@example.com', first_name: null, last_name: null, display_name: 'Luke Marran' }
      )
    ).toBeGreaterThan(0);
  });
});
