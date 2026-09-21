/**
 * Export the ranked USA Hipcamp glamping Top 50 with 2025/2026 monthly
 * occupancy and rates, plus a Jan–Aug 2026 vs 2025 YoY sheet.
 */
import { copyFileSync, mkdirSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { resolve } from 'path';
import { config } from 'dotenv';
import ExcelJS from 'exceljs';
import {
  closeDigitalOceanPools,
  queryDigitalOceanReadOnly,
} from '../lib/digitalocean-readonly-db';
import { isOtaPlaceholderRate } from '../lib/ota-placeholder-rates';
import {
  addColorScale,
  HEATMAP_MONTH_ABBR,
  heatmapMonthHeader,
} from '../lib/ota-occupancy-rate-xlsx';

config({ path: resolve(process.cwd(), '.env.local') });

const YEARS = [2025, 2026] as const;
const YOY_THROUGH_MONTH = 8;
const FILE_NAME = 'Data — USA Hipcamp Glamping Top 50 — 2025-2026.xlsx';
const PREV_FILE_NAME = 'Data — USA Hipcamp Glamping Top 30 — 2025-2026.xlsx';
const LEGACY_FILE_NAME = 'Data — USA Hipcamp Glamping Top 20 — 2025-2026.xlsx';
const AEFINTYR_ID = '76cdc189-e763-4230-a757-12ce6e86223e';
const GLAMPING_SITES_SQL = `
glamping_sites AS (
  SELECT DISTINCT ON (ls.site_id)
    ls.site_id
  FROM hipcamp.latest_sites ls
  WHERE ls.property_id::text = ANY($1::text[])
    AND (
      ls.category IN (
        'safari-tent','bell-tent','canvas-tent','dome','yurt','glamping-pod',
        'treehouse','shepherd-s-hut','airstream','vintage-trailer','vardo'
      )
      OR (
        lower(ls.name) ~ '(airstream|safari[[:space:]/-]?tent|bell[[:space:]/-]?tent|canvas[[:space:]/-]?tent|geodesic|\\bdome\\b|\\byurt\\b|tree[[:space:]/-]?house|shepherd|glamping[[:space:]/-]?(pod|tent)|covered[[:space:]]+wagon|vintage[[:space:]]+trailer|tipi|teepee|wall[[:space:]]+tent)'
        AND ls.category NOT IN ('tents', 'vehicles', 'rv-tent')
      )
    )
    AND ls.category NOT IN ('tents', 'vehicles', 'rv-tent', 'quirky')
  ORDER BY ls.site_id
)
`;

type RankedPark = {
  rank: number;
  id: string;
  name: string;
  city: string;
  state: string;
  units: number;
  mix: string;
  href: string;
};

const PARKS: RankedPark[] = [
  {
    rank: 1,
    id: '397b41a7-b34f-4ac9-9de5-4fdbf8fb3aa9',
    name: 'Mendocino Grove',
    city: 'Mendocino',
    state: 'CA',
    units: 69,
    mix: 'Canvas tent',
    href: 'https://www.hipcamp.com/en-US/land/california-mendocino-grove-gzwjhoz7',
  },
  {
    rank: 2,
    id: '1ef1940a-38ed-4aba-b8c4-78ca891cbf67',
    name: 'Pampered Wilderness',
    city: 'Olympia',
    state: 'WA',
    units: 61,
    mix: 'Safari tent, glamping pod',
    href: 'https://www.hipcamp.com/en-US/land/washington-pampered-wilderness-7rvh920k',
  },
  {
    rank: 3,
    id: '009122c8-795c-4e71-9bea-702311aa724c',
    name: 'Mountain View Sanctuary & Retreat',
    city: 'Banning',
    state: 'CA',
    units: 45,
    mix: 'Vintage trailer',
    href: 'https://www.hipcamp.com/en-US/land/california-mountain-view-sanctuary-retreat-mxvhdpop',
  },
  {
    rank: 4,
    id: '242bfdc2-f090-481a-821f-73bb818c26de',
    name: 'Wildhaven Sonoma Glamping',
    city: 'Healdsburg',
    state: 'CA',
    units: 42,
    mix: 'Safari tent, canvas tent',
    href: 'https://www.hipcamp.com/en-US/land/california-wildhaven-sonoma-glamping-5x5h1l50',
  },
  {
    rank: 5,
    id: '4517fde6-3963-4eb0-a360-e38203f2afa8',
    name: 'The River Electric',
    city: 'Guerneville',
    state: 'CA',
    units: 40,
    mix: 'Canvas tent',
    href: 'https://www.hipcamp.com/en-US/land/california-the-river-electric-1-7rvhmkz2',
  },
  {
    rank: 6,
    id: '9d964052-68ed-4822-b52c-97fcd2d9b11a',
    name: 'Zion White Bison Resort',
    city: 'Virgin',
    state: 'UT',
    units: 36,
    mix: "Shepherd's hut, wagon, bell tent",
    href: 'https://www.hipcamp.com/en-US/land/utah-zion-white-bison-resort-glamping-5x5hvd0r',
  },
  {
    rank: 7,
    id: '875729ea-3808-4906-aaa0-6e043c4ca177',
    name: 'The Vintages Trailer Resort',
    city: 'Dayton',
    state: 'OR',
    units: 31,
    mix: 'Vintage trailer',
    href: 'https://www.hipcamp.com/en-US/land/oregon-the-vintages-trailer-resort-88lhm2l0',
  },
  {
    rank: 8,
    id: 'e85e167c-ab05-4ef7-b522-0442e23240b9',
    name: 'Hideaway Co',
    city: 'Rockwood',
    state: 'PA',
    units: 30,
    mix: 'Canvas tent',
    href: 'https://www.hipcamp.com/en-US/land/pennsylvania-hideaway-co-kk9hwpmw',
  },
  {
    rank: 9,
    id: 'aa7d777a-5a2c-425a-9152-3d76b3e674c8',
    name: 'Starlight Retreat Yellowstone',
    city: 'Island Park',
    state: 'ID',
    units: 27,
    mix: 'Bell tent, canvas tent, safari tent',
    href: 'https://www.hipcamp.com/en-US/land/idaho-starlight-retreat-yellowstone-6p0hymw5',
  },
  {
    rank: 10,
    id: '7682bfc1-545e-4d9d-b7e6-ef1af7bf4587',
    name: 'SoCal Camping',
    city: 'Kernville',
    state: 'CA',
    units: 24,
    mix: 'Canvas tent',
    href: 'https://www.hipcamp.com/en-US/land/california-socal-camping-lz9hj069',
  },
  {
    rank: 11,
    id: 'd9799f76-05a5-4eb6-a81c-da7fb0dc2257',
    name: 'Firelight Camps',
    city: 'Ithaca',
    state: 'NY',
    units: 22,
    mix: 'Canvas tent',
    href: 'https://www.hipcamp.com/en-US/land/new-york-ithaca-by-firelight-camps-y0zh677m',
  },
  {
    rank: 12,
    id: 'cbb23148-6c54-4b09-b006-a7c29dadd272',
    name: 'Field Trip Glamping Travelers Rest',
    city: 'Travelers Rest',
    state: 'SC',
    units: 22,
    mix: 'Bell tent, canvas tent, dome, yurt',
    href: 'https://www.hipcamp.com/en-US/land/south-carolina-field-trip-glamping-travelers-rest-qeohle5z',
  },
  {
    rank: 13,
    id: '5942b489-ecc5-45dd-b405-6ea2137bcef5',
    name: 'Starlite Vintage Resort',
    city: 'Cañon City',
    state: 'CO',
    units: 22,
    mix: 'Vintage trailer',
    href: 'https://www.hipcamp.com/en-US/land/colorado-starlite-vintage-resort-1-6p0hld1v',
  },
  {
    rank: 14,
    id: '9ec27ff3-fc01-4cb5-9144-dc68dcc4a881',
    name: 'Starlight Haven Hot Springs',
    city: 'Hot Springs',
    state: 'AR',
    units: 21,
    mix: 'Dome, treehouse, safari tent',
    href: 'https://www.hipcamp.com/en-US/land/arkansas-starlight-haven-hot-springs-xryhw6w8',
  },
  {
    rank: 15,
    id: '072bca1a-cf99-41a5-8c88-165ac2c27265',
    name: 'Outdoorsy Hill Country',
    city: 'Fredericksburg',
    state: 'TX',
    units: 21,
    mix: 'Safari tent',
    href: 'https://www.hipcamp.com/en-US/land/texas-outdoorsy-hill-country-j29hz251',
  },
  {
    rank: 16,
    id: '7722b067-cb1a-4269-ba1e-98acc21dde27',
    name: 'Good-Natured Glamping',
    city: 'Ellicottville',
    state: 'NY',
    units: 21,
    mix: 'Safari tent, canvas tent',
    href: 'https://www.hipcamp.com/en-US/land/new-york-good-natured-glamping-dw9h7dxn',
  },
  {
    rank: 17,
    id: '5def10fc-36a6-4a5b-9519-87417a42b12e',
    name: 'NaturLuxe and Stars',
    city: 'Watkins Glen',
    state: 'NY',
    units: 18,
    mix: 'Safari tent',
    href: 'https://www.hipcamp.com/en-US/land/new-york-naturluxe-and-stars-wz6hmko8',
  },
  {
    rank: 18,
    id: 'dd1e92f0-6a01-48c6-b68b-0db8b261ead4',
    name: 'Two Capes Lookout',
    city: 'Cloverdale',
    state: 'OR',
    units: 15,
    mix: 'Dome',
    href: 'https://www.hipcamp.com/en-US/land/oregon-two-capes-lookout-2ejhpn81',
  },
  {
    rank: 19,
    id: '9b0a29f2-d777-4cd8-b135-0a24868540b4',
    name: 'POV Lake Resort Glamping Campground',
    city: 'Phelps',
    state: 'WI',
    units: 15,
    mix: 'Bell tent, canvas tent, vintage trailer',
    href: 'https://www.hipcamp.com/en-US/land/wisconsin-coadys-pov-lake-resort-glamping-pw1hjkzl',
  },
  {
    rank: 20,
    id: '626625d7-98dd-402d-a1cd-496e3fd8f099',
    name: 'Starlight Haven at Weiss Lake',
    city: 'Cedar Bluff',
    state: 'AL',
    units: 15,
    mix: 'Dome, safari tent',
    href: 'https://www.hipcamp.com/en-US/land/alabama-starlight-haven-at-weiss-lake-6p0hlo71',
  },
  {
    rank: 21,
    id: '1f6b26ca-7440-4ce3-996a-3f061ff5086e',
    name: 'The Bunkhouses at the Rolling Huts',
    city: 'Winthrop',
    state: 'WA',
    units: 15,
    mix: 'Canvas tent',
    href: 'https://www.hipcamp.com/en-US/land/washington-the-tents-at-the-rolling-huts-y0zheyrv',
  },
  {
    rank: 22,
    id: '52c5263b-face-4cee-939a-7d88b1fa6e79',
    name: 'Mossquatch Resort',
    city: 'Forks',
    state: 'WA',
    units: 14,
    mix: 'Canvas tent',
    href: 'https://www.hipcamp.com/en-US/land/washington-mossquatch-resort-lz9hjj8v',
  },
  {
    rank: 23,
    id: 'a81d39a9-d94f-4b4e-a793-039bff4541df',
    name: 'Lumen Nature Retreat',
    city: 'North Woodstock',
    state: 'NH',
    units: 13,
    mix: 'Safari tent, canvas tent',
    href: 'https://www.hipcamp.com/en-US/land/new-hampshire-lumen-nature-retreat-ozxh5plq',
  },
  {
    rank: 24,
    id: '84a13b82-8732-44ac-8c90-ab53171fe06a',
    name: "Out'n'About Treesort",
    city: 'Cave Junction',
    state: 'OR',
    units: 13,
    mix: 'Treehouse, yurt',
    href: 'https://www.hipcamp.com/en-US/land/oregon-out-n-about-treehouse-treesort-88lh18ww',
  },
  {
    rank: 25,
    id: 'fe444ce2-d2a1-4cf8-b86d-f038a911649d',
    name: 'SFR Jalama',
    city: 'Lompoc',
    state: 'CA',
    units: 13,
    mix: 'Airstream, bell tent, canvas tent',
    href: 'https://www.hipcamp.com/en-US/land/california-sfr-jalama-kk9hr9x6',
  },
  {
    rank: 26,
    id: '4c236498-1c2c-49a9-8dac-d22ea9fb4800',
    name: 'Nauti Otter Inn Yurt Village',
    city: 'Seward',
    state: 'AK',
    units: 12,
    mix: 'Yurt',
    href: 'https://www.hipcamp.com/en-US/land/alaska-nauti-otter-inn-yurt-village-4y0zhmoq',
  },
  {
    rank: 27,
    id: '535d20c5-c5b1-4fe3-ae05-1e5868016446',
    name: 'The Outpost Grand Canyon',
    city: 'Valle',
    state: 'AZ',
    units: 12,
    mix: 'Airstream',
    href: 'https://www.hipcamp.com/en-US/land/arizona-the-outpost-grand-canyon-5x5hv6mp',
  },
  {
    rank: 28,
    id: '197af3eb-f36c-47dc-8e70-55dc1c20bdfb',
    name: 'Yellowstone Dreamin Camp',
    city: 'South Glastonbury',
    state: 'MT',
    units: 12,
    mix: 'Canvas tent',
    href: 'https://www.hipcamp.com/en-US/land/montana-yellowstone-dreamin-camp-9mxh7mle',
  },
  {
    rank: 29,
    id: '33d4b9e1-551d-48ae-9e48-4c2dde150401',
    name: 'Blue Mountain Resort',
    city: 'Kunkletown',
    state: 'PA',
    units: 11,
    mix: 'Canvas tent',
    href: 'https://www.hipcamp.com/en-US/land/pennsylvania-blue-mountain-resort-zwjhrz00',
  },
  {
    rank: 30,
    id: '683c3933-4940-4225-8df7-92655f2cb204',
    name: 'Camp Hideaway Fredericksburg',
    city: 'Fredericksburg',
    state: 'TX',
    units: 11,
    mix: 'Canvas tent',
    href: 'https://www.hipcamp.com/en-US/land/texas-camp-hideaway-fredericksburg-nelhr75n',
  },
  {
    rank: 31,
    id: '371f0c57-b58f-4c10-829c-13eb6a6bb749',
    name: 'Tammah Jackson Hole',
    city: 'Wilson',
    state: 'WY',
    units: 11,
    mix: 'Dome',
    href: 'https://www.hipcamp.com/en-US/land/wyoming-tammah-jackson-hole-v1qhmvx2',
  },
  {
    rank: 32,
    id: '483e2d79-b552-460d-9585-6e24fd9e438d',
    name: 'Tiki Hut Yurts',
    city: 'St. Ignace',
    state: 'MI',
    units: 11,
    mix: 'Yurt',
    href: 'https://www.hipcamp.com/en-US/land/michigan-tiki-hut-yurts-dw9h7nkd',
  },
  {
    rank: 33,
    id: '5d14cf8c-3cac-46f3-840f-54cdd6355ddb',
    name: 'Treehouse Village',
    city: 'Eureka Springs',
    state: 'AR',
    units: 11,
    mix: 'Treehouse',
    href: 'https://www.hipcamp.com/en-US/land/arkansas-all-seasons-luxury-properties-j29hmnxd',
  },
  {
    rank: 34,
    id: '76cdc189-e763-4230-a757-12ce6e86223e',
    name: 'Aefintyr',
    city: 'Altura',
    state: 'MN',
    units: 10,
    mix: 'Bell tent, treehouse, quirky',
    href: 'https://www.hipcamp.com/en-US/land/minnesota-aefintyr-lz9hooll',
  },
  {
    rank: 35,
    id: '0fc49f12-6660-49e4-ae8d-05a34ff93540',
    name: 'Field Trip NM',
    city: 'Pecos',
    state: 'NM',
    units: 10,
    mix: 'Airstream, canvas tent, safari tent',
    href: 'https://www.hipcamp.com/en-US/land/new-mexico-field-trip-nm-6p0h7d18',
  },
  {
    rank: 36,
    id: '27b05ed7-09e9-4fbf-88eb-654b0dd9f520',
    name: 'Nine Pines Retreats',
    city: 'Cadiz',
    state: 'KY',
    units: 10,
    mix: 'Dome, safari tent',
    href: 'https://www.hipcamp.com/en-US/land/kentucky-nine-pines-retreats-9mxhywem',
  },
  {
    rank: 37,
    id: '4de0d68c-9a6e-4950-8742-745df52acc6a',
    name: 'Parkside Tepees',
    city: 'Pigeon Forge',
    state: 'TN',
    units: 10,
    mix: 'Bell tent, yurt',
    href: 'https://www.hipcamp.com/en-US/land/tennessee-parkside-tepees-ex9hm0qj',
  },
  {
    rank: 38,
    id: 'a91fcd7b-18f0-47e8-b39f-5461ee2467c4',
    name: 'Roaring River Campground',
    city: 'Cassville',
    state: 'MO',
    units: 10,
    mix: 'Canvas tent, safari tent',
    href: 'https://www.hipcamp.com/en-US/land/missouri-roaring-river-1-zwjh2v1x',
  },
  {
    rank: 39,
    id: '09df4c69-3b07-4af7-ad2c-008ec63b480a',
    name: 'Timberline Glamping Orange Beach',
    city: 'Orange Beach',
    state: 'AL',
    units: 10,
    mix: 'Safari tent',
    href: 'https://www.hipcamp.com/en-US/land/alabama-timberline-glamping-orange-beach-j29hzok7',
  },
  {
    rank: 40,
    id: '7b76c1a2-4ea7-4b3a-b9c8-8dea1b5dad34',
    name: 'Walden Retreats Hill Country',
    city: 'Johnson City',
    state: 'TX',
    units: 10,
    mix: 'Safari tent',
    href: 'https://www.hipcamp.com/en-US/land/texas-walden-retreats-hill-country-lz9hw0qp',
  },
  {
    rank: 41,
    id: '7588bda2-2b3f-4999-825e-3da8750d96b7',
    name: 'Glat Austin at Lake Bastrop North Shore Park',
    city: 'Camp Swift',
    state: 'TX',
    units: 10,
    mix: 'Safari tent',
    href: 'https://www.hipcamp.com/en-US/land/texas-glat-austin-at-lake-bastrop-north-shore-park-pw1h1yp9',
  },
  {
    rank: 42,
    id: '221d4d48-2baf-418f-90f0-3736f1b244b1',
    name: 'Glampful Camp',
    city: 'Broadalbin',
    state: 'NY',
    units: 9,
    mix: 'Safari tent',
    href: 'https://www.hipcamp.com/en-US/land/new-york-glampful-camp-nelhmp71',
  },
  {
    rank: 43,
    id: 'db72b5d2-20b1-498d-b520-32a2457bc586',
    name: 'Glamping Canyonlands',
    city: 'Monticello',
    state: 'UT',
    units: 9,
    mix: 'Bell tent, glamping pod, safari tent, treehouse',
    href: 'https://www.hipcamp.com/en-US/land/utah-glamping-canyonlands-lz9hn5oj',
  },
  {
    rank: 44,
    id: '250d6985-ce74-42a5-bb5b-f1ba741ad064',
    name: 'Madbush Falls',
    city: 'Waitsfield',
    state: 'VT',
    units: 9,
    mix: 'Canvas tent',
    href: 'https://www.hipcamp.com/en-US/land/vermont-madbush-falls-pw1hrm5z',
  },
  {
    rank: 45,
    id: '5caebf05-7148-4a15-9a72-98744859de45',
    name: 'Yurt Glamping Tents + Farm Animals',
    city: 'Tiskilwa',
    state: 'IL',
    units: 9,
    mix: 'Bell tent, dome, yurt',
    href: 'https://www.hipcamp.com/en-US/land/illinois-heated-tents-cabin-farm-animals-wz6h5d52',
  },
  {
    rank: 46,
    id: '332b9682-e25d-4d8b-9399-1c83c03e1fb1',
    name: 'Bodhi Farms',
    city: 'Bozeman',
    state: 'MT',
    units: 9,
    mix: 'Tipi',
    href: 'https://www.hipcamp.com/en-US/land/montana-bodhi-farms-ozxhv1rd',
  },
  {
    rank: 47,
    id: '7353ba70-d735-46bc-b860-7c1ddfaa7e0d',
    name: 'DayDreamer Domes',
    city: 'South Haven',
    state: 'MI',
    units: 8,
    mix: 'Dome',
    href: 'https://www.hipcamp.com/en-US/land/michigan-daydreamer-domes-9mxhmo6j',
  },
  {
    rank: 48,
    id: '9ebd2162-de86-4662-ae96-395421836f22',
    name: 'The Hocking Hills Treehouse Resort',
    city: 'Rockbridge',
    state: 'OH',
    units: 8,
    mix: 'Treehouse',
    href: 'https://www.hipcamp.com/en-US/land/ohio-the-hygge-treehouse-lz9h0qzl',
  },
  {
    rank: 49,
    id: '2b19bd76-b995-48cd-8103-cc9f5f0ec72f',
    name: 'Johnny Yurts',
    city: 'Johnson City',
    state: 'TX',
    units: 8,
    mix: 'Yurt',
    href: 'https://www.hipcamp.com/en-US/land/texas-johnny-yurts-nelhjvxo',
  },
  {
    rank: 50,
    id: '4e258744-1e0f-4748-b02b-237a7680c32c',
    name: 'Glamping at Cheaha State Park',
    city: 'Delta',
    state: 'AL',
    units: 8,
    mix: 'Safari tent',
    href: 'https://www.hipcamp.com/en-US/land/alabama-glamping-at-cheaha-state-park-xryhn59n',
  },
];

type MonthlyDbRow = {
  property_id: string;
  year: string;
  month: string;
  month_name: string;
  avg_occupancy_rate_pct: string;
  median_retail_daily_rate: string | null;
  mean_retail_daily_rate: string | null;
  site_count: string;
  sites_with_occ_above_5: string;
};

type MonthlyRow = {
  property_id: string;
  year: number;
  month: number;
  month_name: string;
  occ: number;
  median_rate: number | null;
  mean_rate: number | null;
  revpar: number | null;
  site_count: number;
  sites_with_occ_above_5: number;
};

type YoyRow = {
  rank: number;
  id: string;
  name: string;
  city: string;
  state: string;
  units: number;
  mix: string;
  href: string;
  months_2025: number;
  months_2026: number;
  occ_2025: number | null;
  occ_2026: number | null;
  occ_pp: number | null;
  adr_2025: number | null;
  adr_2026: number | null;
  adr_pct: number | null;
  revpar_2025: number | null;
  revpar_2026: number | null;
  revpar_pct: number | null;
  calendar: 'usable' | 'blocked' | 'thin' | 'missing' | 'short';
};

function parseNum(raw: string | null | undefined): number | null {
  if (raw == null || raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function calendarFlag(opts: {
  occ2025: number | null;
  occ2026: number | null;
  months2025: number;
  months2026: number;
}): YoyRow['calendar'] {
  if (opts.occ2025 == null || opts.occ2026 == null || opts.months2025 === 0 || opts.months2026 === 0) {
    return 'missing';
  }
  if (opts.occ2025 >= 99.5 || opts.occ2026 >= 99.5) return 'blocked';
  if (opts.occ2025 < 5 || opts.occ2026 < 5) return 'thin';
  if (opts.months2025 < 4 || opts.months2026 < 4) return 'short';
  return 'usable';
}

function isRateOutlier(row: YoyRow): boolean {
  return row.adr_pct != null && Math.abs(row.adr_pct) >= 50;
}

function inAdrSet(row: YoyRow): boolean {
  return row.calendar === 'usable' && !isRateOutlier(row) && row.id !== AEFINTYR_ID;
}

function styleHeader(ws: ExcelJS.Worksheet, colCount: number) {
  const row = ws.getRow(1);
  row.font = { bold: true };
  row.alignment = { wrapText: true, vertical: 'middle' };
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: colCount },
  };
}

async function fetchMonthly(): Promise<MonthlyRow[]> {
  const ids = PARKS.map((park) => park.id);
  const { rows } = await queryDigitalOceanReadOnly<MonthlyDbRow>(
    'campings',
    `
    WITH ${GLAMPING_SITES_SQL}
    SELECT
      sma.property_id::text AS property_id,
      sma.year::text AS year,
      sma.month::text AS month,
      sma.month_name,
      round(avg(sma.avg_occupancy::numeric), 2)::text AS avg_occupancy_rate_pct,
      round((percentile_cont(0.5) WITHIN GROUP (ORDER BY sma.avg_price::numeric)
        FILTER (WHERE sma.avg_occupancy::float > 5))::numeric, 2)::text AS median_retail_daily_rate,
      round(avg(sma.avg_price::numeric) FILTER (WHERE sma.avg_occupancy::float > 5), 2)::text AS mean_retail_daily_rate,
      count(DISTINCT sma.site_id)::text AS site_count,
      count(DISTINCT sma.site_id) FILTER (WHERE sma.avg_occupancy::float > 5)::text AS sites_with_occ_above_5
    FROM hipcamp.site_monthly_analytics sma
    JOIN glamping_sites gs ON gs.site_id::text = sma.site_id::text
    WHERE sma.property_id = ANY($1::text[])
      AND sma.year = ANY($2::numeric[])
    GROUP BY sma.property_id, sma.year, sma.month, sma.month_name
    ORDER BY sma.property_id, sma.year, sma.month::int
    `,
    [ids, [...YEARS]],
  );

  return rows.map((row) => {
    const occ = parseNum(row.avg_occupancy_rate_pct) ?? 0;
    const sitesAbove5 = parseInt(row.sites_with_occ_above_5 ?? '0', 10);
    const medianRaw = row.median_retail_daily_rate ?? '';
    const meanRaw = row.mean_retail_daily_rate ?? '';
    const showRates =
      (occ > 5 || sitesAbove5 >= 5) &&
      !isOtaPlaceholderRate(medianRaw) &&
      medianRaw.trim() !== '';
    const median = showRates && !isOtaPlaceholderRate(medianRaw) ? parseNum(medianRaw) : null;
    const meanRate = showRates && !isOtaPlaceholderRate(meanRaw) ? parseNum(meanRaw) : null;
    return {
      property_id: row.property_id,
      year: Number(row.year),
      month: Number(row.month),
      month_name: row.month_name,
      occ,
      median_rate: median,
      mean_rate: meanRate,
      revpar: median == null ? null : round2((occ * median) / 100),
      site_count: parseInt(row.site_count ?? '0', 10),
      sites_with_occ_above_5: sitesAbove5,
    };
  });
}

function yoyForPark(park: RankedPark, monthly: MonthlyRow[]): YoyRow {
  const inWindow = (year: number) =>
    monthly.filter(
      (row) =>
        row.property_id === park.id &&
        row.year === year &&
        row.month >= 1 &&
        row.month <= YOY_THROUGH_MONTH,
    );
  const y25 = inWindow(2025);
  const y26 = inWindow(2026);
  const occ2025 = mean(y25.map((row) => row.occ));
  const occ2026 = mean(y26.map((row) => row.occ));
  const adr2025 = mean(y25.map((row) => row.median_rate).filter((n): n is number => n != null));
  const adr2026 = mean(y26.map((row) => row.median_rate).filter((n): n is number => n != null));
  const revpar2025 = occ2025 != null && adr2025 != null ? (occ2025 * adr2025) / 100 : null;
  const revpar2026 = occ2026 != null && adr2026 != null ? (occ2026 * adr2026) / 100 : null;
  const occPp = occ2025 != null && occ2026 != null ? occ2026 - occ2025 : null;
  const adrPct =
    adr2025 != null && adr2026 != null && adr2025 !== 0 ? ((adr2026 - adr2025) / adr2025) * 100 : null;
  const revparPct =
    revpar2025 != null && revpar2026 != null && revpar2025 !== 0
      ? ((revpar2026 - revpar2025) / revpar2025) * 100
      : null;
  const calendar = calendarFlag({
    occ2025,
    occ2026,
    months2025: y25.length,
    months2026: y26.length,
  });

  return {
    rank: park.rank,
    id: park.id,
    name: park.name,
    city: park.city,
    state: park.state,
    units: park.units,
    mix: park.mix,
    href: park.href,
    months_2025: y25.length,
    months_2026: y26.length,
    occ_2025: occ2025 == null ? null : round2(occ2025),
    occ_2026: occ2026 == null ? null : round2(occ2026),
    occ_pp: occPp == null ? null : round2(occPp),
    adr_2025: adr2025 == null ? null : round2(adr2025),
    adr_2026: adr2026 == null ? null : round2(adr2026),
    adr_pct: adrPct == null ? null : round2(adrPct),
    revpar_2025: revpar2025 == null ? null : round2(revpar2025),
    revpar_2026: revpar2026 == null ? null : round2(revpar2026),
    revpar_pct: revparPct == null ? null : round2(revparPct),
    calendar,
  };
}

function setMonthlyYoy(
  monthly: MonthlyRow[],
  adrParkIds: string[],
): Array<{
  month: number;
  label: string;
  occ_2025: number | null;
  occ_2026: number | null;
  occ_pp: number | null;
  adr_2025: number | null;
  adr_2026: number | null;
  adr_pct: number | null;
}> {
  return Array.from({ length: YOY_THROUGH_MONTH }, (_, idx) => {
    const month = idx + 1;
    const occFor = (year: number) =>
      mean(
        PARKS.map((park) =>
          monthly.find((row) => row.property_id === park.id && row.year === year && row.month === month),
        )
          .map((row) => row?.occ)
          .filter((n): n is number => n != null),
      );
    const adrFor = (year: number) =>
      mean(
        adrParkIds
          .map((id) =>
            monthly.find((row) => row.property_id === id && row.year === year && row.month === month),
          )
          .map((row) => row?.median_rate)
          .filter((n): n is number => n != null),
      );
    const occ2025 = occFor(2025);
    const occ2026 = occFor(2026);
    const adr2025 = adrFor(2025);
    const adr2026 = adrFor(2026);
    return {
      month,
      label: HEATMAP_MONTH_ABBR[month - 1]!,
      occ_2025: occ2025 == null ? null : round2(occ2025),
      occ_2026: occ2026 == null ? null : round2(occ2026),
      occ_pp: occ2025 == null || occ2026 == null ? null : round2(occ2026 - occ2025),
      adr_2025: adr2025 == null ? null : round2(adr2025),
      adr_2026: adr2026 == null ? null : round2(adr2026),
      adr_pct:
        adr2025 == null || adr2026 == null || adr2025 === 0
          ? null
          : round2(((adr2026 - adr2025) / adr2025) * 100),
    };
  });
}

function addParksSheet(wb: ExcelJS.Workbook, yoy: YoyRow[]) {
  const ws = wb.addWorksheet('Top 50');
  const headers = [
    'rank',
    'property_name',
    'city',
    'state',
    'units',
    'mix',
    'jan_aug_occ_2025',
    'jan_aug_occ_2026',
    'occ_pp_yoy',
    'jan_aug_adr_2025',
    'jan_aug_adr_2026',
    'adr_pct_yoy',
    'calendar_flag',
    'hipcamp_url',
  ];
  ws.addRow(headers);
  styleHeader(ws, headers.length);
  for (const row of yoy) {
    ws.addRow([
      row.rank,
      row.name,
      row.city,
      row.state,
      row.units,
      row.mix,
      row.occ_2025,
      row.occ_2026,
      row.occ_pp,
      row.adr_2025,
      row.adr_2026,
      row.adr_pct == null ? null : row.adr_pct / 100,
      row.calendar,
      row.href,
    ]);
  }
  ws.getColumn(7).numFmt = '0.00';
  ws.getColumn(8).numFmt = '0.00';
  ws.getColumn(9).numFmt = '0.00';
  ws.getColumn(10).numFmt = '$#,##0.00';
  ws.getColumn(11).numFmt = '$#,##0.00';
  ws.getColumn(12).numFmt = '0.0%';
  ws.getColumn(2).width = 36;
  ws.getColumn(6).width = 36;
  ws.getColumn(14).width = 56;
  for (let col = 1; col <= headers.length; col += 1) {
    if (ws.getColumn(col).width == null) ws.getColumn(col).width = 16;
  }
}

function addMonthlySheet(wb: ExcelJS.Workbook, monthly: MonthlyRow[]) {
  const ws = wb.addWorksheet('Monthly');
  const headers = [
    'rank',
    'property_name',
    'city',
    'state',
    'year',
    'month',
    'month_name',
    'avg_occupancy_rate_pct',
    'median_retail_daily_rate',
    'mean_retail_daily_rate',
    'revpar',
    'site_count',
    'sites_with_occ_above_5',
  ];
  ws.addRow(headers);
  styleHeader(ws, headers.length);
  const byId = new Map(PARKS.map((park) => [park.id, park]));
  const ordered = [...monthly].sort((a, b) => {
    const rankA = byId.get(a.property_id)?.rank ?? 99;
    const rankB = byId.get(b.property_id)?.rank ?? 99;
    if (rankA !== rankB) return rankA - rankB;
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });
  for (const row of ordered) {
    const park = byId.get(row.property_id);
    if (!park) continue;
    ws.addRow([
      park.rank,
      park.name,
      park.city,
      park.state,
      row.year,
      row.month,
      row.month_name,
      row.occ,
      row.median_rate,
      row.mean_rate,
      row.revpar,
      row.site_count,
      row.sites_with_occ_above_5,
    ]);
  }
  ws.getColumn(8).numFmt = '0.00';
  ws.getColumn(9).numFmt = '$#,##0.00';
  ws.getColumn(10).numFmt = '$#,##0.00';
  ws.getColumn(11).numFmt = '$#,##0.00';
  ws.getColumn(2).width = 36;
  for (let col = 1; col <= headers.length; col += 1) {
    if (ws.getColumn(col).width == null) ws.getColumn(col).width = 14;
  }
}

function addHeatmap(
  wb: ExcelJS.Workbook,
  monthly: MonthlyRow[],
  year: number,
  metric: 'occupancy' | 'rate',
) {
  const sheetName = metric === 'occupancy' ? `Occupancy ${year}` : `Rate ${year}`;
  const ws = wb.addWorksheet(sheetName);
  ws.views = [{ showGridLines: false, state: 'frozen', ySplit: 1, xSplit: 1 }];
  ws.properties.defaultColWidth = 12.63;
  ws.getColumn(1).width = 28.75;
  ws.getCell('A1').value = 'property_name';
  ws.getCell('A1').font = { bold: true };
  const months = year === 2026 ? [1, 2, 3, 4, 5, 6, 7, 8] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  months.forEach((month, idx) => {
    const cell = ws.getCell(1, idx + 2);
    cell.value = heatmapMonthHeader(month);
    cell.font = { bold: true };
  });
  const totalCol = months.length + 2;
  ws.getCell(1, totalCol).value = 'Grand Total';
  ws.getCell(1, totalCol).font = { bold: true };

  PARKS.forEach((park, rowIdx) => {
    const excelRow = rowIdx + 2;
    ws.getCell(excelRow, 1).value = park.name;
    const values: number[] = [];
    months.forEach((month, monthIdx) => {
      const found = monthly.find(
        (row) => row.property_id === park.id && row.year === year && row.month === month,
      );
      const value = metric === 'occupancy' ? found?.occ : found?.median_rate;
      if (value == null) return;
      const cell = ws.getCell(excelRow, monthIdx + 2);
      cell.value = value;
      cell.numFmt = metric === 'rate' ? '$#,##0.00' : '0.00';
      values.push(value);
    });
    const avg = mean(values);
    if (avg == null) return;
    const totalCell = ws.getCell(excelRow, totalCol);
    totalCell.value = round2(avg);
    totalCell.numFmt = metric === 'rate' ? '$#,##0.00' : '0.00';
  });

  const lastRow = PARKS.length + 2;
  ws.getCell(lastRow, 1).value = 'Grand Total';
  ws.getCell(lastRow, 1).font = { bold: true };
  months.forEach((month, monthIdx) => {
    const colValues = PARKS.map((park) => {
      const found = monthly.find(
        (row) => row.property_id === park.id && row.year === year && row.month === month,
      );
      return metric === 'occupancy' ? found?.occ : found?.median_rate;
    }).filter((n): n is number => n != null);
    const avg = mean(colValues);
    if (avg == null) return;
    const cell = ws.getCell(lastRow, monthIdx + 2);
    cell.value = round2(avg);
    cell.font = { bold: true };
    cell.numFmt = metric === 'rate' ? '$#,##0.00' : '0.00';
  });

  const lastColLetter = months.length >= 12 ? 'N' : String.fromCharCode(65 + months.length);
  addColorScale(ws, `B2:${lastColLetter}${lastRow}`, metric);
}

function addYoySheet(
  wb: ExcelJS.Workbook,
  yoy: YoyRow[],
  monthlyYoy: ReturnType<typeof setMonthlyYoy>,
) {
  const ws = wb.addWorksheet('YoY through August');
  const headers = [
    'rank',
    'property_name',
    'city',
    'state',
    'units',
    'months_2025',
    'months_2026',
    'occ_jan_aug_2025',
    'occ_jan_aug_2026',
    'occ_pp_yoy',
    'adr_jan_aug_2025',
    'adr_jan_aug_2026',
    'adr_pct_yoy',
    'revpar_jan_aug_2025',
    'revpar_jan_aug_2026',
    'revpar_pct_yoy',
    'calendar_flag',
    'in_adr_average',
  ];
  ws.addRow(headers);
  styleHeader(ws, headers.length);
  for (const row of yoy) {
    ws.addRow([
      row.rank,
      row.name,
      row.city,
      row.state,
      row.units,
      row.months_2025,
      row.months_2026,
      row.occ_2025,
      row.occ_2026,
      row.occ_pp,
      row.adr_2025,
      row.adr_2026,
      row.adr_pct == null ? null : row.adr_pct / 100,
      row.revpar_2025,
      row.revpar_2026,
      row.revpar_pct == null ? null : row.revpar_pct / 100,
      row.calendar,
      inAdrSet(row) ? 'yes' : 'no',
    ]);
  }
  const usable = yoy.filter((row) => row.calendar === 'usable');
  const rateStable = usable.filter((row) => inAdrSet(row));
  const setOcc2025 = mean(usable.map((row) => row.occ_2025).filter((n): n is number => n != null));
  const setOcc2026 = mean(usable.map((row) => row.occ_2026).filter((n): n is number => n != null));
  const setAdr2025 = mean(rateStable.map((row) => row.adr_2025).filter((n): n is number => n != null));
  const setAdr2026 = mean(rateStable.map((row) => row.adr_2026).filter((n): n is number => n != null));
  const setRevpar2025 = mean(rateStable.map((row) => row.revpar_2025).filter((n): n is number => n != null));
  const setRevpar2026 = mean(rateStable.map((row) => row.revpar_2026).filter((n): n is number => n != null));
  ws.addRow([
    '',
    'COMPARABLE SET AVERAGE',
    '',
    '',
    '',
    '',
    '',
    setOcc2025 == null ? null : round2(setOcc2025),
    setOcc2026 == null ? null : round2(setOcc2026),
    setOcc2025 == null || setOcc2026 == null ? null : round2(setOcc2026 - setOcc2025),
    setAdr2025 == null ? null : round2(setAdr2025),
    setAdr2026 == null ? null : round2(setAdr2026),
    setAdr2025 == null || setAdr2026 == null || setAdr2025 === 0
      ? null
      : (setAdr2026 - setAdr2025) / setAdr2025,
    setRevpar2025 == null ? null : round2(setRevpar2025),
    setRevpar2026 == null ? null : round2(setRevpar2026),
    setRevpar2025 == null || setRevpar2026 == null || setRevpar2025 === 0
      ? null
      : (setRevpar2026 - setRevpar2025) / setRevpar2025,
    `${usable.length} occ / ${rateStable.length} rate`,
  ]);
  ws.getRow(ws.rowCount).font = { bold: true };

  ws.getColumn(8).numFmt = '0.00';
  ws.getColumn(9).numFmt = '0.00';
  ws.getColumn(10).numFmt = '0.00';
  ws.getColumn(11).numFmt = '$#,##0.00';
  ws.getColumn(12).numFmt = '$#,##0.00';
  ws.getColumn(13).numFmt = '0.0%';
  ws.getColumn(14).numFmt = '$#,##0.00';
  ws.getColumn(15).numFmt = '$#,##0.00';
  ws.getColumn(16).numFmt = '0.0%';
  ws.getColumn(2).width = 36;
  for (let col = 1; col <= headers.length; col += 1) {
    if (ws.getColumn(col).width == null) ws.getColumn(col).width = 16;
  }

  const start = ws.rowCount + 3;
  ws.getCell(start, 1).value =
    'Unweighted set average by month. Occupancy = all parks with glamping-SKU data that month. ADR = glamping-SKU parks in the ADR average (Aefintyr and ±50% ADR outliers out).';
  ws.getCell(start, 1).font = { bold: true };
  const monthHeaders = [
    'month',
    'occ_2025',
    'occ_2026',
    'occ_pp_yoy',
    'adr_2025',
    'adr_2026',
    'adr_pct_yoy',
  ];
  ws.addRow(monthHeaders);
  ws.getRow(ws.rowCount).font = { bold: true };
  for (const row of monthlyYoy) {
    ws.addRow([
      row.label,
      row.occ_2025,
      row.occ_2026,
      row.occ_pp,
      row.adr_2025,
      row.adr_2026,
      row.adr_pct == null ? null : row.adr_pct / 100,
    ]);
  }
}

function addNotesSheet(wb: ExcelJS.Workbook, max2026Month: number) {
  const ws = wb.addWorksheet('Notes');
  ws.addRow(['field', 'value']);
  ws.getRow(1).font = { bold: true };
  const notes: Array<[string, string]> = [
    ['source', 'DigitalOcean campings.hipcamp.site_monthly_analytics'],
    ['pulled', new Date().toISOString()],
    [
      'set',
      'Largest US Hipcamp glamping resorts: 50 parks ranked by advertised units. Core cut is 10+ units, ≥75% lodging, ≥75% distinctive glamping SKUs, ≥2 unique SKUs. The added 20 parks are researched near-misses: one-SKU vintage-trailer inventory, 70–74% glamping SKU share, or 8–9 unit high-glamp parks.',
    ],
    ['years', '2025 full year; 2026 through latest available month'],
    ['yoy_window', `January–August (months 1–${YOY_THROUGH_MONTH})`],
    ['latest_2026_month_in_pull', String(max2026Month)],
    [
      'occupancy',
      'Unweighted mean of distinctive-glamping site-level Hipcamp avg_occupancy for the property-month. Tents, RV, vehicles, cabins, and quirky/outdoor-bed SKUs are excluded; treehouses tagged as cabin stay in. This is OTA reservation occupancy, not park occupancy. 100% usually means a blocked calendar.',
    ],
    [
      'rate',
      'Median of distinctive-glamping site avg_price in months with occupancy > 5%. Same SKU filter as occupancy. Placeholder rates $1011.50 / $1026.67 / $705.06 are blank. RevPAR = occupancy × median rate / 100.',
    ],
    [
      'yoy',
      'Jan–Aug 2026 vs Jan–Aug 2025, unweighted monthly means. Comparable occupancy average needs ≥4 months in both years and occupancy between 5% and 99.5%. ADR/RevPAR average uses that same comparable set, then drops parks whose ADR YoY is ≥50% (Outdoorsy Hill Country, Tammah Jackson Hole) and drops Aefintyr (rustic hike-in / outdoor-bed inventory, not resort glamping).',
    ],
    [
      'calendar_flag',
      'usable = comparable; short = both years present but <4 months in one year; blocked = ≥99.5% occupancy; thin = <5%; missing = no Jan–Aug months in one year.',
    ],
    ['heatmap_colors', 'Occupancy 0 / p50 / 100; Rate min / p50 / max; #CC4125 / #FFFFFF / #6AA84F'],
  ];
  for (const [field, value] of notes) ws.addRow([field, value]);
  ws.getColumn(1).width = 28;
  ws.getColumn(2).width = 110;
}

async function main() {
  const monthly = await fetchMonthly();
  const yoy = PARKS.map((park) => yoyForPark(park, monthly));
  const monthlyYoy = setMonthlyYoy(
    monthly,
    yoy.filter((row) => inAdrSet(row)).map((row) => row.id),
  );
  const max2026Month = monthly
    .filter((row) => row.year === 2026)
    .reduce((max, row) => Math.max(max, row.month), 0);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Sage Outdoor Advisory';
  wb.created = new Date();
  addParksSheet(wb, yoy);
  addMonthlySheet(wb, monthly);
  addHeatmap(wb, monthly, 2025, 'rate');
  addHeatmap(wb, monthly, 2026, 'rate');
  addHeatmap(wb, monthly, 2025, 'occupancy');
  addHeatmap(wb, monthly, 2026, 'occupancy');
  addYoySheet(wb, yoy, monthlyYoy);
  addNotesSheet(wb, max2026Month);

  const reportsDir = resolve(process.cwd(), 'reports');
  mkdirSync(reportsDir, { recursive: true });
  const reportsPath = resolve(reportsDir, FILE_NAME);
  const downloadsPath = resolve(homedir(), 'Downloads', FILE_NAME);
  const prevReportsPath = resolve(reportsDir, PREV_FILE_NAME);
  const prevDownloadsPath = resolve(homedir(), 'Downloads', PREV_FILE_NAME);
  const legacyReportsPath = resolve(reportsDir, LEGACY_FILE_NAME);
  const legacyDownloadsPath = resolve(homedir(), 'Downloads', LEGACY_FILE_NAME);
  await wb.xlsx.writeFile(reportsPath);
  copyFileSync(reportsPath, downloadsPath);
  copyFileSync(reportsPath, prevReportsPath);
  copyFileSync(reportsPath, prevDownloadsPath);
  copyFileSync(reportsPath, legacyReportsPath);
  copyFileSync(reportsPath, legacyDownloadsPath);

  const usable = yoy.filter((row) => row.calendar === 'usable');
  const rateStable = usable.filter((row) => inAdrSet(row));
  const summary = {
    pulledAt: new Date().toISOString(),
    downloadsPath,
    reportsPath,
    max2026Month,
    monthlyRowCount: monthly.length,
    parksWithMonthly: new Set(monthly.map((row) => row.property_id)).size,
    yoy,
    monthlyYoy,
    usableSet: {
      nOcc: usable.length,
      nRate: rateStable.length,
      occ_2025: mean(usable.map((row) => row.occ_2025).filter((n): n is number => n != null)),
      occ_2026: mean(usable.map((row) => row.occ_2026).filter((n): n is number => n != null)),
      adr_2025: mean(rateStable.map((row) => row.adr_2025).filter((n): n is number => n != null)),
      adr_2026: mean(rateStable.map((row) => row.adr_2026).filter((n): n is number => n != null)),
    },
  };
  writeFileSync('/tmp/hipcamp-top20-yoy.json', JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDigitalOceanPools();
  });
