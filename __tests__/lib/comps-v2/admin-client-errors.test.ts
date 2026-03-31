import {
  resolveGapFillClientError,
  mergeUniqueErrorStrings,
} from '@/lib/comps-v2/admin-client-errors';

const t = (key: string) => {
  const map: Record<string, string> = {
    errorGapFillCityRequired: 'city-msg',
    errorGapFillStateRequired: 'state-msg',
    errorGapFillExistingTooLarge: 'too-large',
    errorGeneric: 'generic',
  };
  return map[key] ?? key;
};

describe('admin-client-errors', () => {
  it('maps STATE_REQUIRED', () => {
    expect(resolveGapFillClientError({ errorCode: 'STATE_REQUIRED' }, t)).toBe('state-msg');
  });

  it('mergeUniqueErrorStrings dedupes', () => {
    expect(mergeUniqueErrorStrings(['a'], ['a', 'b'])).toEqual(['a', 'b']);
  });
});
