import {
  compsV2WebVsMarketDedupeKey,
  normalizePropertyNameForMarketWebDedupe,
} from '@/lib/comps-v2/candidate-dedupe-keys';

describe('compsV2WebVsMarketDedupeKey', () => {
  it('matches Sage short name to verbose Tavily title when city aligns', () => {
    const sage = compsV2WebVsMarketDedupeKey(
      'Walden Retreats Hill Country',
      'Johnson City',
      'TX'
    );
    const web = compsV2WebVsMarketDedupeKey(
      'Walden Retreats Hill Country, Johnson City (updated prices 2026)',
      'Johnson City',
      'TX'
    );
    expect(web).toBe(sage);
    expect(sage).toBe('walden retreats hill country|johnson city|TX');
  });

  it('matches when web row only has city embedded in the title', () => {
    const sage = compsV2WebVsMarketDedupeKey('Walden Retreats Hill Country', 'Johnson City', 'TX');
    const web = compsV2WebVsMarketDedupeKey(
      'Walden Retreats Hill Country, Johnson City (updated prices 2026)',
      undefined,
      'TX'
    );
    expect(web).toBe(sage);
  });

  it('normalizePropertyNameForMarketWebDedupe peels SEO tail', () => {
    expect(
      normalizePropertyNameForMarketWebDedupe(
        'Walden Retreats Hill Country, Johnson City (updated prices 2026)',
        'Johnson City'
      )
    ).toBe('walden retreats hill country');
  });
});
