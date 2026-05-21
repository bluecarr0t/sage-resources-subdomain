import {
  buildPublishedPropertySlugIndex,
  type PropertyAnchorRow,
} from '@/lib/published-property-pages';

describe('buildPublishedPropertySlugIndex lastmod', () => {
  const fallback = '2026-01-01T00:00:00.000Z';

  const anchors: PropertyAnchorRow[] = [
    {
      id: 1,
      property_name: 'Alpha Camp',
      slug: 'alpha-camp',
      city: 'Austin',
      state: 'TX',
      updated_at: '2026-03-15T12:00:00.000Z',
    },
    {
      id: 2,
      property_name: 'Beta Retreat',
      slug: 'beta-retreat',
      city: 'Denver',
      state: 'CO',
      updated_at: '2026-05-10T08:00:00.000Z',
    },
  ];

  it('emits per-slug lastmod from updated_at', () => {
    const entries = buildPublishedPropertySlugIndex(anchors, fallback);
    const alpha = entries.find((e) => e.slug === 'alpha-camp');
    const beta = entries.find((e) => e.slug === 'beta-retreat');
    expect(alpha?.lastmod).toBe('2026-03-15T12:00:00.000Z');
    expect(beta?.lastmod).toBe('2026-05-10T08:00:00.000Z');
  });
});
