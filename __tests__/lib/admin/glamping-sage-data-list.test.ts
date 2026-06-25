import { applySageDataGlampingListFilters } from '@/lib/admin/glamping-sage-data-list';
import {
  buildTokenOrFilter,
  expandTokenIlikePatterns,
  normalizeForFuzzySearch,
  propertyMatchesReportLocation,
  rankPropertySearchResults,
  significantSearchTokens,
  stringSimilarity,
  tokenizeSageDataSearchQuery,
} from '@/lib/admin/sage-data-fuzzy-search';

describe('applySageDataGlampingListFilters', () => {
  function createMockQuery() {
    const calls: { method: string; args: unknown[] }[] = [];
    const query = {
      or: (...args: unknown[]) => {
        calls.push({ method: 'or', args });
        return query;
      },
      eq: (...args: unknown[]) => {
        calls.push({ method: 'eq', args });
        return query;
      },
      ilike: (...args: unknown[]) => {
        calls.push({ method: 'ilike', args });
        return query;
      },
      calls,
    };
    return query;
  }

  it('applies token AND search for multi-word queries', () => {
    const query = createMockQuery();
    applySageDataGlampingListFilters(query, {
      q: '18 Mcdonnells Lane Hopewell',
      researchStatus: undefined,
      country: undefined,
      city: undefined,
      state: undefined,
      isOpen: undefined,
      discoverySource: undefined,
      missing: null,
      glampingServiceTier: undefined,
    });

    const orCalls = query.calls.filter((c) => c.method === 'or');
    expect(orCalls.length).toBeGreaterThanOrEqual(4);
    const combined = orCalls.map((c) => String(c.args[0])).join(' ');
    expect(combined).toContain('address.ilike.%18%');
    expect(combined).toContain('city.ilike.%hopewell%');
    expect(combined).toContain('address.ilike.%mcdonnell%');
  });

  it('tokenizes multi-word address queries into separate AND filters', () => {
    const query = createMockQuery();
    applySageDataGlampingListFilters(query, {
      q: '123 Main St',
      researchStatus: undefined,
      country: undefined,
      city: undefined,
      state: undefined,
      isOpen: undefined,
      discoverySource: undefined,
      missing: null,
      glampingServiceTier: undefined,
    });

    const orCalls = query.calls.filter((c) => c.method === 'or');
    expect(orCalls.length).toBe(3);
    const combined = orCalls.map((c) => String(c.args[0])).join(' ');
    expect(combined).toContain('address.ilike.%123%');
    expect(combined).toContain('address.ilike.%main%');
    expect(combined).toContain('city.ilike.%st%');
  });

  it('filters by city when city param is set', () => {
    const query = createMockQuery();
    applySageDataGlampingListFilters(query, {
      q: '',
      researchStatus: undefined,
      country: undefined,
      city: 'Ellsworth',
      state: undefined,
      isOpen: undefined,
      discoverySource: undefined,
      missing: null,
      glampingServiceTier: undefined,
    });

    const ilikeCall = query.calls.find((c) => c.method === 'ilike');
    expect(ilikeCall).toEqual({ method: 'ilike', args: ['city', '%Ellsworth%'] });
  });

  it('does not add search or filter when q is empty', () => {
    const query = createMockQuery();
    applySageDataGlampingListFilters(query, {
      q: '   ',
      researchStatus: undefined,
      country: undefined,
      city: undefined,
      state: undefined,
      isOpen: undefined,
      discoverySource: undefined,
      missing: null,
      glampingServiceTier: undefined,
    });

    expect(query.calls.some((c) => c.method === 'or')).toBe(false);
  });
});

describe('sage-data-fuzzy-search helpers', () => {
  it('tokenizes and normalizes queries', () => {
    expect(tokenizeSageDataSearchQuery("18 McDonnell's Lane")).toEqual([
      '18',
      'mcdonnells',
      'lane',
    ]);
  });

  it('expands possessive stems for fuzzy ILIKE', () => {
    const patterns = expandTokenIlikePatterns('mcdonnells');
    expect(patterns).toContain('%mcdonnells%');
    expect(patterns).toContain('%mcdonnell%');
  });

  it('buildTokenOrFilter searches address and city', () => {
    const filter = buildTokenOrFilter('hopewell');
    expect(filter).toContain('city.ilike.%hopewell%');
    expect(filter).toContain('address.ilike.%hopewell%');
  });

  it('ranks rows that match more tokens higher', () => {
    const ranked = rankPropertySearchResults(
      [
        {
          id: 1,
          property_name: 'Other Site',
          address: '1 Elsewhere Rd',
          city: 'Trenton',
          state: 'NJ',
        },
        {
          id: 2,
          property_name: 'Hopewell Project',
          address: "18 McDonnell's Lane",
          city: 'Hopewell',
          state: 'NJ',
        },
      ],
      '18 Mcdonnells Lane Hopewell'
    );

    expect(ranked[0]?.id).toBe(2);
  });

  it('scores similar spellings', () => {
    expect(stringSimilarity('mcdonnells lane', "mcdonnell's lane")).toBeGreaterThan(0.8);
    expect(normalizeForFuzzySearch("McDonnell's")).toBe('mcdonnells');
  });

  it('matches properties in the same city and state', () => {
    expect(
      propertyMatchesReportLocation(
        { city: 'Ellsworth', state: 'ME' },
        'Ellsworth',
        'ME'
      )
    ).toBe(true);
    expect(
      propertyMatchesReportLocation(
        { city: 'Summerville', state: 'GA' },
        'Ellsworth',
        'ME'
      )
    ).toBe(false);
  });
});
