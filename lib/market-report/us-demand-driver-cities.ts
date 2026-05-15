import { haversineDistanceMiles } from '@/lib/comps-v2/geo';

/**
 * US cities with approximate 2020 city-proper populations ≥ 250k (large) and
 * a subset of ≥1M (major). Coordinates are city-center reference points for
 * distance-from-anchor — not administrative boundaries.
 *
 * Rows: [city name, USPS state, lat, lng, population]
 */
const US_MAJOR_LARGE_CITY_ROWS: ReadonlyArray<readonly [string, string, number, number, number]> = [
  ['New York', 'NY', 40.7128, -74.006, 8_336_817],
  ['Los Angeles', 'CA', 34.0522, -118.2437, 3_898_747],
  ['Chicago', 'IL', 41.8781, -87.6298, 2_746_388],
  ['Houston', 'TX', 29.7604, -95.3698, 2_304_580],
  ['Phoenix', 'AZ', 33.4484, -112.074, 1_608_139],
  ['Philadelphia', 'PA', 39.9526, -75.1652, 1_603_797],
  ['San Antonio', 'TX', 29.4241, -98.4936, 1_434_625],
  ['San Diego', 'CA', 32.7157, -117.1611, 1_386_932],
  ['Dallas', 'TX', 32.7767, -96.797, 1_304_379],
  ['San Jose', 'CA', 37.3382, -121.8863, 1_013_240],
  ['Austin', 'TX', 30.2672, -97.7431, 961_855],
  ['Jacksonville', 'FL', 30.3322, -81.6557, 949_611],
  ['Fort Worth', 'TX', 32.7555, -97.3308, 918_915],
  ['Columbus', 'OH', 39.9612, -82.9988, 905_748],
  ['Charlotte', 'NC', 35.2271, -80.8431, 874_579],
  ['San Francisco', 'CA', 37.7749, -122.4194, 873_965],
  ['Indianapolis', 'IN', 39.7684, -86.1581, 887_232],
  ['Seattle', 'WA', 47.6062, -122.3321, 737_015],
  ['Denver', 'CO', 39.7392, -104.9903, 715_522],
  ['Washington', 'DC', 38.9072, -77.0369, 689_545],
  ['Boston', 'MA', 42.3601, -71.0589, 675_647],
  ['El Paso', 'TX', 31.7619, -106.485, 678_815],
  ['Nashville', 'TN', 36.1627, -86.7816, 689_447],
  ['Detroit', 'MI', 42.3314, -83.0458, 639_111],
  ['Oklahoma City', 'OK', 35.4676, -97.5164, 681_054],
  ['Portland', 'OR', 45.5152, -122.6784, 652_503],
  ['Las Vegas', 'NV', 36.1699, -115.1398, 641_903],
  ['Memphis', 'TN', 35.1495, -90.049, 633_104],
  ['Louisville', 'KY', 38.2527, -85.7585, 633_045],
  ['Baltimore', 'MD', 39.2904, -76.6122, 585_708],
  ['Milwaukee', 'WI', 43.0389, -87.9065, 577_222],
  ['Albuquerque', 'NM', 35.0844, -106.6504, 564_559],
  ['Tucson', 'AZ', 32.2226, -110.9747, 542_629],
  ['Fresno', 'CA', 36.7378, -119.7871, 542_107],
  ['Sacramento', 'CA', 38.5816, -121.4944, 524_943],
  ['Mesa', 'AZ', 33.4152, -111.8315, 504_258],
  ['Kansas City', 'MO', 39.0997, -94.5786, 508_090],
  ['Atlanta', 'GA', 33.749, -84.388, 498_715],
  ['Omaha', 'NE', 41.2565, -95.9345, 486_051],
  ['Colorado Springs', 'CO', 38.8339, -104.8214, 478_961],
  ['Raleigh', 'NC', 35.7796, -78.6382, 467_665],
  ['Miami', 'FL', 25.7617, -80.1918, 442_241],
  ['Long Beach', 'CA', 33.7701, -118.1937, 466_742],
  ['Virginia Beach', 'VA', 36.8529, -75.978, 459_470],
  ['Oakland', 'CA', 37.8044, -122.2712, 440_646],
  ['Minneapolis', 'MN', 44.9778, -93.265, 429_954],
  ['Tulsa', 'OK', 36.154, -95.9928, 413_066],
  ['Tampa', 'FL', 27.9506, -82.4572, 384_959],
  ['Arlington', 'TX', 32.7357, -97.1081, 394_266],
  ['New Orleans', 'LA', 29.9511, -90.0715, 383_997],
  ['Wichita', 'KS', 37.6872, -97.3301, 397_532],
  ['Cleveland', 'OH', 41.4993, -81.6944, 372_624],
  ['Bakersfield', 'CA', 35.3733, -119.0187, 403_455],
  ['Aurora', 'CO', 39.7294, -104.8319, 386_261],
  ['Anaheim', 'CA', 33.8366, -117.9143, 346_824],
  ['Honolulu', 'HI', 21.3069, -157.8583, 350_964],
  ['Santa Ana', 'CA', 33.7455, -117.8677, 332_318],
  ['Riverside', 'CA', 33.9533, -117.3962, 314_998],
  ['Corpus Christi', 'TX', 27.8006, -97.3964, 317_863],
  ['Lexington', 'KY', 38.0406, -84.5037, 322_570],
  ['Henderson', 'NV', 36.0395, -114.9817, 317_610],
  ['Stockton', 'CA', 37.9577, -121.2908, 320_804],
  ['Saint Paul', 'MN', 44.9537, -93.09, 311_527],
  ['Cincinnati', 'OH', 39.1031, -84.512, 309_317],
  ['St. Louis', 'MO', 38.627, -90.1994, 301_578],
  ['Pittsburgh', 'PA', 40.4406, -79.9959, 302_971],
  ['Greensboro', 'NC', 36.0726, -79.792, 299_035],
  ['Anchorage', 'AK', 61.2181, -149.9003, 291_247],
  ['Plano', 'TX', 33.0198, -96.6989, 285_494],
  ['Lincoln', 'NE', 40.8136, -96.7026, 289_102],
  ['Orlando', 'FL', 28.5383, -81.3792, 307_573],
  ['Irvine', 'CA', 33.6846, -117.8265, 307_670],
  ['Newark', 'NJ', 40.7357, -74.1724, 311_549],
  ['Durham', 'NC', 35.994, -78.8986, 283_506],
  ['Chula Vista', 'CA', 32.6401, -117.0842, 275_487],
  ['Toledo', 'OH', 41.6528, -83.5379, 270_871],
  ['Fort Wayne', 'IN', 41.0793, -85.1394, 263_886],
  ['St. Petersburg', 'FL', 27.7676, -82.6403, 258_308],
  ['Laredo', 'TX', 27.5306, -99.4803, 255_205],
  ['Jersey City', 'NJ', 40.7178, -74.0431, 292_449],
  ['Chandler', 'AZ', 33.3062, -111.8413, 275_987],
  ['Madison', 'WI', 43.0731, -89.4012, 269_840],
  ['Lubbock', 'TX', 33.5779, -101.8552, 257_141],
  ['Reno', 'NV', 39.5296, -119.8138, 264_165],
  ['Buffalo', 'NY', 42.8864, -78.8784, 278_349],
  ['Gilbert', 'AZ', 33.3528, -111.789, 267_918],
  ['North Las Vegas', 'NV', 36.1989, -115.1175, 262_527],
  ['Irving', 'TX', 32.814, -96.9489, 256_684],
];

