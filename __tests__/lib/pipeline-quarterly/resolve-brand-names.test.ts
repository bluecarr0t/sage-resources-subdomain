import {
  resolveBrandDisplayName,
} from '@/lib/pipeline-quarterly/resolve-brand-names';

describe('resolveBrandDisplayName', () => {
  const namesById = new Map([
    ['a2a6caad-52fd-417b-bb38-8c4d690c246d', 'AutoCamp'],
  ]);

  it('returns the display name for a known brand id', () => {
    expect(
      resolveBrandDisplayName('a2a6caad-52fd-417b-bb38-8c4d690c246d', namesById)
    ).toBe('AutoCamp');
  });

  it('returns empty string when brand id is missing or unknown', () => {
    expect(resolveBrandDisplayName(null, namesById)).toBe('');
    expect(resolveBrandDisplayName('unknown-id', namesById)).toBe('');
  });
});
