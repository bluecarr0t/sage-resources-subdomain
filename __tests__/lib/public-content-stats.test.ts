import {
  PROPERTY_COUNT_TOKEN,
  applyPropertyCountToContentFields,
  buildHomeMetaDescription,
  formatPropertyCountPlus,
  replacePropertyCountToken,
} from '@/lib/public-content-stats';

describe('public-content-stats', () => {
  it('formats property count with locale separators and plus', () => {
    expect(formatPropertyCountPlus(1200)).toBe('1,200+');
    expect(formatPropertyCountPlus(700)).toBe('700+');
  });

  it('replaces PROPERTY_COUNT_TOKEN with live display count', () => {
    const text = `Sage tracks ${PROPERTY_COUNT_TOKEN} glamping properties.`;
    expect(replacePropertyCountToken(text, 1250)).toBe(
      'Sage tracks 1,250+ glamping properties.'
    );
  });

  it('leaves strings without the token unchanged', () => {
    expect(replacePropertyCountToken('No token here', 1000)).toBe('No token here');
  });

  it('applies property count to GEO content fields', () => {
    const updated = applyPropertyCountToContentFields(
      {
        quickAnswer: `Sage covers ${PROPERTY_COUNT_TOKEN} properties.`,
        keyTakeaways: [`Database: ${PROPERTY_COUNT_TOKEN}`],
        metaDescription: 'unchanged',
      },
      1300
    );
    expect(updated.quickAnswer).toBe('Sage covers 1,300+ properties.');
    expect(updated.keyTakeaways).toEqual(['Database: 1,300+']);
    expect(updated.metaDescription).toBe('unchanged');
  });

  it('builds home meta description from stats', () => {
    const description = buildHomeMetaDescription({
      propertyCount: 1267,
      propertyCountDisplay: 1250,
      guideCount: 19,
      glossaryCount: 89,
    });
    expect(description).toContain('1,250+ unique properties');
    expect(description).toContain('19 expert guides');
    expect(description).toContain('89 industry glossary terms');
  });
});
