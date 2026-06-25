import { buildManagedUserDisplayName } from '@/lib/managed-users/display-name';

describe('buildManagedUserDisplayName', () => {
  it('joins first and last name', () => {
    expect(buildManagedUserDisplayName('Greg', 'Garwood')).toBe('Greg Garwood');
  });

  it('returns null when both names are empty', () => {
    expect(buildManagedUserDisplayName('', '')).toBeNull();
    expect(buildManagedUserDisplayName('  ', null)).toBeNull();
  });
});
