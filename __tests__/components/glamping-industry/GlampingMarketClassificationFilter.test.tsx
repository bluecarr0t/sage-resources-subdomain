/**
 * Classification filter lock when Canada or a US region is selected.
 * @jest-environment node
 */

import { TextDecoder, TextEncoder } from 'util';

Object.assign(global, { TextDecoder, TextEncoder });

import { renderToStaticMarkup } from 'react-dom/server';
import { GlampingMarketClassificationFilter } from '@/components/glamping-industry/GlampingMarketClassificationFilter';
import { GlampingMarketOverviewStickyNav } from '@/components/glamping-industry/GlampingMarketOverviewStickyNav';

class MockIntersectionObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

beforeAll(() => {
  Object.defineProperty(global, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: MockIntersectionObserver,
  });
});

describe('GlampingMarketClassificationFilter', () => {
  it('renders classification links when enabled', () => {
    const html = renderToStaticMarkup(
      <GlampingMarketClassificationFilter market="us" tier="luxury" />
    );

    expect(html).toContain('aria-label="Classification"');
    expect(html).toContain('href="/glamping-market-overview?tier=luxury"');
    expect(html).not.toContain('aria-disabled');
    expect(html).not.toContain('Classification locked');
  });

  it('freezes options to All and removes links when disabled', () => {
    const html = renderToStaticMarkup(
      <GlampingMarketClassificationFilter market="us" tier="luxury" disabled />
    );

    expect(html).toContain('aria-label="Classification (locked to All)"');
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain('role="tooltip"');
    expect(html).toContain('Classification locked');
    expect(html).toContain('Regional views always include all service tiers');
    expect(html).not.toContain('href=');
    expect(html).toMatch(/aria-current="true"[^>]*>All</);
  });

  it('uses Canada lock copy when the Canada market is disabled', () => {
    const html = renderToStaticMarkup(
      <GlampingMarketClassificationFilter market="ca" tier="luxury" disabled />
    );

    expect(html).toContain('Canada views always include all service tiers');
    expect(html).toContain('Choose United States to filter');
    expect(html).not.toContain('Choose All US');
    expect(html).toMatch(/aria-current="true"[^>]*>All</);
  });
});

describe('GlampingMarketOverviewStickyNav classification lock', () => {
  it('locks classification when a region (states) is selected', () => {
    const html = renderToStaticMarkup(
      <GlampingMarketOverviewStickyNav market="us" tier="luxury" states={['CA', 'OR', 'WA']} />
    );

    expect(html).toContain('Classification (locked to All)');
    expect(html).toContain('aria-disabled="true"');
  });

  it('keeps classification interactive on the national US view', () => {
    const html = renderToStaticMarkup(
      <GlampingMarketOverviewStickyNav market="us" tier="luxury" states={null} />
    );

    expect(html).toContain('aria-label="Classification"');
    expect(html).not.toContain('locked to All');
    expect(html).toContain('href="/glamping-market-overview?tier=luxury"');
  });

  it('locks classification on the Canada view', () => {
    const html = renderToStaticMarkup(
      <GlampingMarketOverviewStickyNav market="ca" tier="luxury" states={null} />
    );

    expect(html).toContain('Classification (locked to All)');
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain('Canada views always include all service tiers');
    expect(html).toMatch(/aria-current="true"[^>]*>All</);
    expect(html).not.toContain('Choose All US');
  });
});
