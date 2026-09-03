import {
  buildGa4ConfigOptions,
  buildGa4PagePath,
} from '@/lib/ga4-cross-domain';
import {
  shouldSendGa4Events,
  trackPageView,
} from '@/lib/analytics';

describe('buildGa4PagePath', () => {
  it('appends search params to pathname', () => {
    expect(
      buildGa4PagePath('/en/map', new URLSearchParams('country=United+States'))
    ).toBe('/en/map?country=United+States');
  });

  it('returns pathname when search is empty', () => {
    expect(buildGa4PagePath('/en', null)).toBe('/en');
  });
});

describe('buildGa4ConfigOptions send_page_view', () => {
  it('defaults send_page_view to false for SPA explicit page_view', () => {
    const config = buildGa4ConfigOptions({
      hostname: 'resources.sageoutdooradvisory.com',
      pagePath: '/en/map',
    });
    expect(config.send_page_view).toBe(false);
  });

  it('allows bootstrap override to true when requested', () => {
    const config = buildGa4ConfigOptions({
      hostname: 'resources.sageoutdooradvisory.com',
      sendPageView: true,
    });
    expect(config.send_page_view).toBe(true);
  });
});

describe('shouldSendGa4Events', () => {
  const originalId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  beforeAll(() => {
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = 'G-TEST123';
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = originalId;
  });

  it('blocks localhost unless explicitly allowed', () => {
    delete process.env.NEXT_PUBLIC_GA4_ALLOW_LOCALHOST;
    expect(shouldSendGa4Events('localhost')).toBe(false);
    process.env.NEXT_PUBLIC_GA4_ALLOW_LOCALHOST = 'true';
    expect(shouldSendGa4Events('localhost')).toBe(true);
    delete process.env.NEXT_PUBLIC_GA4_ALLOW_LOCALHOST;
  });

  it('allows production resources host', () => {
    expect(shouldSendGa4Events('resources.sageoutdooradvisory.com')).toBe(true);
  });

  it('blocks flagged internal traffic even on production hosts', () => {
    expect(
      shouldSendGa4Events('resources.sageoutdooradvisory.com', {
        skipInternalTraffic: true,
      })
    ).toBe(false);
  });
});

describe('trackPageView', () => {
  const originalId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = 'G-TEST123';
    process.env.NEXT_PUBLIC_GA4_ALLOW_LOCALHOST = 'true';
    window.gtag = jest.fn();
    document.title = 'Glamping Map';
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = originalId;
    delete process.env.NEXT_PUBLIC_GA4_ALLOW_LOCALHOST;
    delete (window as { gtag?: unknown }).gtag;
  });

  it('fires explicit page_view with path, location, and title', () => {
    trackPageView({
      pathname: '/en/map',
      searchParams: new URLSearchParams('unitType=Airstream'),
      extra: { seo_section: 'map' },
    });

    expect(window.gtag).toHaveBeenCalledWith(
      'event',
      'page_view',
      expect.objectContaining({
        page_path: '/en/map?unitType=Airstream',
        page_location: `${window.location.origin}/en/map?unitType=Airstream`,
        page_title: 'Glamping Map',
        seo_section: 'map',
      })
    );
  });
});
