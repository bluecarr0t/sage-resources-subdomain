import {
  buildPublishedPropertySlugList,
  resolvePublicSlugForAnchor,
} from '@/lib/published-property-pages';

describe('published-property-pages', () => {
  it('uses DB slug when present', () => {
    const used = new Set<string>();
    expect(
      resolvePublicSlugForAnchor(
        { id: 1, property_name: 'Foo Bar', slug: 'custom-slug' },
        used
      )
    ).toBe('custom-slug');
  });

  it('disambiguates duplicate property names with city suffix', () => {
    const used = new Set<string>();
    const first = resolvePublicSlugForAnchor(
      { id: 1, property_name: 'Serenity Ridge', city: 'Austin', state: 'TX' },
      used
    );
    used.add(first);
    const second = resolvePublicSlugForAnchor(
      { id: 2, property_name: 'Serenity Ridge', city: 'Denver', state: 'CO' },
      used
    );
    expect(first).toBe('serenity-ridge');
    expect(second).toBe('serenity-ridge-denver');
  });

  it('returns one slug per indexable anchor', () => {
    const slugs = buildPublishedPropertySlugList([
      {
        id: 1,
        property_name: 'Alpha Camp',
        slug: 'alpha-camp',
        city: 'Austin',
        state: 'TX',
      },
      {
        id: 2,
        property_name: 'Beta Lodge',
        slug: 'beta-lodge',
        city: 'Denver',
        state: 'CO',
      },
    ]);
    expect(slugs).toEqual(['alpha-camp', 'beta-lodge']);
  });
});
