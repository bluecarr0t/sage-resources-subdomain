import {
  getPropertyOtaListings,
  inferOtaPlatformFromUrl,
} from '@/lib/property-ota-listings';
import type { SageProperty } from '@/lib/types/sage';

function row(partial: Partial<SageProperty>): SageProperty {
  return { id: 1, property_name: 'Test', ...partial } as SageProperty;
}

describe('inferOtaPlatformFromUrl', () => {
  it('detects Hipcamp', () => {
    expect(
      inferOtaPlatformFromUrl('https://www.hipcamp.com/en-CA/land/foo-abc')
    ).toBe('hipcamp');
  });

  it('detects Airbnb', () => {
    expect(inferOtaPlatformFromUrl('https://www.airbnb.com/rooms/123')).toBe('airbnb');
  });

  it('detects Booking.com', () => {
    expect(inferOtaPlatformFromUrl('https://www.booking.com/hotel/us/foo.html')).toBe(
      'booking_com'
    );
  });

  it('detects Vrbo', () => {
    expect(inferOtaPlatformFromUrl('https://www.vrbo.com/123456')).toBe('vrbo');
  });

  it('detects legacy HomeAway as Vrbo', () => {
    expect(inferOtaPlatformFromUrl('https://www.homeaway.com/vacation/p123')).toBe('vrbo');
  });
});

describe('getPropertyOtaListings', () => {
  it('uses explicit OTA URL columns first', () => {
    const listings = getPropertyOtaListings(
      row({
        third_party_platforms: ['hipcamp', 'airbnb'],
        ota_url_hipcamp: 'https://www.hipcamp.com/land/a',
        ota_url_airbnb: 'https://www.airbnb.com/rooms/1',
        url: 'https://example.com',
      })
    );
    expect(listings).toHaveLength(2);
    expect(listings[0]).toEqual({
      platform: 'hipcamp',
      label: 'Hipcamp',
      url: 'https://www.hipcamp.com/land/a',
    });
    expect(listings[1].platform).toBe('airbnb');
  });

  it('infers Hipcamp from url when columns empty', () => {
    const listings = getPropertyOtaListings(
      row({ url: 'https://hipcamp.com/land/test' })
    );
    expect(listings).toHaveLength(1);
    expect(listings[0].label).toBe('Hipcamp');
  });

  it('merges OTA URLs across sibling rows', () => {
    const listings = getPropertyOtaListings([
      row({ ota_url_hipcamp: 'https://www.hipcamp.com/land/a' }),
      row({ ota_url_airbnb: 'https://www.airbnb.com/rooms/9' }),
    ]);
    expect(listings.map((l) => l.platform)).toEqual(['hipcamp', 'airbnb']);
  });

  it('collects site names per platform from sibling rows', () => {
    const listings = getPropertyOtaListings([
      row({ site_name: 'Woodbend', ota_url_hipcamp: 'https://www.hipcamp.com/land/a' }),
      row({ site_name: 'Riverside Yurt', ota_url_hipcamp: 'https://www.hipcamp.com/land/a' }),
    ]);
    expect(listings).toHaveLength(1);
    expect(listings[0].siteNames).toEqual(['Riverside Yurt', 'Woodbend']);
  });
});
