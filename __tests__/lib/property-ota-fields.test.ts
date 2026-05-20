import {
  applyOtaFieldSanitization,
  hasOfficialWebsiteOrOtaListing,
  normalizeOtaUrl,
  otaPlatformForLegacyWebsiteUrl,
  platformsFromOtaUrlColumns,
} from '@/lib/property-ota-fields';

describe('property-ota-fields', () => {
  it('normalizes OTA URLs with https', () => {
    expect(normalizeOtaUrl('hipcamp.com/land/foo')).toBe('https://hipcamp.com/land/foo');
  });

  it('detects legacy website OTA hosts', () => {
    expect(otaPlatformForLegacyWebsiteUrl('https://www.airbnb.com/rooms/1')).toBe('airbnb');
    expect(otaPlatformForLegacyWebsiteUrl('https://example.com')).toBeNull();
  });

  it('builds third_party_platforms from URL columns', () => {
    const row: Record<string, unknown> = {
      ota_url_hipcamp: 'https://www.hipcamp.com/land/a',
    };
    applyOtaFieldSanitization(row, { syncPlatformsFromUrls: true });
    expect(row.third_party_platforms).toEqual(['hipcamp']);
    expect(platformsFromOtaUrlColumns(row)).toEqual(['hipcamp']);
  });

  it('hasOfficialWebsiteOrOtaListing accepts OTA-only', () => {
    expect(hasOfficialWebsiteOrOtaListing({ url: null, ota_url_hipcamp: 'https://hipcamp.com/x' })).toBe(
      true
    );
    expect(hasOfficialWebsiteOrOtaListing({ url: null })).toBe(false);
  });
});
