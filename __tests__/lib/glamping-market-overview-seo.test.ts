import {
  buildGlampingMarketOverviewMetadata,
  generateGlampingMarketOverviewJsonLd,
  glampingMarketOverviewPathForVariant,
  resolveGlampingMarketOverviewSeoVariant,
} from '@/lib/glamping-market-overview-seo';

describe('glamping-market-overview-seo', () => {
  it('resolves SEO variant from pathname', () => {
    expect(resolveGlampingMarketOverviewSeoVariant('/glamping-market-overview')).toBe('overview');
    expect(resolveGlampingMarketOverviewSeoVariant('/glamping-market-overview/brands')).toBe(
      'brands'
    );
    expect(resolveGlampingMarketOverviewSeoVariant(null)).toBe('overview');
  });

  it('maps variants to canonical paths', () => {
    expect(glampingMarketOverviewPathForVariant('overview')).toBe('/glamping-market-overview');
    expect(glampingMarketOverviewPathForVariant('brands')).toBe(
      '/glamping-market-overview/brands'
    );
  });

  it('indexes overview metadata for discovery while keeping canonical URLs', () => {
    const meta = buildGlampingMarketOverviewMetadata('overview');
    expect(meta.robots).toMatchObject({ index: true, follow: true });
    expect(meta.alternates?.canonical).toBe(
      'https://resources.sageoutdooradvisory.com/glamping-market-overview'
    );
    expect(meta.title).toContain('Glamping Market Overview');
    expect(meta.openGraph?.url).toBe(
      'https://resources.sageoutdooradvisory.com/glamping-market-overview'
    );
  });

  it('indexes brands metadata with brands canonical', () => {
    const meta = buildGlampingMarketOverviewMetadata('brands');
    expect(meta.robots).toMatchObject({ index: true, follow: true });
    expect(meta.alternates?.canonical).toBe(
      'https://resources.sageoutdooradvisory.com/glamping-market-overview/brands'
    );
    expect(meta.title).toContain('Top Glamping Brands');
  });

  it('emits JSON-LD graph with WebPage, Dataset, Breadcrumb, and FAQ', () => {
    const graph = generateGlampingMarketOverviewJsonLd('overview');
    expect(graph['@graph']).toHaveLength(4);
    const types = (graph['@graph'] as Array<{ '@type': string }>).map((n) => n['@type']);
    expect(types).toEqual(
      expect.arrayContaining(['WebPage', 'Dataset', 'BreadcrumbList', 'FAQPage'])
    );
    const webPage = (graph['@graph'] as Array<Record<string, unknown>>).find(
      (n) => n['@type'] === 'WebPage'
    );
    expect(webPage?.isAccessibleForFree).toBe(false);
  });
});