const MAJOR_POP = 1_000_000;
const LARGE_POP = 250_000;
const TOP_CAP = 8;

/** @internal Exported for unit tests. */
export function filterMajorLargeCityRows(): typeof US_MAJOR_LARGE_CITY_ROWS {
  return US_MAJOR_LARGE_CITY_ROWS.filter((r) => r[4] >= LARGE_POP);
}

/**
 * Cities within `radiusMiles` of the anchor, ranked by population then distance.
 * Uses {@link DemandDriverItem} shape: `visitors` holds population; `siteType`
 * labels major vs large metro tier for UI.
 */
export function computeMajorLargeCitiesNear(
  anchorLat: number,
  anchorLng: number,
  radiusMiles: number,
): {
  count: number;
  top: Array<{
    name: string;
    state: string | null;
    distance_miles: number;
    visitors?: number | null;
    siteType?: string | null;
  }>;
  radiusMiles: number;
} {
  const inRadius: Array<{
    name: string;
    state: string | null;
    distance_miles: number;
    visitors?: number | null;
    siteType?: string | null;
  }> = [];
  for (const [name, st, lat, lng, pop] of filterMajorLargeCityRows()) {
    const dist = haversineDistanceMiles(anchorLat, anchorLng, lat, lng);
    if (dist > radiusMiles) continue;
    const tier = pop >= MAJOR_POP ? 'Major city' : 'Large city';
    inRadius.push({
      name: `${name}, ${st}`,
      state: st,
      distance_miles: Math.round(dist * 10) / 10,
      visitors: pop,
      siteType: tier,
    });
  }
  inRadius.sort((a, b) => {
    const pa = a.visitors ?? 0;
    const pb = b.visitors ?? 0;
    if (pb !== pa) return pb - pa;
    return a.distance_miles - b.distance_miles;
  });
  return { count: inRadius.length, top: inRadius.slice(0, TOP_CAP), radiusMiles };
}
