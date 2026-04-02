import { geocodeAddress, geocodeNominatim } from '@/lib/geocode';
import { geocodeZipForSitesExport } from '@/lib/sites-export/geocode-zip';

jest.mock('@/lib/geocode', () => ({
  geocodeAddress: jest.fn(),
  geocodeNominatim: jest.fn(),
}));

const mockGeocodeAddress = geocodeAddress as jest.MockedFunction<typeof geocodeAddress>;
const mockGeocodeNominatim = geocodeNominatim as jest.MockedFunction<typeof geocodeNominatim>;

describe('geocodeZipForSitesExport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns Google result when available (single country)', async () => {
    mockGeocodeAddress.mockResolvedValue({ lat: 1, lng: 2 });
    const out = await geocodeZipForSitesExport('90210', ['United States']);
    expect(out).toEqual({ lat: 1, lng: 2 });
    expect(mockGeocodeNominatim).not.toHaveBeenCalled();
  });

  it('falls back to Nominatim when Google returns null', async () => {
    mockGeocodeAddress.mockResolvedValue(null);
    mockGeocodeNominatim.mockResolvedValueOnce({ lat: 41.4, lng: -122.4 });
    const out = await geocodeZipForSitesExport('96094', ['United States']);
    expect(out).toEqual({ lat: 41.4, lng: -122.4 });
    expect(mockGeocodeNominatim).toHaveBeenCalledWith('96094, United States');
  });

  it('tries USA Nominatim query when primary Nominatim fails for US hint', async () => {
    mockGeocodeAddress.mockResolvedValue(null);
    mockGeocodeNominatim.mockResolvedValueOnce(null).mockResolvedValueOnce({ lat: 3, lng: 4 });
    const out = await geocodeZipForSitesExport('96094', ['']);
    expect(out).toEqual({ lat: 3, lng: 4 });
    expect(mockGeocodeNominatim).toHaveBeenNthCalledWith(1, '96094, United States');
    expect(mockGeocodeNominatim).toHaveBeenNthCalledWith(2, '96094, USA');
  });

  it('empty country list defaults to United States', async () => {
    mockGeocodeAddress.mockResolvedValue(null);
    mockGeocodeNominatim.mockResolvedValueOnce(null).mockResolvedValueOnce({ lat: 3, lng: 4 });
    const out = await geocodeZipForSitesExport('96094', []);
    expect(out).toEqual({ lat: 3, lng: 4 });
    expect(mockGeocodeNominatim).toHaveBeenNthCalledWith(1, '96094, United States');
  });

  it('uses combined Nominatim query when multiple countries are selected', async () => {
    mockGeocodeAddress.mockResolvedValue(null);
    mockGeocodeNominatim.mockResolvedValueOnce({ lat: 49, lng: -123 });
    const out = await geocodeZipForSitesExport('V6B 1A1', ['Canada', 'Mexico']);
    expect(out).toEqual({ lat: 49, lng: -123 });
    expect(mockGeocodeNominatim).toHaveBeenNthCalledWith(1, 'V6B 1A1, Canada, Mexico');
    expect(mockGeocodeAddress).not.toHaveBeenCalled();
  });

  it('falls back per country when combined Nominatim fails', async () => {
    mockGeocodeAddress
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ lat: 10, lng: 20 });
    mockGeocodeNominatim.mockResolvedValueOnce(null);
    const out = await geocodeZipForSitesExport('X0X0X0', ['Canada', 'Mexico']);
    expect(out).toEqual({ lat: 10, lng: 20 });
    expect(mockGeocodeNominatim).toHaveBeenNthCalledWith(1, 'X0X0X0, Canada, Mexico');
    expect(mockGeocodeAddress).toHaveBeenCalledWith('', '', '', 'X0X0X0', 'Canada');
  });
});
