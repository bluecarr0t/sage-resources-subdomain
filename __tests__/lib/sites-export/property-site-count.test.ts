import { siteCountForPropertyExportFromRaw } from '@/lib/sites-export/property-site-count';

describe('siteCountForPropertyExportFromRaw', () => {
  it('matches quantity_of_units for hipcamp', () => {
    expect(
      siteCountForPropertyExportFromRaw('hipcamp', {
        quantity_of_units: '4',
        property_total_sites: '100',
      })
    ).toBe(4);
  });

  it('is 1 for roverpass regardless of quantity', () => {
    expect(
      siteCountForPropertyExportFromRaw('all_roverpass_data_new', {
        quantity_of_units: '50',
        property_total_sites: '50',
      })
    ).toBe(1);
  });

  it('campspot ignores property_total_sites for expansion when quantity_of_units unset', () => {
    expect(
      siteCountForPropertyExportFromRaw('campspot', {
        quantity_of_units: '',
        property_total_sites: '486',
      })
    ).toBe(1);
  });
});
