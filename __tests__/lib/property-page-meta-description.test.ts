import {
  buildPropertyPageMetaDescription,
  extractPropertyDescriptionExcerpt,
  sanitizePropertyDescriptionForMeta,
} from '@/lib/property-page-meta-description';

describe('property-page-meta-description', () => {
  it('removes Sources footer from descriptions', () => {
    expect(
      sanitizePropertyDescriptionForMeta(
        'Luxury tents near the river. Sources: KOA directory (May 2026).'
      )
    ).toBe('Luxury tents near the river.');
  });

  it('builds a description with name, type, all unit types, location, excerpt, and rate', () => {
    const description = buildPropertyPageMetaDescription({
      propertyName: 'Under Canvas Moab',
      propertyType: 'Glamping',
      unitTypes: ['Safari Tent', 'Suite'],
      city: 'Moab',
      state: 'Utah',
      description:
        'Safari-inspired canvas tents with red rock views. Family-friendly resort amenities. Sources: Sage research.',
      rateAvgRetailDailyRate: 289,
    });

    expect(description).toContain('Under Canvas Moab');
    expect(description).toContain('Glamping');
    expect(description).toContain('Moab, UT');
    expect(description).toContain('Units: Safari Tent and Suite');
    expect(description).toContain('Safari-inspired canvas tents');
    expect(description).toContain('From $289/night');
    expect(description.length).toBeLessThanOrEqual(300);
  });

  it('includes Mixed when it is the only unit type', () => {
    const description = buildPropertyPageMetaDescription({
      propertyName: 'Hayward KOA Holiday',
      propertyType: 'Campground',
      unitTypes: ['Mixed'],
      city: 'Hayward',
      state: 'Wisconsin',
      description: 'KOA campground with RV sites and deluxe cabins.',
    });

    expect(description).toContain('Hayward KOA Holiday');
    expect(description).toContain('Campground in Hayward, WI');
    expect(description).toContain('Units: Mixed');
    expect(description).toContain('RV sites and deluxe cabins');
  });

  it('extracts one or two sentences within the character budget', () => {
    const excerpt = extractPropertyDescriptionExcerpt(
      'First sentence about the property. Second sentence with more detail. Third should be skipped when over budget.',
      90
    );
    expect(excerpt).toContain('First sentence');
    expect(excerpt.length).toBeLessThanOrEqual(93);
  });
});
